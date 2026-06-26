// api/disagreement.js
// Vercel Serverless Function - records a user's "I disagree with this verdict" feedback
// to Supabase for later analysis. NO Anthropic/AI call and no judging logic.
//
// Mirrors api/get-battle.js for the transport (service-role client, server-side only,
// shared rate-limit guards) and the fail-open insert style of api/battle.js. The only
// free text the user controls is `note`, screened with the STRICT input content filter
// (containsBlockedContent, same as battle.js). The structured fields originate from our
// own generated verdict, so they are NOT run through the collapsing filter.

import { createClient } from "@supabase/supabase-js";
import { getClientIp, checkAbuseBlock, checkReadLimit, recordOffense } from "./_rateLimit.js";
import { containsBlockedContent } from "./_contentFilter.js";

// Defensive length caps so we never store unbounded text.
const MAX_NAME_LEN = 80;    // fighter name / winner
const MAX_CHOICE_LEN = 200; // the chosen "disagreed_with" label
const MAX_NOTE_LEN = 500;   // optional free-text note

// Trim, coerce to string, and cap length. Returns "" for non-strings.
function clean(v, maxLen) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);

  // --- Escalating abuse block FIRST (fail open), same as the battle/image handlers. ---
  const ab = await checkAbuseBlock(ip);
  if (ab.blocked) {
    res.setHeader("Retry-After", String(ab.retryAfter));
    return res.status(429).json({ error: "Temporarily blocked due to repeated abuse. Try again later." });
  }

  // --- Light read-path rate limit (shared limiter, fails open), same as get-battle.js. ---
  const rl = await checkReadLimit(ip);
  if (rl.limited) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
  }

  const body = req.body || {};

  // battle_id may be null/absent (a verdict that failed to save has no share id). Keep it
  // only when it looks like one of our base64url share ids (same length bound as get-battle).
  const rawBattleId = typeof body.battle_id === "string" ? body.battle_id.trim() : "";
  const battle_id = rawBattleId.length > 0 && rawBattleId.length <= 20 ? rawBattleId : null;

  const char_a = clean(body.char_a, MAX_NAME_LEN);
  const char_b = clean(body.char_b, MAX_NAME_LEN);
  const winner = clean(body.winner, MAX_NAME_LEN);
  const disagreed_with = clean(body.disagreed_with, MAX_CHOICE_LEN);
  const note = clean(body.note, MAX_NOTE_LEN);

  // Required structured fields.
  if (!char_a || !char_b || !winner || !disagreed_with) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Screen ONLY the free-text note with the strict input filter (same as battle.js).
  // Structured fields come from our own verdict, so they are not collapse-screened.
  if (note && containsBlockedContent([note])) {
    await recordOffense(ip, 1); // one trip is a fat-finger; repeated trips escalate
    return res.status(400).json({ error: "Please remove inappropriate content and try again." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server not configured." });
  }

  // Insert one row, fail-open like battle.js: a DB error is logged, never thrown.
  try {
    const db = createClient(supabaseUrl, supabaseKey);
    const { error: dbError } = await db.from("disagreements").insert({
      battle_id,
      char_a,
      char_b,
      winner,
      disagreed_with,
      note: note || null,
    });
    if (dbError) {
      console.error("Supabase insert error (disagreement):", dbError);
      return res.status(500).json({ error: "Couldn't save that. Try again in a moment." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("disagreement handler error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
