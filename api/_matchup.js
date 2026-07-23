// api/_matchup.js
// Builds the leaderboard's matchup identity from raw fighter inputs. Two fighters make
// ONE matchup regardless of order, universe, settings, or custom feats -- so "Goku vs
// Superman" run plain and "Goku vs Superman" run with granted abilities count toward the
// same matchup. Identity is by canonical NAME pair only; universe is carried along purely
// so the leaderboard can look up a representative portrait.
//
// Canonicalization is deliberately simple and dependency-free (see normalizeName): case,
// spacing, punctuation, and diacritics are folded automatically, and a small hand-kept
// ALIASES table collapses genuinely different strings for the same famous character
// ("son goku" -> "goku"). The board is ~10 slots of well-known characters, so this short
// table covers the long tail without any per-request AI cost or latency.

// LEFT keys are already in normalized form (lowercased, diacritics stripped, every run of
// non-alphanumerics collapsed to a single space, trimmed). RIGHT values are the canonical
// name, also in normalized form. Keep entries conservative: only add a pair when it is
// unambiguously the same character, so the counter never merges two distinct fighters.
const ALIASES = {
  // Dragon Ball
  "son goku": "goku",
  "kakarot": "goku",
  "son gohan": "gohan",
  // DC
  "kal el": "superman",
  "clark kent": "superman",
  "bruce wayne": "batman",
  "the batman": "batman",
  "diana prince": "wonder woman",
  // Marvel
  "peter parker": "spider man",
  "spiderman": "spider man",
  "tony stark": "iron man",
  "ironman": "iron man",
  "steve rogers": "captain america",
  "bruce banner": "hulk",
  "the hulk": "hulk",
  "thor odinson": "thor",
  "logan": "wolverine",
  // Naruto
  "naruto uzumaki": "naruto",
  "uzumaki naruto": "naruto",
  "sasuke uchiha": "sasuke",
  "madara uchiha": "madara",
  // One Piece
  "monkey d luffy": "luffy",
  "roronoa zoro": "zoro",
  "zolo": "zoro",
  // Jujutsu Kaisen
  "satoru gojo": "gojo",
  "gojo satoru": "gojo",
  "ryomen sukuna": "sukuna",
  "itadori yuji": "yuji",
  "yuji itadori": "yuji",
  // Bleach
  "ichigo kurosaki": "ichigo",
  "kurosaki ichigo": "ichigo",
  // Attack on Titan
  "eren yeager": "eren",
  "eren jaeger": "eren",
  "eren jager": "eren",
  // One Punch Man
  "caped baldy": "saitama",
};

// Combining diacritical marks (U+0300..U+036F), written as ASCII escapes so this source
// stays pure ASCII. Used to drop accents left behind by NFKD decomposition.
const DIACRITICS = new RegExp("[\u0300-\u036f]", "g");

// Normalize a raw fighter name to its canonical grouping form. Lowercases, strips
// diacritics (so "Pokemon" typed with an accent collapses to the plain spelling),
// replaces every run of non-alphanumeric characters with a single space, trims, then
// applies the alias table. Returns "" when nothing usable remains (e.g. a purely
// non-Latin name) -- the caller treats that as "cannot identify" and skips counting
// rather than guessing.
function normalizeName(raw) {
  let s = (raw || "").toString().toLowerCase();
  s = s.normalize("NFKD").replace(DIACRITICS, "");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  if (!s) return "";
  return ALIASES[s] || s;
}

// Build the order-independent matchup identity, or null when either name cannot be
// canonicalized. Returns { key, a, b } where a/b are the two sides sorted by canonical
// name (so "A vs B" and "B vs A" yield the same key and the same a/b assignment), each
// carrying the display name (trimmed original casing) and its universe for portraits.
export function buildMatchupIdentity(f1, u1, f2, u2) {
  const c1 = normalizeName(f1);
  const c2 = normalizeName(f2);
  if (!c1 || !c2) return null;

  const side1 = { canon: c1, name: (f1 || "").toString().trim(), universe: (u1 || "").toString().trim() };
  const side2 = { canon: c2, name: (f2 || "").toString().trim(), universe: (u2 || "").toString().trim() };

  // Sort by canonical name so side A is always the alphabetically-first canon; this makes
  // the key order-independent and keeps a/b aligned with matchup_key in the stats table.
  const [a, b] = c1 <= c2 ? [side1, side2] : [side2, side1];
  return { key: a.canon + "|" + b.canon, a, b };
}
