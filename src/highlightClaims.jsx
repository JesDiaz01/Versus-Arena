// src/highlightClaims.jsx
// Wraps occurrences of the user's granted-feat terms in a highlight span so they
// stand out within the verdict analysis. Pure text-splitting into React nodes --
// it never injects raw HTML, so AI output cannot smuggle markup in.

// Common words that should not, on their own, trigger a highlight.
const STOPWORDS = new Set([
  "the", "and", "but", "for", "with", "that", "this", "they", "them", "their",
  "would", "could", "should", "have", "has", "had", "are", "was", "were", "will",
  "can", "from", "into", "onto", "over", "than", "then", "when", "what", "which",
  "who", "whom", "your", "yours", "you", "his", "her", "hers", "its", "our", "ours",
  "all", "any", "not", "only", "also", "more", "most", "much", "very", "still",
  "even", "just", "like", "able", "make", "makes", "made", "give", "gives", "given",
  "here", "there", "where", "while", "both", "each", "some", "such", "every",
]);

// Build the list of terms to highlight: each claim phrase as a whole, plus its
// distinctive tokens (length >= 4, not a stopword). Longest first so full
// phrases win over single tokens and matches do not partially overlap.
function buildTerms(claims) {
  const terms = new Set();
  for (const c of claims || []) {
    if (typeof c !== "string") continue;
    const phrase = c.trim();
    if (phrase.length >= 4) terms.add(phrase.toLowerCase());
    for (const tok of phrase.toLowerCase().split(/[^a-z0-9+]+/)) {
      if (tok.length >= 4 && !STOPWORDS.has(tok)) terms.add(tok);
    }
  }
  return [...terms].sort((a, b) => b.length - a.length);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Returns either the original string (no claims / no matches) or an array of
// React nodes with matched terms wrapped in <span className="claim-highlight">.
export function highlightClaims(text, claims) {
  if (typeof text !== "string" || !text) return text;
  const terms = buildTerms(claims);
  if (terms.length === 0) return text;

  const re = new RegExp("\\b(" + terms.map(escapeRegExp).join("|") + ")\\b", "gi");
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
