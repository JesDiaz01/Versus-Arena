// api/log-error.js
// Vercel Serverless Function - records a client-side crash caught by the app's
// React ErrorBoundary (src/ErrorBoundary.jsx). NO Anthropic/AI call and no judging.
//
// The GUARANTEED sink is console.error, which surfaces in the Vercel function logs /
// dashboard - that alone gives you visibility into client crashes with zero setup.
// If Supabase is configured AND a `client_errors` table exists, we ALSO insert a row
// (fully fail-open, mirroring api/disagreement.js); if not, the console log stands on
// its own. Everything the browser sends is untrusted, so it is length-capped and the
// endpoint is rate-limited to keep it from being turned into a spam/log-flood vector.

import { createClient } from "@supabase/supabase-js";
import { getClientIp, checkAbuseBlock, checkReadLimit, recordOffense } from "./_rateLimit.js";

// Defensive length caps so a runaway stack or hostile payload can never store unbounded text.
const MAX_MESSAGE_LEN = 500;
const MAX_STACK_LEN = 4000;
const MAX_URL_LEN = 500;
const MAX_UA_LEN = 400;

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

  // --- Escalating abuse block FIRST (fail open), same as the other write handlers. ---
  const ab = await checkAbuseBlock(ip);
  if (ab.blocked) {
    res.setHeader("Retry-After", String(ab.retryAfter));
    return res.status(429).json({ error: "Temporarily blocked due to repeated abuse. Try again later." });
  }

  // --- Light read-path rate limit (shared limiter, fails open), same as disagreement.js. ---
  const rl = await checkReadLimit(ip);
  if (rl.limited) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
  }

  const body = req.body || {};

  const message = clean(body.message, MAX_MESSAGE_LEN);
  const stack = clean(body.stack, MAX_STACK_LEN);
  const componentStack = clean(body.componentStack, MAX_STACK_LEN);
  const url = clean(body.url, MAX_URL_LEN);
  // Prefer the server-observed user agent; fall back to whatever the client reported.
  const userAgent = clean(req.headers["user-agent"], MAX_UA_LEN) || clean(body.userAgent, MAX_UA_LEN);

  // A crash with no message at all is almost certainly noise/a probe - drop it quietly.
  if (!message && !stack) {
    return res.status(400).json({ error: "Nothing to log." });
  }

  // GUARANTEED durable record: the Vercel function log. This is the "error tracking"
  // even with no database wired up - the entry shows in the Vercel dashboard.
  console.error("client error:", JSON.stringify({ message, url, userAgent, componentStack, stack }));

  // OPTIONAL persistence: only if Supabase is configured. Fully fail-open - a missing
  // `client_errors` table, a DB error, or missing env NEVER turns a logged crash into a
  // 500 the browser has to handle. The console.error above already captured it.
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const db = createClient(supabaseUrl, supabaseKey);
      const { error: dbError } = await db.from("client_errors").insert({
        message,
        stack: stack || null,
        component_stack: componentStack || null,
        url: url || null,
        user_agent: userAgent || null,
      });
      if (dbError) console.error("Supabase insert error (client_errors):", dbError);
    } catch (err) {
      console.error("log-error persistence error:", err);
    }
  }

  // Count one light offense so a client stuck in a crash-loop (or a bot) accrues offenses
  // and eventually trips the existing abuse block instead of flooding logs forever. Wrapped
  // so a limiter hiccup can never turn a successful log into an error. Fail-open by design.
  try { await recordOffense(ip, 1); } catch (e) { /* never break a successful log */ }

  return res.status(200).json({ ok: true });
}
