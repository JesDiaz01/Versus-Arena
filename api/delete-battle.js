// api/delete-battle.js
// Vercel Serverless Function - PERMANENTLY erases a battle: its stored inputs and
// verdict, its public share link, and its read-through cache entry. This is the heavy
// counterpart to api/remove-battle.js (which only unlinks a battle from one user's
// history and leaves the content intact). It exists so a user who typed something
// sensitive into a fighter name or custom feat can erase it themselves, without having
// to email a share link and wait.
//
// AUTHORIZATION -- the important part. Share links are PUBLIC, so a battle id is not a
// secret and must never be sufficient on its own to destroy a row. The caller must have
// the battle in their OWN history (a saved_battles link for the verified user id); that
// link is the proof they actually ran it. A delete attempt for a battle the caller has
// no link to is treated as a probe and counts an abuse offense.
//
// CURATED CONTENT IS PROTECTED: a battle carrying an authored_key is a hand-written
// verdict, so permanently deleting it would destroy site content rather than user data.
// Those are refused here (the user can still remove them from their history instead).
// Authored verdicts contain no user-entered text, so refusing costs nothing in privacy.
//
// SIDE EFFECT, BY DESIGN: battles are shared and deduplicated, so erasing the row also
// clears it from any OTHER user's history. That is inherent to the shared-cache model --
// the content has to go for the deletion to be real. The leaderboard is unaffected:
// matchup_counts is keyed by fighter names, not by battle id, so removing a battle never
// rewrites the rankings.
//
// The erase itself runs as ONE transaction via the delete_battle_cascade SQL function
// (sql/delete-battle.sql), which clears every reference to the battle before removing it.
// Doing it in separate calls was not atomic and could leave a user's history link deleted
// while the battle it pointed at survived.

import { createClient } from "@supabase/supabase-js";
import { getClientIp, checkReadLimit, checkAbuseBlock, recordOffense } from "./_rateLimit.js";

// Same battle-id shape accepted by get-battle.js / remove-battle.js.
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);

  // --- Escalating abuse block FIRST (fail open), same as the other write handlers. ---
  const ab = await checkAbuseBlock(ip);
  if (ab.blocked) {
    res.setHeader("Retry-After", String(ab.retryAfter));
    return res.status(429).json({ error: "Temporarily blocked due to repeated abuse. Try again later." });
  }

  // --- Rate limit (shared, Redis-backed; fails open) ---
  const rl = await checkReadLimit(ip);
  if (rl.limited) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
  }

  // --- Require a bearer token ---
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ error: "Sign in to manage your battles." });
  }

  const body = req.body || {};
  const battleId = typeof body.battle_id === "string" ? body.battle_id.trim() : "";
  if (!ID_RE.test(battleId)) {
    return res.status(400).json({ error: "Invalid battle ID." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server not configured." });
  }

  try {
    const db = createClient(supabaseUrl, supabaseKey);

    // JWT signature verification happens HERE.
    const { data: userData, error: authError } = await db.auth.getUser(token);
    const user = userData && userData.user;
    if (authError || !user || !user.id) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    // --- Ownership gate: the caller must have this battle in their own history. ---
    const { data: link, error: linkError } = await db
      .from("saved_battles")
      .select("battle_id")
      .eq("user_id", user.id)
      .eq("battle_id", battleId)
      .limit(1);

    if (linkError) {
      console.error("delete-battle ownership check error:", linkError);
      return res.status(500).json({ error: "Could not delete that battle. Try again in a moment." });
    }
    if (!link || link.length === 0) {
      // Knowing an id is not permission: a public share link would otherwise be enough
      // to destroy someone else's battle. Count it as a probe.
      await recordOffense(ip, 2);
      return res.status(403).json({ error: "You can only delete battles from your own history." });
    }

    // --- Refuse curated/authored verdicts (site content, not user data). ---
    const { data: rows, error: readError } = await db
      .from("battles")
      .select("id, authored_key")
      .eq("id", battleId)
      .limit(1);

    if (readError) {
      console.error("delete-battle read error:", readError);
      return res.status(500).json({ error: "Could not delete that battle. Try again in a moment." });
    }

    const battleRow = rows && rows[0];
    if (battleRow && battleRow.authored_key) {
      return res.status(400).json({
        error: "This is a featured verdict and can't be deleted. You can remove it from your history instead.",
      });
    }

    // --- Erase everything in ONE transaction (see sql/delete-battle.sql) ---
    // This was previously three separate calls that deleted the history links first and
    // the battle row last. That was not atomic: if the battle delete failed (for example
    // on a foreign key from another table still referencing it), the links were already
    // gone -- the user lost their history entry while the battle and its share link
    // survived. A plpgsql function runs in a single transaction, so the whole erase now
    // either succeeds or rolls back completely. It also clears the disagreements
    // reference, which a plain delete could not do and which can block the delete.
    const { error: rpcError } = await db.rpc("delete_battle_cascade", { p_battle_id: battleId });
    if (rpcError) {
      console.error("delete-battle rpc error:", rpcError);
      // The underlying message is surfaced deliberately: this endpoint is owner-only, and
      // a generic "try again" hid the real cause (a missing function, a foreign key
      // violation) behind an identical string every time. Trim this once it is proven out.
      return res.status(500).json({
        error: "Could not delete that battle: " + (rpcError.message || "unknown database error"),
      });
    }

    console.log("[delete-battle] permanently deleted battle", battleId, "for user", user.id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("delete-battle error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
