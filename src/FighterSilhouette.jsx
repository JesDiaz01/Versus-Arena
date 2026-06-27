// src/FighterSilhouette.jsx
// Shared neutral fighter silhouette (the default avatar placeholder). Used by BattleArena
// (input cards, loading clash, winner-avatar fallback) and by the preset rotator, so it
// lives in its own module rather than inside BattleArena.
export default function FighterSilhouette() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M50 12 C42 12, 36 18, 36 27 C36 33, 38 38, 41 41 L41 46 L59 46 L59 41 C62 38, 64 33, 64 27 C64 18, 58 12, 50 12 Z"
        fill="currentColor"
      />
      <rect x="40" y="28" width="20" height="2.5" fill="rgba(255,255,255,0.4)" />
      <path
        d="M30 50 L70 50 L74 58 L78 90 L62 90 L60 65 L40 65 L38 90 L22 90 L26 58 Z"
        fill="currentColor"
      />
      <path
        d="M47 52 L53 52 L52 62 L50 65 L48 62 Z"
        fill="rgba(255,255,255,0.25)"
      />
    </svg>
  );
}
