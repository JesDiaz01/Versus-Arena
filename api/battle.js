// api/battle.js
// Vercel Serverless Function - runs on Vercel's servers, NOT in the browser.
// Your Anthropic API key lives here as a secret environment variable (ANTHROPIC_API_KEY)
// and is never exposed to users.
//
// To switch models later, just change MODEL below:
//   Cheap/fast:   "claude-haiku-4-5-20251001"
//   Smarter:      "claude-sonnet-4-6"
//   Top-tier:     "claude-opus-4-7"

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { Redis } from "@upstash/redis";
import { getClientIp, checkBattleLimit, checkAbuseBlock, recordOffense } from "./_rateLimit.js";
import { containsBlockedContent, containsBlockedOutput } from "./_contentFilter.js";

const MODEL = "claude-sonnet-4-6";

// ---- Limits (cost + abuse protection) ----
const MAX_NAME_LEN = 80;     // fighter name / universe cap
const MAX_CLAIM_LEN = 200;   // per custom-feat cap
const MAX_CLAIMS = 20;       // max custom feats per side
const MAX_BODY_BYTES = 20000; // reject payloads bigger than ~20KB
const DRAW_MARGIN = 10;       // averaged dominance-score gap below which the fight is a draw
const DRAW_EVEN_EPSILON = 3;  // text-only: averaged gap at/under this reads as "dead even"; above it the draw EXPLANATION notes a slight, non-decisive lean. Does NOT change the draw decision.

// Soft global ceiling on battles started per UTC day, to keep total Anthropic
// cost from running away during a traffic spike even though per-IP limits exist.
// Tune via the DAILY_BATTLE_CAP env var in Vercel; the constant below is only a
// fallback. PLACEHOLDER value - size this to your budget. The real hard backstop
// is the spend limit set in the Anthropic Console.
const DAILY_BATTLE_CAP = parseInt(process.env.DAILY_BATTLE_CAP, 10) || 500;
const CAP_REDIS_TIMEOUT_MS = 600; // do not let a cold/slow Redis add latency to battles
const CAP_KEY_TTL_SECONDS = 172800; // 48h: cleanup only, correctness comes from the dated key

// Allowlists for the dropdown settings - anything else falls back to the default (first item).
const ALLOWED = {
  battleType: ["Standard Fight", "In-Character", "Out of Character", "Battle of Wits", "Speed Blitz"],
  location: ["Neutral Terrain", "Urban City", "Space", "Their Home Universe", "Random"],
  power: ["Canon Only", "Composite", "Post-Series Peak", "Current"],
  depth: ["Quick Verdict", "Detailed Analysis", "Deep Dive"],
};

// Neutral fallbacks used when the model's free-text OUTPUT trips the content
// filter (M2). The battle is never discarded; the offending text is replaced
// with these while the structured fields (winner, scores, counts) stay intact.
const NEUTRAL_ANALYSIS = "A detailed breakdown could not be generated for this matchup. Try adjusting the fighters or feats and running it again.";
const NEUTRAL_VERDICT_SHORT = "This matchup could not be summarized. Please run it again.";

// ---- Global daily cap (its own Redis client; the cap LOGIC lives here, not in
// _rateLimit.js, so it can never affect the shared-link read path) ----
let capRedis = null;
function getCapRedis() {
  // Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from the environment.
  if (!capRedis) capRedis = Redis.fromEnv();
  return capRedis;
}

// Counter key is stamped with the UTC date, so each day starts fresh on its own
// even if the TTL never fires. The TTL is purely housekeeping for old keys.
function todayKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `global:battle:${yyyy}-${mm}-${dd}`;
}

// ---- Input sanitizing ----
function cleanStr(v, maxLen) {
  if (typeof v !== "string") {
    if (v == null) return "";
    v = String(v);
  }
  let out = "";
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    out += (c >= 32 && c !== 127) ? v[i] : " ";
  }
  return out.trim().slice(0, maxLen);
}

