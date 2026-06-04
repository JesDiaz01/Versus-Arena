// api/battle.js
// Vercel Serverless Function — runs on Vercel's servers, NOT in the browser.
// Your Anthropic API key lives here as a secret environment variable (ANTHROPIC_API_KEY)
// and is never exposed to users.
//
// To switch models later, just change MODEL below:
//   Cheap/fast:   "claude-haiku-4-5-20251001"
//   Smarter:      "claude-sonnet-4-6"
//   Top-tier:     "claude-opus-4-7"

const MODEL = "claude-haiku-4-5-20251001";

// ---- Limits (cost + abuse protection) ----
const RL_PER_MIN = 5;        // max battles per minute per visitor
const RL_PER_HOUR = 30;      // max battles per hour per visitor
const MAX_NAME_LEN = 80;     // fighter name / universe cap
const MAX_CLAIM_LEN = 200;   // per custom-feat cap
const MAX_CLAIMS = 20;       // max custom feats per side
const MAX_BODY_BYTES = 20000; // reject payloads bigger than ~20KB

// Allowlists for the dropdown settings — anything else falls back to the default (first item).
const ALLOWED = {
  battleType: ["Standard Fight", "In-Character", "Out of Character", "Battle of Wits", "Speed Blitz"],
  location: ["Neutral Terrain", "Urban City", "Space", "Their Home Universe", "Random"],
  power: ["Canon Only", "Composite", "Post-Series Peak", "Current"],
  depth: ["Quick Verdict", "Detailed Analysis", "Deep Dive"],
};

// ---- Best-effort in-memory rate limiter ----
// NOTE: Vercel serverless instances are ephemeral and not shared, so this catches
// rapid-fire abuse hitting a warm instance but is not bulletproof across all instances.
// The real backstop is the prepaid spending cap on the Anthropic account.
// For bulletproof limits, upgrade to Upstash Redis later.
const hits = new Map(); // ip -> number[] (timestamps, ms)

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length) return String(xff[0]).trim();
  return req.headers["x-real-ip"] || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const minAgo = now - 60 * 1000;
  const hourAgo = now - 60 * 60 * 1000;

  let arr = hits.get(ip) || [];
  arr = arr.filter(t => t > hourAgo); // prune anything older than an hour

  const inLastMin = arr.filter(t => t > minAgo).length;
  if (inLastMin >= RL_PER_MIN) { hits.set(ip, arr); return { limited: true, scope: "minute" }; }
  if (arr.length >= RL_PER_HOUR) { hits.set(ip, arr); return { limited: true, scope: "hour" }; }

  arr.push(now);
  hits.set(ip, arr);

  // Light memory cleanup so the Map can't grow forever on a long-lived instance.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      const fresh = v.filter(t => t > hourAgo);
      if (fresh.length === 0) hits.delete(k);
      else hits.set(k, fresh);
    }
  }
  return { limited: false };
}

// ---- Input sanitizing ----
function cleanStr(v, maxLen) {
  if (typeof v !== "string") {
    if (v == null) return "";
    v = String(v);
  }
  // strip control chars, collapse, trim, cap length
  return v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLen);
}

function cleanClaims(v) {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, MAX_CLAIMS)
    .map(c => cleanStr(c, MAX_CLAIM_LEN))
    .filter(c => c.length > 0);
}

