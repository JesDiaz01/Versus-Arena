// api/remove-battle.js
// Vercel Serverless Function - removes ONE battle from the signed-in user's history.
//
// SCOPE: this deletes only the caller's row in `saved_battles` (the private link between
// a user and a battle). It deliberately does NOT touch the `battles` row, which is shared
// and deduplicated: the battle stays cached for everyone, its public share link keeps
// working, and no other user's history changes. So this costs nothing in tokens and can
// never evict the read-through cache. Erasing the battle CONTENT itself is a separate,
// heavier action and is not exposed here.
//
// SECURITY: the owner is identified ONLY by db.auth.getUser(token), which verifies the
// JWT signature. The service-role client bypasses RLS, so the user_id in the delete's
// WHERE clause IS the security boundary -- it comes from the verified identity and is
// never accepted from the request, so one user can never delete another user's row.

import { createClient } from "@supabase/supabase-js";
import { getClientIp, checkReadLimit } from "./_rateLimit.js";

// Same battle-id shape accepted by get-battle.js / disagreement.js: the 8-char base64url
// ids this API generates AND the 36-char uuids hand-seeded rows carry.
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Rate limit (shared, Redis-backed; fails open), same as the other account paths ---
  const rl = await checkReadLimit(getClientIp(req));
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

    // JWT signature verification happens HERE. An invalid/expired token yields no user.
    const { data: userData, error: authError } = await db.auth.getUser(token);
    const user = userData && userData.user;
    if (authError || !user || !user.id) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    // Both filters matter: battle_id picks the row, user_id (from the VERIFIED identity)
    // constrains it to this user's own link. Deleting a link that does not exist is a
    // no-op, so a repeated request is harmless and still reports success.
    const { error } = await db
      .from("saved_battles")
      .delete()
      .eq("user_id", user.id)
      .eq("battle_id", battleId);

    if (error) {
      console.error("remove-battle delete error:", error);
      return res.status(500).json({ error: "Could not remove that battle. Try again in a moment." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("remove-battle error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
