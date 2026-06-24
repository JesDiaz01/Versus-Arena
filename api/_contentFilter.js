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

// Returns true if ANY supplied field contains blocked content. Each field is
// checked independently so matches cannot span across separate inputs, and is
// run through both matchers so embedded words and separator-evasion are caught.
export function containsBlockedContent(fields) {
  if (!Array.isArray(fields)) return false;
  for (const field of fields) {
    if (typeof field === "string" && field.length &&
        (mNormal.hasMatch(field) || mCollapsed.hasMatch(field))) {
      return true;
    }
  }
  return false;
}
