// api/_contentFilter.js
// Server-side content filter for user-supplied free-text battle fields.
// Blocks profanity, slurs, and sexual content, with evasion resistance
// (leetspeak, symbol substitution, inserted spaces/punctuation, unicode
// look-alikes) provided by obscenity's recommended transformer pipeline.
//
// Used only by api/battle.js. Never imported by any frontend file, and never
// logs the offending text or any user data.

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
const CUSTOM_BLOCKED = [];

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
];

// Build the matcher ONCE at module load (not per request).
let dataset = new DataSet().addAll(englishDataset);
for (const term of CUSTOM_BLOCKED) {
  dataset = dataset.addPhrase((phrase) => phrase.addPattern(parseRawPattern(term)));
}
const built = dataset.build();

// Append skipNonAlphabeticTransformer to the blacklist pipeline so separators
// inserted between letters (spaces, dots, hyphens) are collapsed before
// matching, catching evasion like "f u c k" and "f.u.c.k". It runs AFTER the
// recommended leetspeak/confusable transformers so "n1gg@" still resolves to
// letters before the digits/symbols are stripped.
const matcher = new RegExpMatcher({
  blacklistedTerms: built.blacklistedTerms,
  whitelistedTerms: [...built.whitelistedTerms, ...CUSTOM_ALLOWED],
  blacklistMatcherTransformers: [
    ...englishRecommendedTransformers.blacklistMatcherTransformers,
    skipNonAlphabeticTransformer(),
  ],
  whitelistMatcherTransformers: englishRecommendedTransformers.whitelistMatcherTransformers,
});

// Returns true if ANY supplied field contains blocked content. Each field is
// checked independently so matches cannot span across separate inputs.
export function containsBlockedContent(fields) {
  if (!Array.isArray(fields)) return false;
  for (const field of fields) {
    if (typeof field === "string" && field.length && matcher.hasMatch(field)) {
      return true;
    }
  }
  return false;
}