// Replace fancy dashes the model sometimes emits (they read as AI-written).
// En dash between digits -> hyphen (preserve ranges like 5-10); every other
// em/en dash (usually a spaced clause dash) -> comma+space, collapsing
// surrounding whitespace so "X - Y" becomes "X, Y" not "X , Y".
// Dashes are built via String.fromCharCode so this source stays pure ASCII.
function stripFancyDashes(s) {
  if (typeof s !== "string") return s;
  var EN = String.fromCharCode(0x2013);
  var EM = String.fromCharCode(0x2014);
  var range = new RegExp("(\\d)\\s*[" + EN + EM + "]\\s*(\\d)", "g");
  var clause = new RegExp("\\s*[" + EN + EM + "]\\s*", "g");
  return s.replace(range, "$1-$2").replace(clause, ", ");
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

// ---- Prompt builder ----
// fa/ua = fighter listed first in this call; fb/ub = fighter listed second.
// claimsBlockA/B = pre-built "GRANTED ABILITIES" strings, already name-tagged,
// passed in the same swapped order as the fighters so grants stay attached to the
// right character regardless of which slot they occupy.
function buildPrompt(fa, ua, claimsBlockA, fb, ub, claimsBlockB, hasClaims, battleType, location, power, depth) {
  return `You are an impartial fictional-character battle analyst for a site called Versus Arena. Your defining trait is that you have NO favoritism: you do not let a character's popularity, fanbase size, or cultural status influence the outcome. You weigh feats, powerscaling, and lore, treating both fighters by the exact same standard.

Analyze this 1v1 fight:

Fighter 1: ${fa} (${ua || "unknown universe"})
Fighter 2: ${fb} (${ub || "unknown universe"})
Battle Type: ${battleType}
Location: ${location}
Power Level: ${power}
Depth: ${depth}
${claimsBlockA}
${claimsBlockB}

How to weigh abilities:
- Use each character at their PEAK within the selected Power Level. Apply the character's strongest CONSISTENT canonical showing - never a weakened, early-series, or de-powered version. Apply the same evidentiary standard to both fighters; do not hold one to a stricter or looser bar than the other.
- Power Level definitions (these form a strict tier ladder - never assign a higher power tier under a lesser setting):
    Canon Only: strongest showing supported by the primary source work itself.
    Composite: strongest showing across all canonical AND supplementary material (databooks, films, spin-offs, author statements). Must be greater than or equal to Canon Only; if no additional material exists beyond the primary work, state that rather than producing an identical verdict.
    Post-Series Peak: the absolute maximum power the character has ever canonically reached (end-of-story / final form). This is the highest tier and must be greater than or equal to every other setting.
    Current: the character as of the latest canonical point. Must be less than or equal to Post-Series Peak.
- Battle Type governs WILLINGNESS, not power. Peak power is the baseline in every battle type:
    In-Character: the character fights as they characteristically would, including any arrogance, mercy, reluctance, or tendency to hold back or not immediately use their strongest option. Power is still full; only behavior reflects personality.
    Out of Character: the character fights fully optimized - complete tactical awareness, no hesitation, best options used immediately.
    Standard Fight: the character fights seriously and competently to win, without heavy personality-based holding back.
    Battle of Wits / Speed Blitz: keep their existing specialized behavior; peak power still applies.
- Start from each fighter's canonical, demonstrated feats as the baseline.
- ${hasClaims
  ? `CRITICAL: Any "GRANTED ABILITIES" listed above are TRUE for this battle. Treat them as hard fact, exactly as written, even if they contradict the character's real canon. If a fighter is granted FTL speed, they genuinely move at FTL here. If granted universal durability, they genuinely have it. Do NOT dismiss, downgrade, or question granted abilities for lacking canon support - the user has explicitly set these as the rules of this matchup. Layer the granted abilities ON TOP of the character's canon feats, then judge the fight with everything combined.`
  : `Judge purely on canonical, demonstrated feats.`}${hasClaims
  ? `
- BOUNDED CONSEQUENCES of granted abilities: A granted ability remains TRUE and must be applied exactly as written (the hard-truth rule above is unchanged), but its effect is bounded STRICTLY to what the ability literally states. Do NOT extend, inflate, or add any power, durability, speed, feats, allies, or resources that were not explicitly granted. For example, "his attack bypasses Infinity" means only that this character's attacks are not stopped by Infinity; it does NOT grant extra offense, durability, allies, or any other advantage. Negating or bypassing ONE of an opponent's defenses is NOT the same as winning: you must still judge whether the character can actually defeat the opponent given everything ELSE the opponent retains (other techniques, durability, speed, offense, intelligence). For instance, if a character can now land a hit on Gojo but has no demonstrated way to actually harm or kill him, and Gojo keeps his other offensive and defensive capabilities, bypassing Infinity alone does not secure a win. Weigh each granted ability for what it realistically ACHIEVES in this specific fight rather than assuming it is decisive simply because it is true, and reflect a true-but-tactically-limited grant accordingly in both the dominance scores and the verdict. This applies with equal force to abilities that DEBUFF, weaken, disable, or neutralize the opponent (for example numbing the senses, removing a defense, or reducing a stat): the debuff is applied as true, but a debuff is NOT a win condition by itself. To WIN, a character must possess an actual means to defeat the opponent, meaning offensive output capable of harming, killing, or incapacitating them given the opponent's durability and remaining capabilities. If the granting character has no demonstrated offense able to meaningfully damage the opponent, landing a debuff does NOT produce a win. In that situation reflect the realistic result: the physically superior fighter, even hampered, typically still WINS, because they retain the durability, power, and physicality the weaker character has no way to overcome. A character with zero relevant offense does not defeat a vastly superior opponent merely by inconveniencing them. Only return a draw if the debuffed-but-superior fighter genuinely cannot secure a win either (a true stalemate), not merely because they are hampered; do NOT default to a draw or to a debuffer win simply because a debuff landed, and always weigh whether the granting character can actually close out the fight.`
  : ``}
- FEAT WEIGHTING PARITY: A user-listed feat that is ALREADY part of a character's established canon must be acknowledged and used, but given NO extra weight, salience, or importance simply because the user typed it. A canonical feat counts exactly the same whether the user listed it or you recalled it yourself, so restating something the character already has does NOT make it more decisive and should NOT change the outcome: if a listed feat is something the character canonically already possesses, judge the fight essentially as if it had not been listed. This does NOT weaken the hard-truth granted-abilities rule: feats that are genuinely NEW, non-canon, or original-character grants (abilities the character does not normally have) are still treated as hard truth and layered on top exactly as written above; the distinction is that new or beyond-canon grants are added as true, while already-canon feats the user merely restates get no salience bonus. Evaluate BOTH fighters on their COMPLETE established canon equally, regardless of how many feats the user typed for each: the NUMBER of listed feats is NOT a measure of a fighter's strength or how well-defined they are. Do not treat a fighter with many listed feats as stronger or better-defined than one with few or none; give each fighter their full canonical kit either way, and a fighter with zero listed feats still gets full credit for everything they canonically have. Consistent with the VOICE OF THE OUTPUT rule, do not explain any of this weighting logic to the user; simply produce a fair verdict.
- Ground every verdict in specific, named in-universe feats - actual canonical events (what each character survived, destroyed, reacted to, lifted). Do NOT use vague power claims or external tier ratings. Describe any given feat the same way regardless of the opponent; do not inflate or deflate an established feat to fit the desired winner. The analysis must explicitly state which version and power tier of each character it is using (for example: "Cloud Strife at end-of-FFVII peak with full materia and Limit Breaks").
- FACTUAL ACCURACY / NO FABRICATION: Ground every canonical claim in feats and abilities you are genuinely confident are real and established for that character. Do NOT invent abilities, techniques, forms, items, or feats; do NOT combine two separate abilities or techniques into a single capability that does not exist in canon; and do NOT misattribute one character's technique to another character. If you are not confident whether a specific technique, feat, or mechanic is actually canon for a character, do NOT assert it as fact: instead rely on that character's core, widely established, uncontroversial showings, since it is better to judge the fight on solid established feats than to reach for an exotic or obscure mechanic you may be misremembering. Do NOT fabricate specific quantitative claims (exact multipliers, precise speeds, exact tonnage, specific chapter or episode references) unless they are genuinely established; vague-but-correct is better than precise-but-invented, so describe an effect qualitatively rather than inventing a figure you are unsure of (for example, do not claim a technique multiplies power by an exact number if you do not know the real value). Apply this equally and symmetrically to both fighters: never grant one fighter an invented or shaky capability to justify an outcome, and if a decisive-looking mechanic is uncertain, do not lean the verdict on it. If the most decisive-seeming factor depends on an uncertain or obscure mechanic, weight the verdict toward what is solidly established about both fighters rather than manufacturing certainty. This does NOT weaken the granted-abilities rule: any user-GRANTED abilities remain hard truth exactly as written, and this principle governs only your OWN canonical claims about the characters; you may and should still use canonical feats you are confident about. Consistent with the VOICE OF THE OUTPUT rule, never surface this caution to the user or hedge in a meta way: simply leave out any fabricated claim and write clean, confident analysis grounded in real, established feats.
- When a feat has contested or disputed canonical scaling, commit to a single interpretation and apply it consistently to both fighters. If you accept that type of evidence as valid for one fighter, apply the same standard to the other. Never treat a contested feat as credible for one fighter but dismiss or downplay it for another. Describe and scale any feat identically no matter who has it or who is affected by it.
- Do NOT favor the more popular or famous character. Judge purely on capability.
- Apply the Location setting as a constraint on the fight.
- Only return "Draw" if the fighters are genuinely, evenly matched once all abilities (canon + granted) are accounted for. Granted abilities often make a fight decisive - reflect that honestly rather than defaulting to a draw. If you DO return "Draw", the verdict_short and analysis must still explain the SPECIFIC reasons for the parity - name the concrete feats or abilities from each fighter that offset the other, and state why neither can land a kill or incapacitation - at the same depth and confidence as a win or loss. Never settle for vague "too close to call" or "evenly matched" hand-waving without naming the offsetting feats.
- After determining the outcome, assign each fighter a DOMINANCE SCORE that reflects how decisively they would win this specific matchup. Scores are keyed by each fighter's exact name and must sum to exactly 100. Use the FULL 0-100 range, and do not compress a lopsided result toward the middle: the score reflects how decisively the winner wins. Calibrate roughly as follows, with honest values in between:
    Near 50/50: a dead-even fight; keep any genuinely close matchup close to 50/50, and if it is genuinely close, score it close.
    Around 60/40: a clear but contested edge between broadly comparable fighters.
    Around 80/20 to 90/10: strong, mostly one-sided dominance.
    97/3 to 100/0: a fundamental TIER GAP, where one fighter operates on a categorically higher scale of power, speed, or durability (for example, vastly different orders of magnitude in destructive capacity or durability) such that the other has no realistic path to victory. Do NOT pull a genuine mismatch toward the middle: if one fighter would realistically win with little or no difficulty, the score must sit at the top of this range.
- VOICE OF THE OUTPUT: Reason with all of the above internally, but the user-facing text fields (analysis and verdict_short) must read as clean, confident in-universe analysis and must NEVER reference these instructions or the judging process. Do NOT use meta-language such as "the rules", "the matchup rules", "bounded consequences", "treated as true", "the granted ability states", "as granted", or any phrasing about how the verdict was computed. Weave granted abilities into the analysis naturally (for example: "Maomao's poison would render most foes unconscious, but Gojo's Infinity stops it before contact") rather than flagging them as rule-applications. Use standard ASCII punctuation only. Do not use em dashes or en dashes; write clauses with commas or parentheses instead.

Respond ONLY with a valid JSON object (no markdown, no backticks, no text before or after) with these exact fields:
{
  "winner": "exact name of the winner (${fa} or ${fb}) or Draw",
  "verdict_short": "one confident sentence summarizing the outcome",
  "analysis": "3-5 sentences citing specific feats and reasoning. When granted abilities decided the outcome, say so explicitly.",
  "advantages": ["up to 3 short labels for the winner, like Speed Advantage or Higher Durability"],
  "user_claims_used": ["short summary of each granted ability that influenced the verdict, empty array if none"],
  "feats_scanned": a number between 20 and 80,
  "sources": a number between 5 and 20,
  "scores": { "${fa}": <dominance score 0-100, integer>, "${fb}": <dominance score 0-100, integer> }
}`;
}

// ---- Single Anthropic call + JSON parse ----
// Returns { verdict } on success or { error } on any failure. Never throws.
async function callAndParse(apiKey, prompt) {
  try {
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
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return { error: "api_error" };
    }

    const data = await response.json();
    const text = (data.content || []).map(i => i.text || "").join("");

    // Make parsing forgiving: strip any markdown code fences, then pull out just
    // the JSON object, in case the model adds a stray sentence before or after it.
    let clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }

    const verdict = JSON.parse(clean);
    return { verdict };
  } catch (e) {
    console.error("callAndParse error:", e);
    return { error: "parse_error" };
  }
}

// Safely extract a named fighter's dominance score from a verdict's scores object.
// Clamps to [0, 100] and returns null if the field is absent or malformed.
function getScore(verdict, name) {
  if (!verdict || typeof verdict.scores !== "object" || verdict.scores === null) return null;
  const s = verdict.scores[name];
  return (typeof s === "number" && isFinite(s)) ? Math.max(0, Math.min(100, s)) : null;
}

// Build a REAL, feat-grounded draw explanation from the analyses the two model calls
// already produced - no extra API call. Each fighter's strongest case (its full
// feat-citing analysis, falling back to its one-line summary) is framed as
// complementary: what keeps each in the fight, with a lead and close that present the
// strengths as offsetting rather than two contradictory verdicts. leader === null
// means dead even; otherwise we name a slight, non-decisive lean honestly (since
// DRAW_MARGIN tolerates up to roughly a 55/45 split). f1Call/f2Call may be null.
function buildDrawText(f1, f2, f1Call, f2Call, leader, trailer) {
  const f1Raw = f1Call ? (f1Call.analysis || f1Call.verdict_short || "") : "";
  const f2Raw = f2Call ? (f2Call.analysis || f2Call.verdict_short || "") : "";
  const f1Case = f1Raw.trim() || `${f1} brings a credible, feat-backed case.`;
  const f2Case = f2Raw.trim() || `${f2} brings an equally credible, feat-backed case.`;

  const lead = leader
    ? `${leader} holds a slight edge over ${trailer}, but not enough to force a finish - the matchup is essentially even.`
    : `${f1} and ${f2} are too evenly matched for either to force a clean win.`;
  const close = leader
    ? `Each fighter's strongest path is answered by the other, so ${leader}'s edge never converts into a decisive, fight-ending advantage.`
    : `Each fighter's strongest path is answered by the other, and neither can land the decisive, fight-ending blow.`;

  const verdict_short = leader
    ? `${leader} edges ahead but cannot put ${trailer} away - it comes down to an even draw.`
    : `${f1} and ${f2} are evenly matched - neither can secure a decisive win.`;
  const analysis = `${lead} What keeps ${f1} in it: ${f1Case} What keeps ${f2} in it: ${f2Case} ${close}`
    .replace(/\s+/g, " ").trim();
  return { verdict_short, analysis };
}

