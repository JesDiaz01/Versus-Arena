// api/_contentFilter.js
// Server-side content filter for user-supplied free-text battle fields.
// Blocks profanity, slurs, and sexual content, with evasion resistance
// (leetspeak, symbol substitution, inserted spaces/punctuation, unicode
// look-alikes) provided by obscenity's recommended transformer pipeline.
//
// Used by api/battle.js and api/character-image.js (both server-side). Never
// imported by any frontend file, and never logs the offending text or any user data.

import {
  RegExpMatcher,
  DataSet,
  englishDataset,
  englishRecommendedTransformers,
  skipNonAlphabeticTransformer,
  parseRawPattern,
} from "obscenity";

// Project-specific terms to ALSO block. Plain strings; each gets the same
// leetspeak / confusable / word-boundary handling as the built-in dataset.
// Edit this list to add terms over time.
const CUSTOM_BLOCKED = [
  "coochie",
  "cooch",
  "coochy",
  "kooch",
  "punani",
  "punany",
];

// Legitimate words that must NEVER be blocked even though they contain a banned
// substring (the Scunthorpe problem). These are whitelisted globally so any
// blacklist match overlapping them is discarded. Add real words here if a
// legitimate input ever gets caught.
const CUSTOM_ALLOWED = [
  "assassin",
  "class",
  "pass",
  "passage",
  "bass",
  "embarrass",
  "cassandra",
  "sasuke",
  "megumin",
  "stannis",
  "ass-kicking",
  "asskicking",
  // "anal" family: model-generated verdict prose uses these constantly ("analysis",
  // "analyze"...). Belt-and-suspenders alongside the OUTPUT-mode matcher below; this
  // whitelist alone is not sufficient (a collapsed "<word>analysis" hit starts BEFORE
  // the whitelisted span, so containment does not discard it), which is why model
  // output uses containsBlockedOutput (mNormal only) rather than the collapsed pass.
  "analysis",
  "analyze",
  "analytical",
  "analyst",
];

// Build the dataset ONCE at module load (dataset terms + any CUSTOM_BLOCKED).
let dataset = new DataSet().addAll(englishDataset);
for (const term of CUSTOM_BLOCKED) {
  dataset = dataset.addPhrase((phrase) => phrase.addPattern(parseRawPattern(term)));
}
const built = dataset.build();
const whitelistedTerms = [...built.whitelistedTerms, ...CUSTOM_ALLOWED];

// Two matchers, checked together (see containsBlockedContent):
//
// 1) mNormal uses obscenity's recommended transformers ONLY, keeping word
//    boundaries intact. This is the primary matcher: a banned word embedded in
//    a longer sentence (e.g. "ass" in "his power is to ass someone") still
//    matches, because the dataset's patterns are boundary-anchored.
//
// 2) mCollapsed additionally strips non-alphabetic characters between letters
//    (skipNonAlphabeticTransformer) to catch separator evasion like "f u c k"
//    and "a s s". That transformer glues the whole field into one token and
//    destroys word boundaries, so it is used ONLY as a second pass, never on
//    its own -- using it alone was the bug that let embedded words leak through.
const mNormal = new RegExpMatcher({
  blacklistedTerms: built.blacklistedTerms,
  whitelistedTerms,
  ...englishRecommendedTransformers,
});

const mCollapsed = new RegExpMatcher({
  blacklistedTerms: built.blacklistedTerms,
  whitelistedTerms,
  blacklistMatcherTransformers: [
    ...englishRecommendedTransformers.blacklistMatcherTransformers,
    skipNonAlphabeticTransformer(),
  ],
  whitelistMatcherTransformers: englishRecommendedTransformers.whitelistMatcherTransformers,
});

// Core check: returns true if ANY field matches under the supplied matcher list.
// Each field is checked independently so matches cannot span across separate inputs.
function anyFieldMatches(fields, matchers) {
  if (!Array.isArray(fields)) return false;
  for (const field of fields) {
    if (typeof field === "string" && field.length &&
        matchers.some((m) => m.hasMatch(field))) {
      return true;
    }
  }
  return false;
}

// STRICT mode -- for USER INPUT (fighter names, universes, custom feats). Runs BOTH
// matchers so embedded words AND separator-evasion ("a s s", "f u c k") are caught,
// because a user MIGHT be trying to slip something past the filter. This is the
// original behavior; it is what api/battle.js's input gate and api/character-image.js
// rely on, and it must not be weakened.
export function containsBlockedContent(fields) {
  return anyFieldMatches(fields, [mNormal, mCollapsed]);
}

// OUTPUT mode -- for MODEL-GENERATED prose (verdict.analysis / verdict_short / labels).
// Runs ONLY the boundary-respecting matcher, NOT the collapsed/space-stripping pass.
// The model writes normal English and is not evading anything, so the anti-evasion
// collapse is pure downside here: it glues adjacent words into one token and reads a
// banned substring spanning the join (e.g. "his analysis" -> "hisanalysis" -> the
// "anal" family's "sanal"), neutralizing a perfectly clean verdict. A REAL slur in
// normal prose keeps its word boundaries intact, so mNormal still blocks it -- only the
// space-collapsing false positives on legit words are dropped.
export function containsBlockedOutput(fields) {
  return anyFieldMatches(fields, [mNormal]);
}
