// src/diffTier.js
// Derives a powerscaling "diff" tier label from the verdict's dominance scores.
// Pure, frontend-only: reads result.winner and result.scores (already in the
// verdict response). No API, prompt, or scoring changes.

// Thresholds are the winner's dominance score (the higher of the 100-sum split).
// Edit these to tune the bands.
const DIFF_TIERS = [
  { min: 96, label: "No diff" },
  { min: 80, label: "Low diff" },
  { min: 66, label: "Mid diff" },
  { min: 56, label: "High diff" },
  { min: 51, label: "Extreme diff" },
];

// Map a winner's dominance score to its diff label, or null if no band matches
// (a score of 50 or below should not occur for an actual winner).
export function diffTier(winnerScore) {
  for (const t of DIFF_TIERS) {
    if (winnerScore >= t.min) return t.label;
  }
  return null;
}

// Returns the diff label for a decisive verdict, or null when there is no
// decisive winner (draw) or the scores are missing/malformed. Draws render no
// pill; the draw is already conveyed by the title/winner text.
export function verdictDiffLabel(result) {
  if (!result || result.winner === "Draw") return null;
  const scores = result.scores;
  if (!scores || typeof scores !== "object") return null;
  const vals = Object.values(scores).filter(
    (v) => typeof v === "number" && isFinite(v)
  );
  if (vals.length === 0) return null;
  // The winner is whichever fighter holds the higher score, never just fighter 1.
  return diffTier(Math.max(...vals));
}
