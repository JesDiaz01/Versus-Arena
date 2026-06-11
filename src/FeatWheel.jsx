import { useState, useRef } from "react";
import "./FeatWheel.css";

const WHEEL_COLORS = ["#FFFFFF", "#F7F2E6", "#FFFFFF", "#EFE7D4"];
const CX = 160;
const CY = 160;
const SEG_R = 140;
const RIM_R = 145;
const HUB_R = 30;
const TEXT_R = 108;
const LABEL_INNER_STOP = HUB_R + 6;  // labels may not cross this radius
const LABEL_MAX_LEN = TEXT_R - LABEL_INNER_STOP;
const CHAR_W = 0.6;                  // rough average glyph width in em, for width estimation

function toCartesian(angleDeg, r) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function buildSegPath(i, n) {
  const seg = 360 / n;
  const s = toCartesian(i * seg, SEG_R);
  const e = toCartesian((i + 1) * seg, SEG_R);
  const large = seg > 180 ? 1 : 0;
  return "M " + CX + " " + CY +
    " L " + s.x + " " + s.y +
    " A " + SEG_R + " " + SEG_R + " 0 " + large + " 1 " + e.x + " " + e.y +
    " Z";
}

export default function FeatWheel({ title, items, onSpinStart, onResult, size }) {
  size = size || 320;
  const n = items.length;
  const segAngle = 360 / n;
  const fontSize = n > 50 ? 4.2 : n > 30 ? 6 : 9;

  const [currentRotation, setCurrentRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [landedItem, setLandedItem] = useState(null);
  const rotationRef = useRef(0);
  const wheelRef = useRef(null);

  function handleSpin() {
    if (spinning || hasSpun) return;
    setHasSpun(true);

    const winnerIndex = Math.floor(Math.random() * n);
    const rawTarget = -((winnerIndex + 0.5) * segAngle);
    const desiredMod = ((rawTarget % 360) + 360) % 360;
    const minRot = rotationRef.current + 6 * 360;
    const cycles = Math.ceil((minRot - desiredMod) / 360);
    const newRotation = desiredMod + cycles * 360;

    rotationRef.current = newRotation;
    setCurrentRotation(newRotation);
    setSpinning(true);
    setLandedItem(null);
    onSpinStart();

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      var winner = items[winnerIndex];
      setSpinning(false);
      setLandedItem(winner);
      onResult(winner);
    }

    if (wheelRef.current) {
      wheelRef.current.addEventListener("transitionend", finish, { once: true });
    }
    setTimeout(finish, 4400);
  }

  return (
    <div className="fw-wrapper">
      {title && <div className="fw-title">{title}</div>}
      <svg
        viewBox="0 0 320 320"
        className="fw-svg"
        style={{
          width: "100%",
          height: "auto",
          maxWidth: size + "px",
          display: "block",
          margin: "0 auto"
        }}
      >
        {/* Rotating wheel group */}
        <g
          ref={wheelRef}
          style={{
            transform: "rotate(" + currentRotation + "deg)",
            transformBox: "fill-box",
            transformOrigin: "center",
            transition: spinning
              ? "transform 4.2s cubic-bezier(0.12,0.84,0.22,1)"
              : "none"
          }}
        >
          {items.map(function(item, i) {
            return (
              <path
                key={i}
                d={buildSegPath(i, n)}
                fill={WHEEL_COLORS[i % 4]}
                stroke="#D9CDAD"
                strokeWidth="0.6"
              />
            );
          })}

          {items.map(function(item, i) {
            var svgAngle = (i + 0.5) * segAngle - 90;
            var clampLabel = item.length * fontSize * CHAR_W > LABEL_MAX_LEN;
            return (
              <g
                key={i}
                transform={"translate(" + CX + "," + CY + ") rotate(" + svgAngle + ")"}
              >
                <text
                  x={TEXT_R}
                  y={0}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={fontSize}
                  fill="var(--ink)"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                  textLength={clampLabel ? LABEL_MAX_LEN : undefined}
                  lengthAdjust={clampLabel ? "spacingAndGlyphs" : undefined}
                >
                  {item}
                </text>
              </g>
            );
          })}

          {/* Outer gold rim */}
          <circle cx={CX} cy={CY} r={RIM_R} fill="none" stroke="#B8860B" strokeWidth="10" />
          {/* Rim inner highlight */}
          <circle cx={CX} cy={CY} r={SEG_R} fill="none" stroke="#D4A017" strokeWidth="2" />
        </g>

        {/* Fixed pointer — ink triangle at top center pointing down into wheel */}
        <polygon points="152,4 168,4 160,22" fill="var(--ink)" />

        {/* Fixed center hub */}
        <circle
          cx={CX}
          cy={CY}
          r={HUB_R}
          fill="var(--ink)"
          onClick={handleSpin}
          style={{
            cursor: spinning || hasSpun ? "default" : "pointer",
            opacity: spinning || hasSpun ? 0.65 : 1,
            pointerEvents: spinning || hasSpun ? "none" : "auto"
          }}
        />
        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontFamily="Cinzel, serif"
          fontSize="12"
          fontWeight="700"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          Spin
        </text>
      </svg>

      <div className="fw-result">
        {landedItem ? (
          <>
            <span className="fw-result-label">Landed: </span>
            <strong className="fw-result-value">{landedItem}</strong>
          </>
        ) : (
          <span className="fw-result-placeholder">&nbsp;</span>
        )}
      </div>
    </div>
  );
}
