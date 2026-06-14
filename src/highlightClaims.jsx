// src/highlightClaims.jsx
// Wraps occurrences of the user's granted-feat terms in a highlight span so they
// stand out within the verdict analysis. Pure text-splitting into React nodes --
// it never injects raw HTML, so AI output cannot smuggle markup in.
//
// Only the user's actually-entered claims are highlighted (never the AI's
// reasoning vocabulary), and the fighter names are excluded so they do not light
// up everywhere they appear.

// Words that should not, on their own, trigger a highlight: generic English
// stopwords plus common powerscaling / filler vocabulary.
const STOPWORDS = new Set([
  // generic
  "the", "and", "but", "for", "with", "that", "this", "they", "them", "their",
  "would", "could", "should", "have", "has", "had", "are", "was", "were", "will",
  "can", "from", "into", "onto", "over", "than", "then", "when", "what", "which",
  "who", "whom", "your", "yours", "you", "his", "her", "hers", "its", "our", "ours",
  "all", "any", "not", "only", "also", "more", "most", "much", "very", "still",
  "even", "just", "like", "able", "make", "makes", "made", "give", "gives", "given",
  "here", "there", "where", "while", "both", "each", "some", "such", "every",
  // short common words (the length floor is low, so noise is filtered here)
  "how", "why", "one", "two", "get", "got", "off", "out", "way", "let", "set",
  "use", "used", "uses", "hit", "hits", "big", "now", "yet", "per", "via", "him",
  "she",
  // powerscaling / filler
  "speed", "power", "powers", "attack", "attacks", "movement", "moves", "does",
  "granted", "grant", "grants", "fast", "faster", "strong", "stronger", "strength",
  "level", "levels", "durability", "energy", "force", "damage", "ability",
  "abilities", "fighter", "battle",
]);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Common English suffixes appended to a token stem so the AI's grammatical
// rewordings still match (lift -> lifting/lifted, hypersonic -> hypersonics).
// The match stays whole-word anchored, so a suffix can only extend the stem
// into a complete word, never bleed into an unrelated one.
const COMMON_SUFFIXES = "(?:s|es|ed|ing|er|ion)?";

// Explicit word-form sets for cases where simple suffixing does not reach the
// real form (fly -> flies/flight). The map is authoritative for its keys.
const FORM_MAP = {
  fly: ["fly", "flies", "flying", "flight"],
  lift: ["lift", "lifts", "lifting", "lifted"],
};

// Regex source that matches a distinctive token and its common word-forms.
function tokenSource(tok) {
  if (FORM_MAP[tok]) {
    const forms = [...FORM_MAP[tok]]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp);
    return "(?:" + forms.join("|") + ")";
  }
  // Stems of 4+ letters get conservative suffix tolerance. Length-3 tokens stay
  // literal so a short stem cannot pick up an unrelated word (e.g. ton/toned).
  if (tok.length >= 4) return escapeRegExp(tok) + COMMON_SUFFIXES;
  return escapeRegExp(tok);
}

// Build the list of regex-source fragments to highlight from the user's claims:
//  - each multi-word claim as a whole phrase (preferred, matched longest-first), and
//  - individual tokens only when genuinely distinctive (an all-caps acronym, or
//    length >= 3 and not a common/filler word), expanded to common word-forms.
// The stopword list, not the length cutoff, is what filters noise.
// Fighter names (and their individual words) are always excluded.
function buildTerms(claims, fighterNames) {
  const excludeTok = new Set();
  const excludeName = new Set();
  for (const name of fighterNames || []) {
    if (typeof name !== "string") continue;
    const n = name.trim().toLowerCase();
    if (!n) continue;
    excludeName.add(n);
    for (const tok of n.split(/[^a-z0-9+]+/)) if (tok) excludeTok.add(tok);
  }

  // base (for length sorting / dedupe) -> regex source.
  const frags = new Map();
  for (const c of claims || []) {
    if (typeof c !== "string") continue;
    const phrase = c.trim();
    if (!phrase) continue;
    const lowerPhrase = phrase.toLowerCase();

    // Prefer the full phrase for any multi-word claim (literal, no suffixing).
    const wordCount = lowerPhrase.split(/\s+/).length;
    if (wordCount >= 2 && lowerPhrase.length >= 4 && !excludeName.has(lowerPhrase)) {
      frags.set(lowerPhrase, escapeRegExp(lowerPhrase));
    }

    // Fall back to genuinely distinctive single tokens.
    for (const rawTok of phrase.split(/[^A-Za-z0-9+]+/)) {
      if (!rawTok) continue;
      const tok = rawTok.toLowerCase();
      if (excludeTok.has(tok) || STOPWORDS.has(tok)) continue;
      const isAcronym = rawTok.length >= 2 && rawTok === rawTok.toUpperCase() && /[A-Z]/.test(rawTok);
      if (isAcronym || tok.length >= 3) frags.set(tok, tokenSource(tok));
    }
  }

  // Longest base first so full phrases win over single tokens and matches do not
  // partially overlap.
  return [...frags.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .map((e) => e[1]);
}

// Returns either the original string (no claims / no matches) or an array of
// React nodes with matched terms wrapped in <span className="claim-highlight">.
export function highlightClaims(text, claims, fighterNames) {
  if (typeof text !== "string" || !text) return text;
  const fragments = buildTerms(claims, fighterNames);
  if (fragments.length === 0) return text;

  // fragments are already escaped regex sources (literals + suffix groups).
  const re = new RegExp("\\b(" + fragments.join("|") + ")\\b", "gi");
  const out = [];
  let last = 0;
  let key = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <span key={key++} className="claim-highlight">{m[0]}</span>
    );
    last = m.index + m[0].length;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length loops
  }
  if (out.length === 0) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}
