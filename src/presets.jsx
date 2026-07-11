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
      authored: true,
      verdict_short:
        "Gojo takes it. At 20 fingers Sukuna only managed to tie him in a domain clash. At 15, he is missing the cursed energy and refinement to repeat that, and outside the domain Gojo's edge in hand-to-hand and speed decides it.",
      analysis:
        "This is closer than people think, but it lands on Gojo, and the reasoning is all in the domain math.\n\n" +
        "When Gojo and 20-finger Sukuna clashed domains, they tied. The only reason Sukuna won that exchange is that his domain is open, so he could attack the outside of Gojo's barrier. That open-domain compatibility is a real edge, but it does not change who had the stronger domain. Inside the space, they were equal, which actually means Gojo's domain is the more refined of the two, because Sukuna was bringing far more cursed energy to that tie. Sukuna at 20 fingers has twice the cursed energy of Yuta, and Yuta already had more than Gojo, so Sukuna was clashing with several times Gojo's reserves and still only managed to draw. Gojo's refinement is just that much higher.\n\n" +
        "Now drop him to 15 fingers. Sukuna gets stronger with every finger he eats, so 15 is a real step down from 20 in both cursed energy and refinement. Cut that power and the domain tie does not hold anymore, which means he can no longer reliably attack the outside of Gojo's barrier the way he did in Shibuya.\n\n" +
        "People bring up the small domain, but that cuts both ways. The only reason Gojo made his barrier so small was to strengthen it and try to swallow Sukuna's whole domain, and Sukuna simply adapted by shrinking his own range to push more output through the barrier. So the size trick nets out to nothing because Sukuna can counter it. What it comes down to is the hand-to-hand inside the domain. The only time Sukuna nullified Gojo's sure-hit was by keeping constant contact with his body, and Gojo answered that by using Blue to break the contact. Take contact away and they are back to clashing sure-hit attacks, which is exactly where Gojo can out-strike him.\n\n" +
        "And that is the real separator. Even at a full 20 fingers, Sukuna was only relative to Gojo in hand-to-hand and speed, with Gojo already the better striker. Strip five fingers of power off and that relative gap widens fast. Gojo ends up faster, stronger, and the better technician, and since he can tank the effects of Malevolent Shrine with Reverse Cursed Technique, he does not even need to open his own domain to win. He can box Sukuna down inside Shrine itself.\n\n" +
        "And this holds even if you spot Sukuna the pre-sealed Gojo, the version who cannot make the tiny domain. It does not matter. The whole story bears out that Sukuna had no way to bypass Infinity on his own. The only reason he ever got through it was Mahoraga adapting to Limitless for him. Strip out the Ten Shadows and the full twenty fingers, and Sukuna has no answer to Infinity at all, which is the entire reason he needed Mahoraga in the first place. So a 15-finger Sukuna without that adaptation is not beating Gojo, sealed or not.",
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
  {
    id: "yuji-modulo-vs-denji",
    label: "Yuji (Modulo) vs Denji",
    image1: "/presets/yuji-modulo.png",
    image2: "/presets/denji.png",
    image2Pos: "100% 20",
    verdict: {
      winner: "Yuji",
      authored: true,
      verdict_short:
        "Closer than a stomp, but it lands on Yuji, and the reasoning comes down to one thing Denji cannot regrow: his healing runs on drinking blood that here is poison, and his power is a bond to Pochita that canon has already shown can be severed.",
      analysis:
        "Modulo Yuji beats Denji, and the reasoning comes down to one thing Denji cannot regrow. Start with who Yuji is now. Sixty-eight years past the Culling Game, he has stopped aging and reads to inhuman senses as a curse rather than a man; the story stopped treating him as human. He carries both of Sukuna's old techniques: Blood Manipulation from the Death Paintings he consumed, and Shrine, the Cleave and Dismantle engraved into him as Sukuna's vessel. His blood is a weapon in two directions: Piercing Blood fires at the speed of sound, and the blood itself is a poison that once incapacitated an entire building of humans and Simurians. He lands Black Flash at a rate no one else in the verse approaches, and even if you refuse to grant it at will, a fighter this blessed by the black spark hits more of them in a single fight than anyone in the JJK verse, and every one sharpens him mid-fight. He also heals in record time, his blood making even limb reattachment more efficient than a normal sorcerer's. Now Denji. The trap against Denji is trying to out-damage him, and that trap is real: he drinks blood and regrows, pulls the cord and comes back, and walks off mutilation that ends anyone else. If this were a damage race, Denji wins it. So it cannot be a damage race, and two things make sure it is not. First, Denji's healing runs on drinking blood, and the blood flooding this fight is Yuji's, which is poison; his primary sustain engine is a trap here, and the more he heals off the field the more he incapacitates himself. Second, and this is the actual win condition: Denji's power is not his body, it is a bond. Pochita is his heart, a contract between a boy and a devil, and that bond is not theoretical to sever, because canon already severed it. Denji separated Pochita from himself to ambush Makima; the two can come apart. That is the whole fight, because Yuji spent seventy years mastering exactly the kind of attack that comes a bond apart. His Shrine and his soul perception, sharpened since Mahito, cut what a thing is rather than what it is made of, and his Domain's sure-hit is literally soul Untying. Denji's verse cannot no-sell that, because it is a verse where the metaphysical is the physics: the Chainsaw Devil erased nuclear weapons and an entire world war out of history by eating the concept, and Pochita ended the story by consuming his own heart and deleting Chainsaw Man from reality. A world that runs on concept-erasure has no grounds to shrug off a soul-cut. So Yuji does not need to out-heal Denji or out-last him. He needs to land the soul-directed cut that pries Pochita loose, and unlike flesh, that separation does not grow back with blood. The moment it lands, Denji is a boy and a heart in two places, and the fight is over. It stays close, because Denji only needs the damage race to run long enough, but the sever only needs to succeed once.",
      advantages: [
        "Black Flash at Will",
        "Poison Blood Cuts the Heal Loop",
        "Severs the Denji-Pochita Bond",
      ],
      user_claims_used: [],
      scores: { "Yuji": 54, "Denji": 46 },
    },
    snapshot: {
      f1: "Yuji", f2: "Denji",
      winnerImageUrl: "/presets/yuji-modulo.png",
      winnerImageError: false,
      winnerAdjust: { x: 50, y: 50, zoom: 1 },
      image1: "/presets/yuji-modulo.png",
      image2: "/presets/denji.png",
    },
  },
  {
    id: "aizen-vs-madara",
    label: "Aizen vs Madara",
    image1: "/presets/aizen.png",
    image2: "/presets/madara.png",
    // Spotlight-band framing (this card only). Madara's art is a full-body render with a
    // small head, so it is zoomed in to match Aizen's bust; Aizen is only nudged vertically.
    leftPos: "center 10%",
    rightPos: "center 14%",
    rightScale: 1.55,
    verdict: {
      winner: "Aizen",
      authored: true,
      verdict_short:
        "Aizen takes it. Kyoka Suigetsu is a flawless sensory hypnosis Madara has no counter to, since Sharingan immunity only covers chakra genjutsu, and Aizen sits in a power tier (fought Yhwach, who beat the Royal Guard) that Madara's Five Kage and Night Guy showings do not reach.",
      analysis:
        "Aizen doesn't just beat Madara, he beats him without the fight ever really starting, and the reason is a win condition Madara has no way to interact with.\n\n" +
        "Start with the ceiling. Aizen fought Yhwach, the strongest character in Bleach, the man who'd already beaten the Royal Guard, whose combined power dwarfs the entire Gotei 13. Aizen didn't win that fight, but he stood in it, and more importantly he landed Kyoka Suigetsu on Yhwach while The Almighty was active, undermining the precognition of a functionally omniscient being. That alone puts Aizen in a scaling conversation Madara isn't part of. Madara's ceiling is a war against the Five Kage and a Ten Tails jinchuriki run that ends with him getting cracked open by Night Guy, a strong human, not a realm tier threat.\n\n" +
        "The strength of Aizen's arsenal backs this up. Mugetsu, the attack that defeated his Hogyoku evolved form, is one of the strongest abilities shown in the series, taking down an opponent no single Gotei 13 captain could handle alone. That's the tier of power Aizen operates around.\n\n" +
        "But scaling isn't even the deciding factor. It's the mechanism. Kyoka Suigetsu's Complete Hypnosis is, by the series' own words, flawless. Once you've seen its release, you're under it, and knowing you're under it doesn't let you resist. Post-fusion, Aizen doesn't even need the blade; the trigger is simply seeing him. People point to the Uchiha Sharingan's genjutsu immunity, but that immunity is specifically against chakra based genjutsu, the kind broken by flooding your own chakra. Kyoka isn't that. It's a sensory hypnosis from a completely different system, and Madara has no established defense against a mechanism his verse has never encountered, even if we apply verse equalization, genjutsu are stated in the Naruto verse to only be escapable if someone imbues the affected user with chakra and disrupts the illusion, since this is a 1v1, Madara has no way to get out of Aizen's illusion. First real exchange, and Madara's five senses belong to Aizen.\n\n" +
        "Give Madara everything: Ten Tails, Rinnegan, the meteors, the clones. It doesn't matter when his opponent controls what he sees, hears, and feels, and sits in a power tier he can't scratch. There's no reading of this where Madara wins. Aizen, mid diff.",
      advantages: [
        "Inescapable sensory hypnosis (Kyoka Suigetsu)",
        "Sharingan immunity does not apply (non-chakra mechanism)",
        "Scales above Madara via the Yhwach chain",
      ],
      user_claims_used: [],
      scores: { "Aizen": 74, "Madara": 26 },
    },
    snapshot: {
      f1: "Aizen", f2: "Madara",
      winnerImageUrl: "/presets/aizen.png",
      winnerImageError: false,
      winnerAdjust: { x: 50, y: 50, zoom: 1 },
      image1: "/presets/aizen.png",
      image2: "/presets/madara.png",
      // Top-anchored framing for the verdict card (CardFighter reads these as object-position).
      // Without them CardFighter falls back to inline "center" (50%), which crops the heads on
      // mobile's short band. ~15% pulls the frame up toward the faces.
      image1Pos: "center 15%",
      image2Pos: "center 15%",
    },
  },
];

// One fighter image inside a preset spotlight. Falls back to the silhouette if the art is
// missing (expected while /presets/*.png do not exist yet) so a 404 never breaks layout.
export function PresetImg({ src, side, pos, scale }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <span className={"preset-img preset-img-fallback " + side}>
        <FighterSilhouette />
      </span>
    );
  }
  // Optional per-card framing for the spotlight band. When a preset omits pos/scale the
  // style object stays empty and the .preset-img CSS defaults (per-side object-position)
  // apply unchanged, so no other matchup is affected. scale zooms within the band, which
  // clips the overflow (.spotlight-band has overflow: hidden).
  const style = {};
  if (pos) { style.objectPosition = pos; }
  if (scale) { style.transform = "scale(" + scale + ")"; style.transformOrigin = pos || "center"; }
  return (
    <img
      className={"preset-img " + side}
      src={src}
      alt=""
      style={style}
      onError={() => setErr(true)}
    />
  );
}
