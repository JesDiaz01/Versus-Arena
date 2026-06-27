// src/presets.jsx
// Preset matchup data + the small per-card image component, shared by the App.jsx hero
// rotator (which renders them) and BattleArena's loadPreset (which consumes
// preset.verdict + preset.snapshot to show a STORED verdict instantly - no /api/battle
// call, no Anthropic cost). Images/verdict text are placeholders for now.
// (This module is .jsx, not .js, because it contains the PresetImg JSX component; Vite
// only transforms JSX in .jsx files, matching the project's component-module convention.)
import { useState } from "react";
import FighterSilhouette from "./FighterSilhouette";

export const PRESETS = [
  {
    id: "gojo-vs-sukuna-15f",
    label: "Gojo vs Sukuna (15F)",
    image1: "/presets/gojo.png",
    image2: "/presets/sukuna.png",
    verdict: {
      winner: "Gojo",
      verdict_short: "PLACEHOLDER short verdict.",
      analysis: "PLACEHOLDER analysis text for the preset.",
      advantages: ["Placeholder advantage one", "Placeholder advantage two"],
      user_claims_used: [],
      feats_scanned: 30,
      sources: 8,
      scores: { "Gojo": 90, "Sukuna": 70 },
    },
    snapshot: {
      f1: "Gojo", f2: "Sukuna",
      winnerImageUrl: "/presets/gojo.png",
      winnerImageError: false,
      winnerAdjust: { x: 50, y: 50, zoom: 1 },
    },
  },
];

// One fighter image inside a preset spotlight. Falls back to the silhouette if the art is
// missing (expected while /presets/*.png do not exist yet) so a 404 never breaks layout.
export function PresetImg({ src, side }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <span className={"preset-img preset-img-fallback " + side}>
        <FighterSilhouette />
      </span>
    );
  }
  return (
    <img
      className={"preset-img " + side}
      src={src}
      alt=""
      onError={() => setErr(true)}
    />
  );
}