export default async function handler(req, res) {
  const ip = getClientIp(req);

  if (req.method !== "POST") {
    await recordOffense(ip, 2); // wrong method on a POST-only endpoint = a probe
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server not configured. Missing API key." });
  }

  // --- Escalating abuse block (FIRST: before the rate limit, the daily cap, and any
  // Anthropic call, so a blocked IP costs nothing). Fails open. ---
  const ab = await checkAbuseBlock(ip);
  if (ab.blocked) {
    res.setHeader("Retry-After", String(ab.retryAfter));
    return res.status(429).json({ error: "Temporarily blocked due to repeated abuse. Try again later." });
  }

  // --- Rate limit ---
  const rl = await checkBattleLimit(ip);
  if (rl.limited) {
    // Only the HOURLY-scope limit counts as an offense: a minute-limit hit is an eager
    // user; ignoring the hourly limit is deliberate spam.
    if (rl.scope === "hour") await recordOffense(ip, 1);
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
      await recordOffense(ip, 2); // a >20KB body cannot come from the real UI = a probe
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

    // --- Block inappropriate content (profanity, slurs, sexual content) ---
    // Only user free-text fields; dropdowns are already allowlisted. Runs before
    // any Anthropic call so a blocked battle costs nothing.
    if (containsBlockedContent([f1, f2, u1, u2, ...claims1, ...claims2])) {
      await recordOffense(ip, 1); // one trip is a fat-finger; repeated trips escalate
      return res.status(400).json({ error: "Please remove inappropriate content and try again." });
    }

    // --- Global daily cap (LAST gate before the Anthropic call) ---
    // Only requests that pass every earlier gate get counted, so content-blocked
    // (400) and rate-limited (429) requests never burn cap budget. Fails OPEN on
    // any Redis error or timeout: the Anthropic Console spend limit is the hard
    // backstop, so an infra hiccup must never block real users.
    try {
      const key = todayKey();
      const incrPromise = getCapRedis().incr(key);
      // Swallow a late rejection if the race below already timed out, so an
      // orphaned promise can never surface as an unhandledRejection.
      incrPromise.catch(function() {});
      const timeoutPromise = new Promise(function(resolve) {
        setTimeout(function() { resolve(null); }, CAP_REDIS_TIMEOUT_MS);
      });

      const count = await Promise.race([incrPromise, timeoutPromise]);
      // count === null means Redis timed out: fail open and proceed.
      if (count !== null) {
        if (count === 1) {
          // First battle of the day: set a cleanup TTL, fire-and-forget.
          getCapRedis().expire(key, CAP_KEY_TTL_SECONDS).catch(function() {});
        }
        if (count > DAILY_BATTLE_CAP) {
          return res.status(503).json({
            error: "capacity",
            message: "The arena's hit its limit for today. The free Can It Beat Goku mode is still open.",
          });
        }
      }
    } catch (err) {
      console.error("global cap check failed, failing open:", err);
    }

    const claimsBlock1 = claims1.length
      ? `\nGRANTED ABILITIES for ${f1} (these are TRUE for this battle - treat them as established fact, even if they contradict canon):\n${claims1.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "";
    const claimsBlock2 = claims2.length
      ? `\nGRANTED ABILITIES for ${f2} (these are TRUE for this battle - treat them as established fact, even if they contradict canon):\n${claims2.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const hasClaims = claims1.length > 0 || claims2.length > 0;

    // --- Build prompts for both orderings ---
    // Call A: f1 listed first (original order).
    // Call B: f2 listed first (swapped). Claims blocks follow their fighter so
    // each character's grants are always attributed to the right character.
    // Running both and reconciling eliminates position bias: a fighter who wins
    // only because they were listed first will not win the other call.
    const promptA = buildPrompt(f1, u1, claimsBlock1, f2, u2, claimsBlock2, hasClaims, battleType, location, power, depth);
    const promptB = buildPrompt(f2, u2, claimsBlock2, f1, u1, claimsBlock1, hasClaims, battleType, location, power, depth);

    // --- Fire both calls concurrently ---
    const [resultA, resultB] = await Promise.allSettled([
      callAndParse(apiKey, promptA),
      callAndParse(apiKey, promptB),
    ]);

    const verdictA = resultA.status === "fulfilled" && !resultA.value.error ? resultA.value.verdict : null;
    const verdictB = resultB.status === "fulfilled" && !resultB.value.error ? resultB.value.verdict : null;

    let verdict;

    if (verdictA && verdictB) {
      // Both calls succeeded - reconcile by averaging dominance scores.
      // Call A had f1 in slot 1; Call B had f2 in slot 1. Each fighter occupies
      // slot 1 in one call and slot 2 in the other, so averaging their scores
      // across both calls cancels symmetric position bias.
      const scoreA_f1 = getScore(verdictA, f1);
      const scoreA_f2 = getScore(verdictA, f2);
      const scoreB_f1 = getScore(verdictB, f1);
      const scoreB_f2 = getScore(verdictB, f2);
      const hasScores = scoreA_f1 !== null && scoreA_f2 !== null && scoreB_f1 !== null && scoreB_f2 !== null;

      if (hasScores) {
        const avgF1 = (scoreA_f1 + scoreB_f1) / 2;
        const avgF2 = (scoreA_f2 + scoreB_f2) / 2;

        if (Math.abs(avgF1 - avgF2) > DRAW_MARGIN) {
          // Clear winner by averaged scores.
          const winnerName = avgF1 > avgF2 ? f1 : f2;
          // Use the verdict from the call where the winner was slot 1 - that
          // call argued FOR the winner, so its reasoning reads most naturally.
          const base = winnerName === f1 ? verdictA : verdictB;
          verdict = { ...base, winner: winnerName };
        } else {
          // Averaged scores within the draw margin - a genuine standoff. If either
          // call independently returned a model-authored "Draw" (the prompt now
          // requires it to give specific parity reasons), preserve that explanation
          // as-is. Otherwise synthesize a real one from the two feat-citing analyses
          // we already paid for, attributing each fighter's case to the call that
          // rated them higher so "what keeps X in it" reads as pro-X reasoning.
          const modelDraw =
            (verdictA.winner === "Draw" && verdictA.analysis) ? verdictA :
            (verdictB.winner === "Draw" && verdictB.analysis) ? verdictB : null;

          const aFavorsF1 = (scoreA_f1 - scoreA_f2) >= (scoreB_f1 - scoreB_f2);
          const f1Call = aFavorsF1 ? verdictA : verdictB;
          const f2Call = aFavorsF1 ? verdictB : verdictA;
          const gap = Math.abs(avgF1 - avgF2);
          const leader = gap <= DRAW_EVEN_EPSILON ? null : (avgF1 > avgF2 ? f1 : f2);
          const trailer = leader === f1 ? f2 : f1;

          const synth = modelDraw
            ? { verdict_short: modelDraw.verdict_short, analysis: modelDraw.analysis }
            : buildDrawText(f1, f2, f1Call, f2Call, leader, trailer);

          verdict = {
            winner: "Draw",
            verdict_short: synth.verdict_short,
            analysis: synth.analysis,
            advantages: [],
            user_claims_used: (modelDraw && modelDraw.user_claims_used) || verdictA.user_claims_used || [],
            feats_scanned: Math.round(((verdictA.feats_scanned || 0) + (verdictB.feats_scanned || 0)) / 2),
            sources: Math.round(((verdictA.sources || 0) + (verdictB.sources || 0)) / 2),
          };
        }
      } else {
        // Scores missing or malformed - fall back to comparing binary winners.
        if (verdictA.winner === verdictB.winner) {
          verdict = (verdictA.winner === f1 || verdictA.winner === "Draw") ? verdictA : verdictB;
        } else {
          const callForF1 = verdictA.winner === f1 ? verdictA : (verdictB.winner === f1 ? verdictB : null);
          const callForF2 = verdictA.winner === f2 ? verdictA : (verdictB.winner === f2 ? verdictB : null);
          // The two calls split on the winner, so it is genuinely contested with no
          // reliable lean - present it as even and build the explanation from each
          // call's real feat analysis rather than meta-text about the disagreement.
          const synth = buildDrawText(f1, f2, callForF1, callForF2, null, null);
          verdict = {
            winner: "Draw",
            verdict_short: synth.verdict_short,
            analysis: synth.analysis,
            advantages: [],
            user_claims_used: verdictA.user_claims_used || [],
            feats_scanned: Math.round(((verdictA.feats_scanned || 0) + (verdictB.feats_scanned || 0)) / 2),
            sources: Math.round(((verdictA.sources || 0) + (verdictB.sources || 0)) / 2),
          };
        }
      }
    } else if (verdictA) {
      // Call B failed; fall back to call A's result as-is.
      console.error("Swap call failed, using original-order result as fallback.");
      verdict = verdictA;
    } else if (verdictB) {
      // Call A failed; fall back to call B's result as-is.
      console.error("Original call failed, using swap-order result as fallback.");
      verdict = verdictB;
    } else {
      // Both calls failed.
      return res.status(502).json({ error: "The analyst is unavailable right now. Try again in a moment." });
    }

    // --- Screen the model's free-text OUTPUT before saving/returning (M2) ---
    // Both Anthropic calls have already fired, so a hit never discards the battle:
    // we neutralize the offending free-text field(s) and keep the structured
    // fields (winner, scores, counts) intact, then still save + return a valid
    // verdict. Uses the OUTPUT-mode filter (containsBlockedOutput: boundary-respecting
    // matcher only, NO space-collapsing pass) -- the model writes normal prose, so the
    // anti-evasion collapse used on user input would false-positive on legit words like
    // "analysis". The offending text is never sent to the client or persisted. Saving
    // the neutralized verdict keeps the ?b= share link resolving to clean text.
    {
      let outputBlocked = false;
      if (typeof verdict.verdict_short === "string" && containsBlockedOutput([verdict.verdict_short])) {
        verdict.verdict_short = NEUTRAL_VERDICT_SHORT;
        outputBlocked = true;
      }
      if (typeof verdict.analysis === "string" && containsBlockedOutput([verdict.analysis])) {
        verdict.analysis = NEUTRAL_ANALYSIS;
        outputBlocked = true;
      }
      if (Array.isArray(verdict.advantages)) {
        const cleaned = verdict.advantages.filter(function(a) {
          return !(typeof a === "string" && containsBlockedOutput([a]));
        });
        if (cleaned.length !== verdict.advantages.length) {
          verdict.advantages = cleaned;
          outputBlocked = true;
        }
      }
      if (Array.isArray(verdict.user_claims_used)) {
        const cleaned = verdict.user_claims_used.filter(function(c) {
          return !(typeof c === "string" && containsBlockedOutput([c]));
        });
        if (cleaned.length !== verdict.user_claims_used.length) {
          verdict.user_claims_used = cleaned;
          outputBlocked = true;
        }
      }
      if (outputBlocked) {
        console.error("Output content filter neutralized one or more verdict fields before save.");
      }
    }

    // Style normalization (every branch's verdict has converged here): swap the em/en
    // dashes the model sometimes emits for ASCII punctuation so the prose does not read
    // as AI-written. Text fields only; winner/scores/counts are untouched.
    if (typeof verdict.verdict_short === "string") verdict.verdict_short = stripFancyDashes(verdict.verdict_short);
    if (typeof verdict.analysis === "string") verdict.analysis = stripFancyDashes(verdict.analysis);
    if (Array.isArray(verdict.advantages)) verdict.advantages = verdict.advantages.map(stripFancyDashes);
    if (Array.isArray(verdict.user_claims_used)) verdict.user_claims_used = verdict.user_claims_used.map(stripFancyDashes);

    // Save to Supabase and generate a share ID (fail-open: a DB error never breaks the verdict).
    let shareId = null;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        shareId = randomBytes(6).toString("base64url");
        const db = createClient(supabaseUrl, supabaseKey);
        const { error: dbError } = await db.from("battles").insert({
          id: shareId,
          battle_data: { f1, f2, u1, u2, battleType, location, power, depth, claims1, claims2 },
          result: verdict,
        });
        if (dbError) {
          console.error("Supabase insert error:", dbError);
          shareId = null;
        }
      } catch (dbErr) {
        console.error("Failed to save battle:", dbErr);
        shareId = null;
      }
    }

    return res.status(200).json(shareId ? { ...verdict, id: shareId } : verdict);
  } catch (err) {
    console.error("Battle handler error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
