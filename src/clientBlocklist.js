// src/clientBlocklist.js
// Lightweight CLIENT-SIDE early-catch blocklist for the fighter NAME and UNIVERSE
// fields. This is a small UX convenience only: it stops an obvious slur from firing
// an image fetch and lets the UI show a polite inline note before the user ever hits
// Simulate. It is intentionally NOT exhaustive and NOT evasion-proof -- the real,
// comprehensive backstop is the server filter (api/_contentFilter.js, used by both
// api/battle.js and api/character-image.js). Keep this list short.
//
// Matching is deliberately cheap: the input is lowercased and split into alphanumeric
// word tokens, each token is checked against a tiny allowlist first (so a safe word
// that merely contains a banned substring is never flagged -- the Scunthorpe problem),
// then tested for any blocked substring. No regex engine, no transformers, no network.

// Clear, unambiguous bad words / slurs only. Each is matched as a lowercased substring
// of a word token, so plural / suffix forms (e.g. "-s", "-er") are covered without
// listing them. Short ambiguous fragments (e.g. "ass", "cock") are deliberately left
// OUT to avoid false positives; the server filter catches the long tail.
const BLOCKED = [
  "nigger",
  "nigga",
  "faggot",
  "kike",
  "chink",
  "gook",
  "wetback",
  "beaner",
  "tranny",
  "retard",
  "cunt",
  "twat",
  "whore",
  "slut",
  "fuck",
  "shit",
  // Project-specific terms (mirrors api/_contentFilter.js CUSTOM_BLOCKED).
  "coochie",
  "cooch",
  "coochy",
  "kooch",
  "punani",
  "punany",
];

// Safe whole words that contain a BLOCKED substring and must never be flagged. Only
// the real collisions for the list above are needed (the Scunthorpe problem). Add a
// word here if a legitimate name ever gets caught client-side.
const ALLOWED = new Set([
  "scunthorpe",   // contains "cunt"
  "snigger",      // contains "nigger"
  "sniggered",
  "sniggering",
  "niggardly",    // contains "nigga"
  "gobbledygook", // contains "gook"
  "retardant",    // contains "retard"
  "scooch",       // contains "cooch"
]);

// Returns true if the supplied text contains an obvious blocked word. Empty / non-string
// input is treated as clean (returns false) so a blank universe field never trips it.
export function checkClientBlocked(text) {
  if (text == null) return false;
  const lower = String(text).toLowerCase();
  const tokens = lower.match(/[a-z0-9]+/g);
  if (!tokens) return false;
  for (const tok of tokens) {
    if (ALLOWED.has(tok)) continue;
    for (const bad of BLOCKED) {
      if (tok.indexOf(bad) !== -1) return true;
    }
  }
  return false;
}
