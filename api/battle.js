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

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server not configured. Missing API key." });
  }

  try {
    const {
      f1, f2, u1, u2,
      battleType, location, power, depth,
      claims1 = [], claims2 = [],
    } = req.body || {};

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
Battle Type: ${battleType || "Standard Fight"}
Location: ${location || "Neutral Terrain"}
Power Level: ${power || "Canon Only"}
Depth: ${depth || "Quick Verdict"}
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