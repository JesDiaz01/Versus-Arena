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
  // Toggle for the "POWERSCALER APPROVED" badge tooltip (hover on desktop, tap on mobile).
  const [showAuthoredInfo, setShowAuthoredInfo] = useState(false);

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
        {result.authored && (
          <div
            className="verdict-badge"
            onMouseEnter={() => setShowAuthoredInfo(true)}
            onMouseLeave={() => setShowAuthoredInfo(false)}
            onClick={() => setShowAuthoredInfo(v => !v)}
          >
            POWERSCALER APPROVED
            <span className="verdict-badge-shield" aria-label="What does this mean?">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z"
                      fill="rgba(184,134,11,0.12)" stroke="currentColor" strokeWidth="2"
                      strokeLinejoin="round" strokeLinecap="round" />
                <line x1="12" y1="3" x2="12" y2="21.2" stroke="currentColor"
                      strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
              </svg>
            </span>
            {showAuthoredInfo && (
              <span className="verdict-badge-tip" role="tooltip">
                Written and fact-checked by a human powerscaler.
              </span>
            )}
          </div>
        )}
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
