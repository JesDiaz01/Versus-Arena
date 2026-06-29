// src/PresetCard.jsx
// Cinematic verdict card shown for PRESET taps ONLY (not normal battles). Three-column
// layout: big fighter PNGs flank the sides (winner vivid, loser dramatic-grayscale) with
// the verdict content stacked in the middle. BattleArena renders this in place of the
// normal .result-panel when the preset flag (snapshot.image1 && snapshot.image2) is set,
// so the normal-battle verdict panel is left completely untouched. forwardRef lets
// BattleArena's scroll-to-verdict effect target the card's root.
//
// Phase 1 = the card itself with a simple fade/rise entrance. The fancy "expand from the
// tapped spotlight band" transition is a LATER phase and is intentionally not built here.
import { forwardRef, useState } from "react";
import { highlightClaims } from "./highlightClaims";
import { verdictDiffLabel } from "./diffTier";
import FighterSilhouette from "./FighterSilhouette";

// One flanking fighter image. Falls back to the silhouette if the PNG 404s (the same guard
// the hero spotlight's PresetImg uses) so missing art never breaks the card. `dimmed`
// triggers the loser's grayscale/dim treatment via CSS.
function CardFighter({ src, name, side, dimmed }) {
  const [err, setErr] = useState(false);
  const cls = "preset-card-img " + side + (dimmed ? " dimmed" : "");
  if (err || !src) {
    return (
      <span className={cls + " preset-card-img-fallback"} aria-hidden="true">
        <FighterSilhouette />
      </span>
    );
  }
  return (
    <img
      className={cls}
      src={src}
      alt={name || ""}
      referrerPolicy="no-referrer"
      onError={() => setErr(true)}
    />
  );
}

const PresetCard = forwardRef(function PresetCard({ result, snapshot, onNewBattle }, ref) {
  const winner = result.winner || "";
  const isDraw = winner === "Draw";

  // Use the snapshot's fighter names (a preset never fills the live f1/f2 inputs).
  const f1 = snapshot.f1 || "";
  const f2 = snapshot.f2 || "";

  // Winner side stays vivid; the loser side is dimmed/grayscaled. Match result.winner
  // against the snapshot names. A draw dims neither side.
  const wl = winner.toLowerCase();
  const f1Won = !isDraw && !!f1 && wl.includes(f1.toLowerCase());
  const f2Won = !isDraw && !!f2 && wl.includes(f2.toLowerCase());

  const diffLabel = verdictDiffLabel(result);
  const advantages = Array.isArray(result.advantages) ? result.advantages : [];

  return (
    <div className="preset-card" ref={ref}>
      {/* LEFT: fighter one. Dimmed when fighter two won. */}
      <CardFighter src={snapshot.image1} name={f1} side="left" dimmed={f2Won} />

      {/* MIDDLE: the verdict content. */}
      <div className="preset-card-body">
        <div className="preset-card-eyebrow">{isDraw ? "Verdict" : "Winner"}</div>
        <div className="preset-card-winner">{isDraw ? "It's a Draw" : winner}</div>
        {diffLabel && <div className="verdict-diff">{diffLabel}</div>}
        <div className="preset-card-subtitle">
          Analyzed {result.feats_scanned} feats {String.fromCharCode(183)} {result.sources} sources
        </div>

        {advantages.length > 0 && (
          <div className="verdict-chips preset-card-chips">
            {advantages.map(function (a, i) {
              return <span key={i} className="chip">{a}</span>;
            })}
          </div>
        )}

        <p className="preset-card-text">
          {result.verdict_short && (
            <strong className="verdict-short">{result.verdict_short}</strong>
          )}
          {highlightClaims(result.analysis || "", [], [f1, f2])}
        </p>

        <div className="preset-card-actions">
          <button className="rematch-btn" onClick={onNewBattle}>New Battle</button>
        </div>
      </div>

      {/* RIGHT: fighter two. Dimmed when fighter one won. */}
      <CardFighter src={snapshot.image2} name={f2} side="right" dimmed={f1Won} />
    </div>
  );
});

export default PresetCard;
