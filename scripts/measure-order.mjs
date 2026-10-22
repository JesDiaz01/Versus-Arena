// scripts/measure-order.mjs
// Measures how consistent the battle judge is for ONE matchup, and whether the order the
// fighters are listed in changes what the AI says. It sends the site's real prompt, read
// straight out of api/battle.js so it can never drift from production, in both orders,
// --runs times each. For every call it reports the winner, the scores, whether the write-up
// shows the AI recognized the character (keyword hits vs. "no feats"-style doubt), and which
// model answered. It then pairs the calls up the way the site does and shows how each pair
// would have come out (winner, or Draw when the averaged gap is within DRAW_MARGIN).
//
// COSTS REAL MONEY: 2 x runs calls at the site's model and settings. Not used by the site
// or the build. Run from the repo root with the key set in your own terminal:
//   $env:ANTHROPIC_API_KEY = "<key>"; node scripts/measure-order.mjs
// Optional flags (defaults shown; dropdown defaults match the site's defaults):
//   --runs=5 --f1=Yuji --u1=Modulo --f2=Zenitsu --u2="Demon Slayer"
//   --type="Standard Fight" --location="Neutral Terrain" --power="Canon Only" --depth="Quick Verdict"
//   --keywords="Modulo,Shrine,Dismantle,Cleave,Blood Manipulation,Piercing Blood,Black Flash"

import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---- Pull the production prompt + request settings out of api/battle.js ----
const src = readFileSync(new URL("../api/battle.js", import.meta.url), "utf8");
function grab(re, what) {
  const m = src.match(re);
  if (!m) throw new Error(`Couldn't find ${what} in api/battle.js; update its pattern in this script.`);
  return m[0];
}
const extracted = [
  grab(/const MODEL = [^\n]*\n/, "MODEL"),
  grab(/const MODEL_SETTINGS = \{[\s\S]*?\r?\n\};\r?\n/, "MODEL_SETTINGS"),
  grab(/const REQUEST_SETTINGS = [^\n]*\n/, "REQUEST_SETTINGS"),
  grab(/const DRAW_MARGIN = [^\n]*\n/, "DRAW_MARGIN"),
  grab(/const ALLOWED = \{[\s\S]*?\r?\n\};\r?\n/, "ALLOWED"),
  grab(/function buildPrompt\([\s\S]*?\r?\n\}\r?\n(?=\r?\n\/\/ ---- Single Anthropic call)/, "buildPrompt"),
].join("\n");
const { MODEL, REQUEST_SETTINGS, DRAW_MARGIN, ALLOWED, buildPrompt } = new Function(
  extracted + "\nreturn { MODEL, REQUEST_SETTINGS, DRAW_MARGIN, ALLOWED, buildPrompt };"
)();

// ---- Options ----
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  if (!m) throw new Error(`Bad argument "${a}". Use --name=value.`);
  return [m[1], m[2]];
}));
const opt = {
  runs: parseInt(args.runs || "5", 10),
  f1: args.f1 || "Yuji", u1: args.u1 ?? "Modulo",
  f2: args.f2 || "Zenitsu", u2: args.u2 ?? "Demon Slayer",
  type: args.type || ALLOWED.battleType[0],
  location: args.location || ALLOWED.location[0],
  power: args.power || ALLOWED.power[0],
  depth: args.depth || ALLOWED.depth[0],
  keywords: (args.keywords || "Modulo,Shrine,Dismantle,Cleave,Blood Manipulation,Piercing Blood,Black Flash")
    .split(",").map((k) => k.trim()).filter(Boolean),
};
if (!(opt.runs >= 1)) throw new Error("--runs must be a positive number.");
for (const [key, list] of [["type", "battleType"], ["location", "location"], ["power", "power"], ["depth", "depth"]]) {
  if (!ALLOWED[list].includes(opt[key])) {
    throw new Error(`--${key}="${opt[key]}" isn't a site option. Pick one of: ${ALLOWED[list].join(" | ")}`);
  }
}
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("Set ANTHROPIC_API_KEY in this terminal first (see the top of this file).");

// Per-million-token prices, only used to report what the run cost.
const PRICES = { "claude-opus-5-5": [4, 20], "claude-sonnet-4-6": [3, 15] };
// Phrases that suggest the AI didn't recognize a fighter.
const DOUBT = /\b(no (known|established|documented|canonical|verifiable|notable)?\s*feats|unknown (universe|character|version|series)|not (familiar|aware|recognized|recognised)|unfamiliar|cannot (verify|confirm|identify)|insufficient (information|data)|little (is )?known|unclear (who|which|what))/i;