function pickAllowed(v, list) {
  return list.includes(v) ? v : list[0];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server not configured. Missing API key." });
  }

  // --- Rate limit ---
  const ip = getClientIp(req);
  const rl = rateLimited(ip);
  if (rl.limited) {
    res.setHeader("Retry-After", rl.scope === "minute" ? "60" : "3600");
    return res.status(429).json({
      error: rl.scope === "minute"
        ? "You're running battles too fast. Wait a few seconds and try again."
        : "You've hit the hourly battle limit. Take a break and come back soon.",
    });
  }

  try {
    // --- Reject oversized payloads ---
    const raw = JSON.stringify(req.body || {});
    if (raw.length > MAX_BODY_BYTES) {
      return res.status(413).json({ error: "Request too large." });
    }

    const body = req.body || {};

    // --- Sanitize every field ---
    const f1 = cleanStr(body.f1, MAX_NAME_LEN);
    const f2 = cleanStr(body.f2, MAX_NAME_LEN);
    const u1 = cleanStr(body.u1, MAX_NAME_LEN);
    const u2 = cleanStr(body.u2, MAX_NAME_LEN);
    const battleType = pickAllowed(body.battleType, ALLOWED.battleType);
    const location = pickAllowed(body.location, ALLOWED.location);
    const power = pickAllowed(body.power, ALLOWED.power);
    const depth = pickAllowed(body.depth, ALLOWED.depth);
    const claims1 = cleanClaims(body.claims1);
    const claims2 = cleanClaims(body.claims2);

    if (!f1 || !f2) {
      return res.status(400).json({ error: "Both fighter names are required." });
    }

    const claimsBlock1 = claims1.length
      ? `\nGRANTED ABILITIES for ${f1} (these are TRUE for this battle — treat them as established fact, even if they contradict canon):\n${claims1.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "";
    const claimsBlock2 = claims2.length
      ? `\nGRANTED ABILITIES for ${f2} (these are TRUE for this battle — treat them as established fact, even if they contradict canon):\n${claims2.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const hasClaims = claims1.length > 0 || claims2.length > 0;

    const prompt = `You are an impartial fictional-character battle analyst for a site called Versus Arena. Your defining trait is that you have NO favoritism: you do not let a character's popularity, fanbase size, or cultural status influence the outcome. You weigh feats, powerscaling, and lore, treating both fighters by the exact same standard.

Analyze this 1v1 fight:

Fighter 1: ${f1} (${u1 || "unknown universe"})
Fighter 2: ${f2} (${u2 || "unknown universe"})
Battle Type: ${battleType}
Location: ${location}
Power Level: ${power}
Depth: ${depth}
${claimsBlock1}
${claimsBlock2}

How to weigh abilities:
- Start from each fighter's canonical, demonstrated feats as the baseline.
- ${hasClaims
  ? `CRITICAL: Any "GRANTED ABILITIES" listed above are TRUE for this battle. Treat them as hard fact, exactly as written, even if they contradict the character's real canon. If a fighter is granted FTL speed, they genuinely move at FTL here. If granted universal durability, they genuinely have it. Do NOT dismiss, downgrade, or question granted abilities for lacking canon support — the user has explicitly set these as the rules of this matchup. Layer the granted abilities ON TOP of the character's canon feats, then judge the fight with everything combined.`
  : `Judge purely on canonical, demonstrated feats.`}
- Do NOT favor the more popular or famous character. Judge purely on capability.
- Apply the Battle Type, Location, and Power Level settings as constraints on the fight.
- Only return "Draw" if the fighters are genuinely, evenly matched once all abilities (canon + granted) are accounted for. Granted abilities often make a fight decisive — reflect that honestly rather than defaulting to a draw.

Respond ONLY with a valid JSON object (no markdown, no backticks, no text before or after) with these exact fields:
{
  "winner": "exact name of the winner (${f1} or ${f2}) or Draw",
  "verdict_short": "one confident sentence summarizing the outcome",
  "analysis": "3-5 sentences citing specific feats and reasoning. When granted abilities decided the outcome, say so explicitly.",
  "advantages": ["up to 3 short labels for the winner, like Speed Advantage or Higher Durability"],
  "user_claims_used": ["short summary of each granted ability that influenced the verdict, empty array if none"],
  "feats_scanned": a number between 20 and 80,
  "sources": a number between 5 and 20
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "The analyst is unavailable right now. Try again in a moment." });
    }

    const data = await response.json();
    const text = (data.content || []).map(i => i.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();

    let verdict;
    try {
      verdict = JSON.parse(clean);
    } catch (e) {
      console.error("Failed to parse model output:", clean);
      return res.status(502).json({ error: "Got an unexpected response. Please try again." });
    }

    return res.status(200).json(verdict);
  } catch (err) {
    console.error("Battle handler error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}