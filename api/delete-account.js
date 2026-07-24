// api/delete-account.js
// Vercel Serverless Function - permanently deletes the signed-in user's account.
//
// WHAT IS ACTUALLY LINKED TO A USER: only two things. The Supabase Auth record itself
// (email + hashed password), and rows in `saved_battles` (the private link between a user
// and a battle). Every other table -- battles, disagreements, client_errors -- carries no
// user id at all and is already anonymous, so there is nothing else to unlink.
//
// WHAT IS DELIBERATELY NOT DELETED: the battles the user ran. Those rows are shared and
// deduplicated (keyed by input_hash), so one row commonly belongs to many users who ran
// the same matchup. Deleting them on account closure would evict cache entries and break
// public share links for people who never had anything to do with this account. Once the
// saved_battles links are gone the battles retain no connection to the user, so this is
// consistent with erasing their personal data. A user who typed something sensitive INTO
// a battle should permanently delete that battle first (api/delete-battle.js), which is
// why the UI says so before this runs.
//
// SECURITY: the account acted on comes ONLY from db.auth.getUser(token). No user id is
// ever accepted from the request, so one user can never delete another's account. That
// verified token is the actual security boundary.
//
// The typed confirmation below is an INTENT check, not a security control: anything
// holding a valid token could send the phrase too. Its job is to stop an accidental or
// reflexive click from destroying an account, so it is matched leniently (trimmed,
// case-insensitive) -- punishing a typo would be friction with no safety benefit.

import { createClient } from "@supabase/supabase-js";
import { getClientIp, checkReadLimit, checkAbuseBlock } from "./_rateLimit.js";

// Short, fixed, and case-insensitive on purpose. An email address was the first choice
// (the GitHub/Vercel pattern) but that exists to disambiguate WHICH repo or org is being
// destroyed; there is exactly one account per person here, so it bought nothing and cost
// a long, autofill-prone, motor-unfriendly string.
const CONFIRM_PHRASE = "delete";

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
    return res.status(401).json({ error: "Sign in to manage your account." });
  }

  const body = req.body || {};
  const confirmText = typeof body.confirm === "string" ? body.confirm.trim().toLowerCase() : "";

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server not configured." });
  }

  try {
    const db = createClient(supabaseUrl, supabaseKey);

    // JWT signature verification happens HERE. This is the ONLY source of the identity
    // being deleted.
    const { data: userData, error: authError } = await db.auth.getUser(token);
    const user = userData && userData.user;
    if (authError || !user || !user.id) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    // Intent check (see the header note). Re-verified here rather than trusting the UI,
    // so the endpoint still refuses if it is ever called directly without the phrase.
    if (confirmText !== CONFIRM_PHRASE) {
      return res.status(400).json({ error: 'Type "delete" to confirm.' });
    }

    // --- Unlink history FIRST. ---
    // saved_battles.user_id references the auth user, so clearing these rows before the
    // account itself means a foreign key can never block the deletion halfway through.
    const { error: linksError } = await db
      .from("saved_battles")
      .delete()
      .eq("user_id", user.id);
    if (linksError) {
      console.error("delete-account links delete error:", linksError);
      return res.status(500).json({
        error: "Could not delete your account: " + (linksError.message || "unknown database error"),
      });
    }

    // --- Delete the auth record itself (email + hashed password). ---
    const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("delete-account auth delete error:", deleteError);
      return res.status(500).json({
        error: "Could not delete your account: " + (deleteError.message || "unknown error"),
      });
    }

    console.log("[delete-account] deleted account", user.id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
