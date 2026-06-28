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
      verdict_short:
        "Gojo takes it. At 20 fingers Sukuna only managed to tie him in a domain clash. At 15, he is missing the cursed energy and refinement to repeat that, and outside the domain Gojo's edge in hand-to-hand and speed decides it.",
      analysis:
        "This is closer than people think, but it lands on Gojo, and the reasoning is all in the domain math.\n\n" +
        "When Gojo and 20-finger Sukuna clashed domains, they tied. The only reason Sukuna won that exchange is that his domain is open, so he could attack the outside of Gojo's barrier. That open-domain compatibility is a real edge, but it does not change who had the stronger domain. Inside the space, they were equal, which actually means Gojo's domain is the more refined of the two, because Sukuna was bringing far more cursed energy to that tie. Sukuna at 20 fingers has twice the cursed energy of Yuta, and Yuta already had more than Gojo, so Sukuna was clashing with several times Gojo's reserves and still only managed to draw. Gojo's refinement is just that much higher.\n\n" +
        "Now drop him to 15 fingers. Sukuna gets stronger with every finger he eats, so 15 is a real step down from 20 in both cursed energy and refinement. Cut that power and the domain tie does not hold anymore, which means he can no longer reliably attack the outside of Gojo's barrier the way he did in Shibuya.\n\n" +
        "People bring up the small domain, but that cuts both ways. The only reason Gojo made his barrier so small was to strengthen it and try to swallow Sukuna's whole domain, and Sukuna simply adapted by shrinking his own range to push more output through the barrier. So the size trick nets out to nothing because Sukuna can counter it. What it comes down to is the hand-to-hand inside the domain. The only time Sukuna nullified Gojo's sure-hit was by keeping constant contact with his body, and Gojo answered that by using Blue to break the contact. Take contact away and they are back to clashing sure-hit attacks, which is exactly where Gojo can out-strike him.\n\n" +
        "And that is the real separator. Even at a full 20 fingers, Sukuna was only relative to Gojo in hand-to-hand and speed, with Gojo already the better striker. Strip five fingers of power off and that relative gap widens fast. Gojo ends up faster, stronger, and the better technician, and since he can tank the effects of Malevolent Shrine with Reverse Cursed Technique, he does not even need to open his own domain to win. He can box Sukuna down inside Shrine itself.\n\n" +
        "And this holds even if you spot Sukuna the pre-sealed Gojo, the version who cannot make the tiny domain. It does not matter. The whole story bears out that Sukuna had no way to bypass Infinity on his own. The only reason he ever got through it was Mahoraga adapting to Limitless for him. Strip out the Ten Shadows and the full twenty fingers, and Sukuna has no answer to Infinity at all, which is the entire reason he needed Mahoraga in the first place. So a 15-finger Sukuna without that adaptation is not beating Gojo, sealed or not.\n\n" +
        "One last point that gets overlooked: Sukuna himself sent Mahoraga out to gather the rest of his fingers and even worked to make up for the ones he was short. He clearly believed he needed all twenty to stand a real chance. Between a 15-finger Sukuna and Gojo, Gojo wins.",
      advantages: [
        "Superior domain refinement",
        "Cursed energy advantage at 15F",
        "Faster and stronger in hand-to-hand",
        "Tanks Malevolent Shrine with RCT",
      ],
      user_claims_used: [],
      feats_scanned: 34,
      sources: 8,
      scores: { "Gojo": 72, "Sukuna": 58 },
    },
    snapshot: {
      f1: "Gojo", f2: "Sukuna",
      winnerImageUrl: "/presets/gojo.png",
      winnerImageError: false,
      winnerAdjust: { x: 50, y: 50, zoom: 1 },
      // Both fighter images so the verdict header can show a preset matchup (both sides),
      // not just the single winner avatar. Presence of image1/image2 is the preset flag.
      image1: "/presets/gojo.png",
      image2: "/presets/sukuna.png",
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