// ---- One call, same request shape and parsing as api/battle.js ----
async function callOnce(order, run) {
  const [fa, ua, fb, ub] = order === 1
    ? [opt.f1, opt.u1, opt.f2, opt.u2]
    : [opt.f2, opt.u2, opt.f1, opt.u1];
  const prompt = buildPrompt(fa, ua, "", fb, ub, "", false, opt.type, opt.location, opt.power, opt.depth);
  const started = Date.now();
  const out = { order, run, listedFirst: fa };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        ...REQUEST_SETTINGS.headers,
      },
      body: JSON.stringify({ model: MODEL, ...REQUEST_SETTINGS.body, messages: [{ role: "user", content: prompt }] }),
    });
    out.seconds = Math.round((Date.now() - started) / 1000);
    if (!res.ok) { out.error = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`; return out; }
    const data = await res.json();
    out.model = data.model;
    out.usage = data.usage;
    out.stopReason = data.stop_reason;
    if (data.stop_reason === "refusal") { out.error = "refusal"; return out; }
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    let clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");
    if (first !== -1 && last > first) clean = clean.slice(first, last + 1);
    out.verdict = JSON.parse(clean);
  } catch (e) {
    out.seconds = Math.round((Date.now() - started) / 1000);
    out.error = String(e && e.message || e);
  }
  return out;
}

// Small concurrency pool so a run finishes quickly without tripping rate limits.
async function pool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

const score = (v, name) => {
  const s = v && v.scores && v.scores[name];
  return typeof s === "number" && isFinite(s) ? Math.max(0, Math.min(100, s)) : null;
};

// ---- Run ----
const label = (f, u) => (u ? `${f} (${u})` : `${f} (no universe)`);
console.log(`Matchup: ${label(opt.f1, opt.u1)} vs ${label(opt.f2, opt.u2)}`);
console.log(`Settings: ${opt.type} | ${opt.location} | ${opt.power} | ${opt.depth}`);
console.log(`Sending ${opt.runs * 2} calls to ${MODEL} (${opt.runs} per order)...\n`);

const tasks = [];
for (let r = 1; r <= opt.runs; r++) {
  tasks.push(() => callOnce(1, r));
  tasks.push(() => callOnce(2, r));
}
const results = await pool(tasks, 4);

for (const order of [1, 2]) {
  const first = order === 1 ? label(opt.f1, opt.u1) : label(opt.f2, opt.u2);
  console.log(`=== Order ${order}: ${first} listed first ===`);
  const rows = results.filter((r) => r.order === order);
  for (const r of rows) {
    if (r.error) { console.log(`  #${r.run}  ERROR (${r.seconds}s): ${r.error}`); continue; }
    const v = r.verdict;
    const a = score(v, opt.f1);
    const b = score(v, opt.f2);
    const body = `${v.verdict_short || ""} ${v.analysis || ""}`;
    const hits = opt.keywords.filter((k) => body.toLowerCase().includes(k.toLowerCase()));
    const doubt = body.match(DOUBT);
    console.log(
      `  #${r.run}  winner=${String(v.winner).padEnd(10)} ${opt.f1} ${a ?? "?"} / ${opt.f2} ${b ?? "?"}` +
      `   keywords: ${hits.length ? hits.join(", ") : "none"}` +
      `   doubt: ${doubt ? `"${doubt[0]}"` : "no"}` +
      `   ${r.seconds}s${r.model && r.model !== MODEL ? `   ANSWERED BY ${r.model} (fallback)` : ""}`
    );
    console.log(`        ${v.verdict_short || "(no verdict_short)"}`);
  }
  const ok = rows.filter((r) => r.verdict);
  const wins = (n) => ok.filter((r) => r.verdict.winner === n).length;
  const f1Scores = ok.map((r) => score(r.verdict, opt.f1)).filter((s) => s !== null);
  const mean = f1Scores.length ? Math.round(f1Scores.reduce((x, y) => x + y, 0) / f1Scores.length) : "?";
  console.log(`  -> ${opt.f1} wins ${wins(opt.f1)}, ${opt.f2} wins ${wins(opt.f2)}, Draw ${wins("Draw")}, ` +
    `failed ${rows.length - ok.length}; mean ${opt.f1} score ${mean}\n`);
}

// Pair run N of each order, as one site battle would, and apply the site's averaging rule.
console.log(`=== How the site would resolve each pair (Draw if averaged gap <= ${DRAW_MARGIN}) ===`);
for (let r = 1; r <= opt.runs; r++) {
  const a = results.find((x) => x.order === 1 && x.run === r);
  const b = results.find((x) => x.order === 2 && x.run === r);
  const s = [score(a.verdict, opt.f1), score(a.verdict, opt.f2), score(b.verdict, opt.f1), score(b.verdict, opt.f2)];
  if (!a.verdict || !b.verdict || s.includes(null)) { console.log(`  pair #${r}: not scorable (a call failed or returned no scores)`); continue; }
  const avg1 = (s[0] + s[2]) / 2;
  const avg2 = (s[1] + s[3]) / 2;
  const outcome = Math.abs(avg1 - avg2) > DRAW_MARGIN ? `${avg1 > avg2 ? opt.f1 : opt.f2} wins` : "Draw";
  const split = a.verdict.winner !== b.verdict.winner ? "   (the two calls picked DIFFERENT winners)" : "";
  console.log(`  pair #${r}: ${opt.f1} ${avg1} / ${opt.f2} ${avg2} -> ${outcome}${split}`);
}

// ---- Cost + full results ----
const used = results.filter((r) => r.usage);
const inTok = used.reduce((t, r) => t + (r.usage.input_tokens || 0), 0);
const outTok = used.reduce((t, r) => t + (r.usage.output_tokens || 0), 0);
const price = PRICES[MODEL];
console.log(`\nTokens: ${inTok} in, ${outTok} out (output includes thinking).` +
  (price ? ` Approx cost: $${((inTok * price[0] + outTok * price[1]) / 1e6).toFixed(2)}` : ""));
const file = join(tmpdir(), `measure-order-${Date.now()}.json`);
writeFileSync(file, JSON.stringify({ options: opt, model: MODEL, results }, null, 2));
console.log(`Full verdicts (complete analyses) saved to: ${file}`);
