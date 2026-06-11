import { useState, useRef, useEffect } from "react";

/* ============================================================
   SHARED HELPERS
   ============================================================ */
function classifyTier(j) {
  if (j == null || isNaN(j)) return "";
  if (j < 1e3) return "Below Wall level";
  if (j < 1e6) return "Wall level";
  if (j < 1e9) return "Building level";
  if (j < 1e12) return "City Block level";
  if (j < 1e16) return "City level";
  if (j < 1e20) return "Island level";
  if (j < 1e24) return "Country level";
  if (j < 1e28) return "Continent level";
  if (j < 1e32) return "Moon level";
  if (j < 1e44) return "Planet level";
  if (j < 1e48) return "Star level";
  return "Solar System level or beyond";
}

function fmtJoulesShared(j) {
  if (j == null || isNaN(j)) return "—";
  if (j < 1000) return `${j.toFixed(1)} J`;
  if (j < 1e6) return `${(j / 1000).toFixed(2)} kJ`;
  if (j < 1e9) return `${(j / 1e6).toFixed(2)} MJ`;
  if (j < 1e12) return `${(j / 1e9).toFixed(2)} GJ`;
  return `${j.toExponential(2)} J`;
}

/* ============================================================
   1. KINETIC ENERGY
   ============================================================ */
function KineticEnergyCalc() {
  const [mass, setMass] = useState("");
  const [massUnit, setMassUnit] = useState("kg");
  const [speed, setSpeed] = useState("");
  const [speedUnit, setSpeedUnit] = useState("m/s");
  const [copied, setCopied] = useState(false);

  function massToKg(val, unit) {
    const v = parseFloat(val);
    if (isNaN(v)) return null;
    switch (unit) {
      case "kg": return v; case "g": return v / 1000;
      case "lb": return v * 0.453592; case "ton": return v * 1000;
      default: return v;
    }
  }
  function speedToMs(val, unit) {
    const v = parseFloat(val);
    if (isNaN(v)) return null;
    switch (unit) {
      case "m/s": return v; case "km/h": return v / 3.6;
      case "mph": return v * 0.44704; case "mach": return v * 343;
      case "c": return v * 299792458; default: return v;
    }
  }

  const m = massToKg(mass, massUnit);
  const s = speedToMs(speed, speedUnit);
  const ke = (m !== null && s !== null) ? 0.5 * m * s * s : null;

  function describeEnergy(joules) {
    if (joules === null) return null;
    const tntTons = joules / 4.184e9;
    if (joules < 100) return "a light tap";
    else if (joules < 1000) return "a solid punch";
    else if (joules < 50000) return "a highway-speed car crash";
    else if (joules < 1e6) return "a stick of dynamite";
    else if (tntTons < 0.001) return `${(joules / 1e6).toFixed(1)} MJ, large-explosion-level energy`;
    else if (tntTons < 1) return `${(tntTons * 1000).toFixed(1)} kg of TNT-equivalent energy`;
    else if (tntTons < 1000) return `${tntTons.toFixed(1)} tons of TNT-equivalent energy (building-level)`;
    else if (tntTons < 1e6) return `${(tntTons / 1000).toFixed(1)} kilotons of TNT-equivalent energy (town-level)`;
    else if (tntTons < 1e9) return `${(tntTons / 1e6).toFixed(1)} megatons of TNT-equivalent energy (city-level)`;
    else if (tntTons < 1e12) return `${(tntTons / 1e9).toFixed(1)} gigatons of TNT-equivalent energy (large-scale)`;
    else if (joules < 2.4e32) return `island-to-continent-level kinetic energy`;
    else if (joules < 2.4e36) return `planet-level kinetic energy`;
    else if (joules < 1e44) return `star-level kinetic energy`;
    else return `solar-system-level or beyond kinetic energy`;
  }

  const featText = ke !== null
    ? `Strikes with ${fmtJoulesShared(ke)} of kinetic energy (mass ${mass}${massUnit} at ${speed} ${speedUnit}): ${describeEnergy(ke)}. (Raw energy figure; does not account for delivery, durability, or area of effect.)`
    : "";
  function copyFeat() {
    if (!featText) return;
    navigator.clipboard.writeText(featText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="calc-card">
      <h3 className="calc-title">Kinetic Energy</h3>
      <p className="calc-desc">How hard does a character actually hit? Speed matters exponentially: doubling speed quadruples the energy.</p>
      <div className="calc-row">
        <label className="calc-label">Mass</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={mass} onChange={e => setMass(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={massUnit} onChange={e => setMassUnit(e.target.value)}>
            <option value="kg">kg</option><option value="g">g</option><option value="lb">lb</option><option value="ton">tons</option>
          </select>
        </div>
      </div>
      <div className="calc-row">
        <label className="calc-label">Speed</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={speed} onChange={e => setSpeed(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={speedUnit} onChange={e => setSpeedUnit(e.target.value)}>
            <option value="m/s">m/s</option><option value="km/h">km/h</option><option value="mph">mph</option><option value="mach">Mach</option><option value="c">× light speed</option>
          </select>
        </div>
      </div>
      {ke !== null && (
        <div className="calc-result">
          <div className="calc-result-main">{fmtJoulesShared(ke)}</div>
          <div className="calc-result-sub">≈ {describeEnergy(ke)}</div>
          <div className="calc-disclaimer">
            Raw kinetic energy only. Real destructive capacity also depends on durability,
            delivery, and area of effect; energy alone isn't a confirmed feat.
          </div>
          <button className="calc-copy-btn" onClick={copyFeat}>{copied ? "Copied!" : "Copy as feat"}</button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   2. SPEED CONVERTER
   ============================================================ */
function SpeedConverter() {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("mph");
  const [copied, setCopied] = useState(false);

  function toMs(val, u) {
    const v = parseFloat(val);
    if (isNaN(v)) return null;
    switch (u) {
      case "m/s": return v; case "km/h": return v / 3.6;
      case "mph": return v * 0.44704; case "mach": return v * 343;
      case "c": return v * 299792458; default: return v;
    }
  }
  const ms = toMs(value, unit);
  const conversions = ms !== null ? {
    "m/s": ms, "km/h": ms * 3.6, "mph": ms / 0.44704,
    "Mach": ms / 343, "% light speed": (ms / 299792458) * 100,
  } : null;

  function fmt(n) {
    if (n === null) return "—";
    if (n < 0.001) return n.toExponential(2);
    if (n < 1) return n.toFixed(4);
    if (n > 1e6) return n.toExponential(2);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  const featText = conversions
    ? `Moves at ${value} ${unit} (${fmt(conversions["mph"])} mph / Mach ${fmt(conversions["Mach"])} / ${fmt(conversions["% light speed"])}% light speed).`
    : "";
  function copyFeat() {
    if (!featText) return;
    navigator.clipboard.writeText(featText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="calc-card">
      <h3 className="calc-title">Speed Converter</h3>
      <p className="calc-desc">Translate any speed into every scale, from mph to fractions of light speed.</p>
      <div className="calc-row">
        <label className="calc-label">Speed</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={unit} onChange={e => setUnit(e.target.value)}>
            <option value="m/s">m/s</option><option value="km/h">km/h</option><option value="mph">mph</option><option value="mach">Mach</option><option value="c">× light speed</option>
          </select>
        </div>
      </div>
      {conversions && (
        <div className="calc-conversions">
          {Object.entries(conversions).map(([label, val]) => (
            <div key={label} className="conversion-row">
              <span className="conversion-label">{label}</span>
              <span className="conversion-value">{fmt(val)}</span>
            </div>
          ))}
          <button className="calc-copy-btn" onClick={copyFeat}>{copied ? "Copied!" : "Copy as feat"}</button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   3. FEAT -> SPEED
   ============================================================ */
function FeatToSpeed() {
  const [dist, setDist] = useState("");
  const [distUnit, setDistUnit] = useState("m");
  const [time, setTime] = useState("");
  const [timeUnit, setTimeUnit] = useState("s");
  const [copied, setCopied] = useState(false);

  function distToM(val, unit) {
    const v = parseFloat(val);
    if (isNaN(v)) return null;
    switch (unit) {
      case "m": return v; case "km": return v * 1000;
      case "ft": return v * 0.3048; case "mi": return v * 1609.34;
      default: return v;
    }
  }
  function timeToS(val, unit) {
    const v = parseFloat(val);
    if (isNaN(v)) return null;
    switch (unit) {
      case "s": return v; case "ms": return v / 1000;
      case "min": return v * 60; case "h": return v * 3600;
      default: return v;
    }
  }

  const d = distToM(dist, distUnit);
  const t = timeToS(time, timeUnit);
  const speedMs = (d !== null && t !== null && t > 0) ? d / t : null;

  function fmt(n) {
    if (n === null) return "—";
    if (n < 1) return n.toFixed(4);
    if (n > 1e6) return n.toExponential(2);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  function describeSpeed(ms) {
    if (ms === null) return "";
    const mph = ms / 0.44704;
    const mach = ms / 343;
    const pctC = (ms / 299792458) * 100;
    if (pctC >= 100) return "faster than light (beyond physics)";
    if (pctC >= 10) return "relativistic (a real fraction of light speed)";
    if (pctC >= 1) return "sub-relativistic, almost incomprehensibly fast";
    if (mach >= 5) return `hypersonic (Mach ${mach.toFixed(1)}), like a re-entering spacecraft`;
    if (mach >= 1) return `supersonic (Mach ${mach.toFixed(1)}), like a fighter jet breaking the sound barrier`;
    if (mph >= 150) return "like a Formula 1 car at top speed";
    if (mph >= 70) return "like a car speeding down the highway";
    if (mph >= 25) return "like a pro cyclist sprinting";
    if (mph >= 12) return "like an Olympic sprinter (Usain Bolt tops ~27 mph)";
    if (mph >= 6) return "like a person on a steady run";
    if (mph >= 4) return "like a light jog or someone pacing a marathon";
    if (mph >= 2) return "like a brisk walk";
    if (mph > 0) return "like a slow, casual stroll";
    return "not moving";
  }

  const featText = speedMs !== null
    ? `Covered ${dist}${distUnit} in ${time}${timeUnit}: a speed of ${fmt(speedMs)} m/s (${fmt(speedMs / 0.44704)} mph, Mach ${fmt(speedMs / 343)}), ${describeSpeed(speedMs)}.`
    : "";
  function copyFeat() {
    if (!featText) return;
    navigator.clipboard.writeText(featText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="calc-card">
      <h3 className="calc-title">Feat → Speed</h3>
      <p className="calc-desc">"Crossed X distance in Y time." The most common way to calc a character's real speed from a feat.</p>
      <div className="calc-row">
        <label className="calc-label">Distance</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={dist} onChange={e => setDist(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={distUnit} onChange={e => setDistUnit(e.target.value)}>
            <option value="m">m</option><option value="km">km</option><option value="ft">ft</option><option value="mi">mi</option>
          </select>
        </div>
      </div>
      <div className="calc-row">
        <label className="calc-label">Time</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={time} onChange={e => setTime(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={timeUnit} onChange={e => setTimeUnit(e.target.value)}>
            <option value="s">sec</option><option value="ms">ms</option><option value="min">min</option><option value="h">hr</option>
          </select>
        </div>
      </div>
      {speedMs !== null && (
        <div className="calc-result">
          <div className="calc-result-main">{fmt(speedMs)} m/s</div>
          <div className="calc-result-sub">{fmt(speedMs / 0.44704)} mph · Mach {fmt(speedMs / 343)}<br/>{describeSpeed(speedMs)}</div>
          <button className="calc-copy-btn" onClick={copyFeat}>{copied ? "Copied!" : "Copy as feat"}</button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   4. LIFTING STRENGTH
   ============================================================ */
function LiftingStrength() {
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState("kg");
  const [copied, setCopied] = useState(false);

  function toKg(val, u) {
    const v = parseFloat(val);
    if (isNaN(v)) return null;
    switch (u) {
      case "kg": return v; case "lb": return v * 0.453592;
      case "ton": return v * 1000; case "kiloton": return v * 1e6;
      default: return v;
    }
  }
  const kg = toKg(weight, unit);
  const newtons = kg !== null ? kg * 9.81 : null;

  function compare(kg) {
    if (kg === null) return "";
    if (kg < 50) return "a heavy bag of groceries";
    if (kg < 150) return "a strong human's deadlift";
    if (kg < 500) return "a grand piano";
    if (kg < 2000) return "a small car";
    if (kg < 10000) return "a delivery truck";
    if (kg < 50000) return "a city bus";
    if (kg < 200000) return "a loaded semi-trailer convoy";
    if (kg < 1e6) return "a commercial airliner";
    if (kg < 1e7) return "a large building";
    if (kg < 1e8) return "a cruise ship";
    if (kg < 1e9) return "a skyscraper";
    if (kg < 1e11) return "a small mountain";
    if (kg < 1e15) return "a mountain range";
    if (kg < 1e18) return "a small moon";
    return "planetary mass (class-defying)";
  }
  function fmtKg(n) {
    if (n === null) return "—";
    if (n < 1000) return `${n.toFixed(1)} kg`;
    if (n < 1e6) return `${(n / 1000).toFixed(2)} tons`;
    if (n < 1e9) return `${(n / 1e6).toFixed(2)} kilotons`;
    return `${n.toExponential(2)} kg`;
  }

  const featText = kg !== null
    ? `Lifts ${fmtKg(kg)} (${newtons.toExponential(2)} N of force), comparable to ${compare(kg)}.`
    : "";
  function copyFeat() {
    if (!featText) return;
    navigator.clipboard.writeText(featText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="calc-card">
      <h3 className="calc-title">Lifting Strength</h3>
      <p className="calc-desc">"Lifted X tons." Convert a raw lifting feat into force and a real-world comparison.</p>
      <div className="calc-row">
        <label className="calc-label">Weight Lifted</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={unit} onChange={e => setUnit(e.target.value)}>
            <option value="kg">kg</option><option value="lb">lb</option><option value="ton">tons</option><option value="kiloton">kilotons</option>
          </select>
        </div>
      </div>
      {kg !== null && (
        <div className="calc-result">
          <div className="calc-result-main">{fmtKg(kg)}</div>
          <div className="calc-result-sub">{newtons.toExponential(2)} N · like lifting {compare(kg)}</div>
          <button className="calc-copy-btn" onClick={copyFeat}>{copied ? "Copied!" : "Copy as feat"}</button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   5. REACTION TIME
   ============================================================ */
function ReactionTime() {
  const [dist, setDist] = useState("");
  const [distUnit, setDistUnit] = useState("m");
  const [projSpeed, setProjSpeed] = useState("");
  const [speedUnit, setSpeedUnit] = useState("m/s");
  const [copied, setCopied] = useState(false);

  function distToM(val, unit) {
    const v = parseFloat(val);
    if (isNaN(v)) return null;
    switch (unit) {
      case "m": return v; case "km": return v * 1000;
      case "ft": return v * 0.3048; default: return v;
    }
  }
  function speedToMs(val, unit) {
    const v = parseFloat(val);
    if (isNaN(v)) return null;
    switch (unit) {
      case "m/s": return v; case "km/h": return v / 3.6;
      case "mph": return v * 0.44704; case "mach": return v * 343;
      default: return v;
    }
  }

  const d = distToM(dist, distUnit);
  const sp = speedToMs(projSpeed, speedUnit);
  const reactionS = (d !== null && sp !== null && sp > 0) ? d / sp : null;

  function fmtTime(s) {
    if (s === null) return "—";
    if (s < 1e-6) return `${(s * 1e9).toFixed(2)} nanoseconds`;
    if (s < 1e-3) return `${(s * 1e6).toFixed(2)} microseconds`;
    if (s < 1) return `${(s * 1000).toFixed(2)} milliseconds`;
    return `${s.toFixed(3)} seconds`;
  }
  function describeReaction(s) {
    if (s === null) return "";
    if (s < 1e-6) return "superhuman, far beyond biological possibility";
    if (s < 1e-3) return "vastly superhuman reaction";
    if (s < 0.05) return "well beyond human (humans react in ~0.25s)";
    if (s < 0.25) return "peak-human to enhanced reaction";
    return "within normal human range";
  }

  const featText = reactionS !== null
    ? `Reacted to a projectile from ${dist}${distUnit} away traveling ${projSpeed} ${speedUnit}: a reaction time of ${fmtTime(reactionS)} (${describeReaction(reactionS)}).`
    : "";
  function copyFeat() {
    if (!featText) return;
    navigator.clipboard.writeText(featText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="calc-card">
      <h3 className="calc-title">Reaction Time</h3>
      <p className="calc-desc">"Dodged a bullet from X away." Calculate implied reaction speed from a dodge or block feat.</p>
      <div className="calc-row">
        <label className="calc-label">Distance to Projectile</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={dist} onChange={e => setDist(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={distUnit} onChange={e => setDistUnit(e.target.value)}>
            <option value="m">m</option><option value="km">km</option><option value="ft">ft</option>
          </select>
        </div>
      </div>
      <div className="calc-row">
        <label className="calc-label">Projectile Speed</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={projSpeed} onChange={e => setProjSpeed(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={speedUnit} onChange={e => setSpeedUnit(e.target.value)}>
            <option value="m/s">m/s</option><option value="km/h">km/h</option><option value="mph">mph</option><option value="mach">Mach</option>
          </select>
        </div>
      </div>
      {reactionS !== null && (
        <div className="calc-result">
          <div className="calc-result-main">{fmtTime(reactionS)}</div>
          <div className="calc-result-sub">{describeReaction(reactionS)}</div>
          <button className="calc-copy-btn" onClick={copyFeat}>{copied ? "Copied!" : "Copy as feat"}</button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   6. DURABILITY (TANKING)
   ============================================================ */
function Durability() {
  const [val, setVal] = useState("");
  const [unit, setUnit] = useState("J");
  const [copied, setCopied] = useState(false);

  function toJoules(v, u) {
    const n = parseFloat(v);
    if (isNaN(n)) return null;
    switch (u) {
      case "J": return n;
      case "kJ": return n * 1e3;
      case "MJ": return n * 1e6;
      case "GJ": return n * 1e9;
      case "tons_tnt": return n * 4.184e9;
      case "kt_tnt": return n * 4.184e12;
      case "mt_tnt": return n * 4.184e15;
      default: return n;
    }
  }

  const joules = toJoules(val, unit);
  function tierOf(j) {
    if (j == null) return "";
    if (j < 1e3) return "Below Wall level";
    if (j < 1e6) return "Wall level";
    if (j < 1e9) return "Building level";
    if (j < 1e12) return "City Block level";
    if (j < 1e16) return "City level";
    if (j < 1e20) return "Island level";
    if (j < 1e24) return "Country level";
    if (j < 1e28) return "Continent level";
    if (j < 1e32) return "Moon level";
    if (j < 1e44) return "Planet level";
    if (j < 1e48) return "Star level";
    return "Solar System level or beyond";
  }
  function fmtJ(j) {
    if (j == null) return "—";
    if (j < 1000) return `${j.toFixed(1)} J`;
    if (j < 1e6) return `${(j / 1000).toFixed(2)} kJ`;
    if (j < 1e9) return `${(j / 1e6).toFixed(2)} MJ`;
    if (j < 1e12) return `${(j / 1e9).toFixed(2)} GJ`;
    return `${j.toExponential(2)} J`;
  }

  const tier = joules != null ? tierOf(joules) : "";
  const featText = joules != null
    ? `Survived/tanked an attack of ${fmtJ(joules)}: a durability feat at ${tier}. (Assumes the character took the hit and kept fighting; survival of the full energy is what's being scaled.)`
    : "";
  function copyFeat() {
    if (!featText) return;
    navigator.clipboard.writeText(featText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="calc-card">
      <h3 className="calc-title">Durability</h3>
      <p className="calc-desc">"Tanked an X-level attack and kept going." Turn an attack a character survived into a durability tier.</p>
      <div className="calc-row">
        <label className="calc-label">Energy Survived</label>
        <div className="calc-input-group">
          <input className="calc-input" type="number" value={val} onChange={e => setVal(e.target.value)} placeholder="0" />
          <select className="calc-unit" value={unit} onChange={e => setUnit(e.target.value)}>
            <option value="J">J</option>
            <option value="kJ">kJ</option>
            <option value="MJ">MJ</option>
            <option value="GJ">GJ</option>
            <option value="tons_tnt">tons TNT</option>
            <option value="kt_tnt">kilotons TNT</option>
            <option value="mt_tnt">megatons TNT</option>
          </select>
        </div>
      </div>
      {joules != null && (
        <div className="calc-result">
          <div className="calc-result-main">{tier}</div>
          <div className="calc-result-sub">Withstood ≈ {fmtJ(joules)}</div>
          <div className="calc-disclaimer">
            Durability scaling assumes the character took the full hit and survived. It doesn't
            account for dodging, blocking, intangibility, or regeneration; those are separate from raw toughness.
          </div>
          <button className="calc-copy-btn" onClick={copyFeat}>{copied ? "Copied!" : "Copy as feat"}</button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   7. IMAGE FEAT SCALER  (the big interactive one)
   ============================================================ */
const DESTRUCTION = [
  { label: "Fragmentation", jcc: 8, jm3: 8e6, hint: "cracked / broken apart" },
  { label: "Violent Fragmentation", jcc: 69, jm3: 6.9e7, hint: "shattered with force" },
  { label: "Pulverization", jcc: 214, jm3: 2.14e8, hint: "reduced to dust / powder" },
  { label: "Vaporization (rock)", jcc: 25700, jm3: 2.57e10, hint: "turned to vapor" },
];

const SHAPES = [
  { key: "cone", label: "Cone (dust cloud / plume)", needs: ["D", "H"] },
  { key: "cylinder", label: "Cylinder (column / pillar)", needs: ["D", "H"] },
  { key: "hemisphere", label: "Hemisphere (dome blast)", needs: ["D"] },
  { key: "sphere", label: "Sphere (fireball)", needs: ["D"] },
  { key: "crater", label: "Crater (half-ellipsoid)", needs: ["D", "P"] },
];

// Pure line-drawing helper for the canvas
function drawLineOnCtx(ctx, line, color, label) {
  const { x1, y1, x2, y2 } = line;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = color;
  [[x1, y1], [x2, y2]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    ctx.font = "bold 15px Inter, sans-serif";
    const w = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(mx + 8, my - 22, w + 12, 22);
    ctx.fillStyle = color;
    ctx.fillText(label, mx + 14, my - 6);
  }
}

function lengthToMeters(val, unit) {
  const v = parseFloat(val);
  if (isNaN(v)) return null;
  switch (unit) {
    case "m": return v; case "km": return v * 1000;
    case "ft": return v * 0.3048; case "mi": return v * 1609.34;
    default: return v;
  }
}

function fmtLen(m) {
  if (m == null || isNaN(m)) return "—";
  if (m >= 1000) return `${(m / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km`;
  return `${m.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`;
}

function ImageFeatScaler() {
  const [imgSrc, setImgSrc] = useState(null);
  const [loadedTick, setLoadedTick] = useState(0);
  const [mode, setMode] = useState("reference"); // 'reference' | 'measure'

  const [referenceLine, setReferenceLine] = useState(null);
  const [referenceLength, setReferenceLength] = useState("");
  const [refUnit, setRefUnit] = useState("m");
  const [measureLines, setMeasureLines] = useState([]);
  const [overrides, setOverrides] = useState({}); // { [index]: "meters string" } — manual distance override

  // live drawing state
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState(null);
  const [current, setCurrent] = useState(null);

  // energy section
  const [shapeKey, setShapeKey] = useState("cone");
  const [dimD, setDimD] = useState("");
  const [dimH, setDimH] = useState("");
  const [dimP, setDimP] = useState("");
  const [destrIdx, setDestrIdx] = useState(2); // default pulverization
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load image whenever src changes
  useEffect(() => {
    if (!imgSrc) { imgRef.current = null; return; }
    const im = new Image();
    im.onload = () => { imgRef.current = im; setLoadedTick(t => t + 1); };
    im.src = imgSrc;
  }, [imgSrc]);

  // Size the canvas to fit the loaded image
  useEffect(() => {
    const c = canvasRef.current;
    const im = imgRef.current;
    if (!c || !im) return;
    const maxW = 900;
    const scale = Math.min(1, maxW / im.naturalWidth);
    c.width = Math.round(im.naturalWidth * scale);
    c.height = Math.round(im.naturalHeight * scale);
  }, [loadedTick]);

  // Redraw everything whenever anything visual changes
  useEffect(() => {
    const c = canvasRef.current;
    const im = imgRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    if (im) ctx.drawImage(im, 0, 0, c.width, c.height);
    if (referenceLine) {
      const lbl = referenceLength ? `REF: ${referenceLength}${refUnit}` : "REF";
      drawLineOnCtx(ctx, referenceLine, "#00e5ff", lbl);
    }
    measureLines.forEach((ln, i) => drawLineOnCtx(ctx, ln, "#39d353", `M${i + 1}`));
    if (drawing && start && current) {
      drawLineOnCtx(ctx, { x1: start.x, y1: start.y, x2: current.x, y2: current.y },
        mode === "reference" ? "#00e5ff" : "#39d353", null);
    }
  }, [loadedTick, referenceLine, referenceLength, refUnit, measureLines, drawing, start, current, mode]);

  function getCoords(e) {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const sx = c.width / rect.width;
    const sy = c.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function handlePointerDown(e) {
    if (!imgRef.current) return;
    e.preventDefault();
    const p = getCoords(e);
    setStart(p); setCurrent(p); setDrawing(true);
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function handlePointerMove(e) {
    if (!drawing) return;
    e.preventDefault();
    setCurrent(getCoords(e));
  }
  function handlePointerUp(e) {
    if (!drawing) return;
    e.preventDefault();
    const end = getCoords(e);
    const s = start;
    setDrawing(false);
    if (!s) { setStart(null); setCurrent(null); return; }
    const len = Math.hypot(end.x - s.x, end.y - s.y);
    if (len < 4) { setStart(null); setCurrent(null); return; }
    const line = { x1: s.x, y1: s.y, x2: end.x, y2: end.y };
    if (mode === "reference") setReferenceLine(line);
    else setMeasureLines(prev => [...prev, line]);
    setStart(null); setCurrent(null);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert("Image too large. Max 8MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      // reset everything for the new image
      setReferenceLine(null);
      setMeasureLines([]);
      setOverrides({});
      setReferenceLength("");
      setMode("reference");
      setDimD(""); setDimH(""); setDimP("");
      setImgSrc(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  function resetImage() {
    setImgSrc(null);
    imgRef.current = null;
    setReferenceLine(null);
    setMeasureLines([]);
    setOverrides({});
    setReferenceLength("");
    setMode("reference");
    setDimD(""); setDimH(""); setDimP("");
  }

  function undoLast() {
    // Undo the most recent thing: a measurement first (if any), otherwise the reference line.
    if (measureLines.length > 0) {
      const lastIdx = measureLines.length - 1;
      setMeasureLines(prev => prev.slice(0, -1));
      setOverrides(prev => { const n = { ...prev }; delete n[lastIdx]; return n; });
    } else if (referenceLine) {
      setReferenceLine(null);
    }
  }

  function deleteMeasurement(index) {
    setMeasureLines(prev => prev.filter((_, i) => i !== index));
    // Reindex overrides so they stay attached to the right lines after removal.
    setOverrides(prev => {
      const next = {};
      Object.keys(prev).forEach(k => {
        const ki = Number(k);
        if (ki < index) next[ki] = prev[k];
        else if (ki > index) next[ki - 1] = prev[k];
        // ki === index is dropped
      });
      return next;
    });
  }

  function setOverride(index, value) {
    setOverrides(prev => {
      const next = { ...prev };
      if (value === "" || value == null) delete next[index];
      else next[index] = value;
      return next;
    });
  }

  // Ctrl+Z / Cmd+Z to undo the last drawn line (only while an image is loaded)
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        if (!imgRef.current) return;
        // don't hijack undo while typing in an input/textarea
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
        e.preventDefault();
        if (measureLines.length > 0) {
          const lastIdx = measureLines.length - 1;
          setMeasureLines(prev => prev.slice(0, -1));
          setOverrides(prev => { const n = { ...prev }; delete n[lastIdx]; return n; });
        } else if (referenceLine) {
          setReferenceLine(null);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [measureLines, referenceLine]);

  // ---- derived scaling ----
  const refLenM = lengthToMeters(referenceLength, refUnit);
  const refPx = referenceLine
    ? Math.hypot(referenceLine.x2 - referenceLine.x1, referenceLine.y2 - referenceLine.y1)
    : null;
  const metersPerPixel = (refLenM && refPx) ? refLenM / refPx : null;

  const measurements = measureLines.map((ln, i) => {
    // A manual override (in meters) always wins over the pixel-derived value.
    const ov = parseFloat(overrides[i]);
    if (!isNaN(ov)) return ov;
    const px = Math.hypot(ln.x2 - ln.x1, ln.y2 - ln.y1);
    return metersPerPixel ? px * metersPerPixel : null;
  });

  // ---- energy ----
  const shape = SHAPES.find(s => s.key === shapeKey);
  const D = parseFloat(dimD);
  const H = parseFloat(dimH);
  const P = parseFloat(dimP);

  function computeVolume() {
    const r = (!isNaN(D)) ? D / 2 : null;
    switch (shapeKey) {
      case "sphere": return (r != null) ? (4 / 3) * Math.PI * r ** 3 : null;
      case "hemisphere": return (r != null) ? (2 / 3) * Math.PI * r ** 3 : null;
      case "cylinder": return (r != null && !isNaN(H)) ? Math.PI * r ** 2 * H : null;
      case "cone": return (r != null && !isNaN(H)) ? (1 / 3) * Math.PI * r ** 2 * H : null;
      case "crater": return (r != null && !isNaN(P)) ? (2 / 3) * Math.PI * r ** 2 * P : null;
      default: return null;
    }
  }
  const volume = computeVolume();
  const destruction = DESTRUCTION[destrIdx];
  const energy = (volume != null && volume > 0) ? volume * destruction.jm3 : null;
  const tier = energy != null ? classifyTier(energy) : "";

  function fmtVol(v) {
    if (v == null) return "—";
    if (v < 1e6) return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³`;
    return `${v.toExponential(2)} m³`;
  }

  const dimsText = [
    !isNaN(D) ? `${fmtLen(D)} across` : null,
    (shape.needs.includes("H") && !isNaN(H)) ? `${fmtLen(H)} tall` : null,
    (shape.needs.includes("P") && !isNaN(P)) ? `${fmtLen(P)} deep` : null,
  ].filter(Boolean).join(", ");

  const featText = energy != null
    ? `Feat scaled from imagery: assuming a ${shape.label.split("(")[0].trim().toLowerCase()} roughly ${dimsText}, the affected volume is ~${fmtVol(volume)}. At ${destruction.label} (${destruction.jcc} J/cc), that is ~${fmtJoulesShared(energy)} of energy: ${tier}. (Scaling estimate; assumes idealized geometry and uniform material.)`
    : "";
  function copyFeat() {
    if (!featText) return;
    navigator.clipboard.writeText(featText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="calc-card calc-card-wide scaler-card">
      <h3 className="calc-title">Image Feat Scaler</h3>
      <p className="calc-desc">
        Upload a feat image, draw a line over something of known size to set the scale, then measure
        the explosion, crater, or blast. The tool converts pixels → real meters → volume → energy → tier.
        Your image stays in your browser; it is never uploaded to a server.
      </p>

      <ol className="scaler-steps">
        <li><strong>Upload</strong> a screenshot or panel of the feat.</li>
        <li><strong>Set Reference:</strong> draw a line over something of known size (a person ≈ 1.8 m, a door ≈ 2 m) and type its real length.</li>
        <li><strong>Measure:</strong> draw lines on the feat itself (height, diameter, depth).</li>
        <li><strong>Scale it:</strong> pick a shape + material to get the energy.</li>
      </ol>

      <div className="scaler-warning">
        <strong>⚠ Same-distance rule:</strong> your reference object and the feat must sit at roughly
        the same distance from the camera. Scaling a nearby object against a faraway one (like a
        person standing in front of a distant mountain) gives wildly wrong results because of
        perspective. For accurate feats, use a reference that's right next to (or inside) what you're measuring.
      </div>

      {!imgSrc && (
        <div className="scaler-dropzone" onClick={() => fileInputRef.current?.click()}>
          <div className="dropzone-icon">⬆</div>
          <div className="dropzone-text">Click to upload a feat image</div>
          <div className="dropzone-sub">PNG, JPG, WEBP · max 8MB · stays on your device</div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                 onChange={handleFile} style={{ display: "none" }} />
        </div>
      )}

      {imgSrc && (
        <>
          <div className="scaler-toolbar">
            <div className="scaler-mode-group">
              <button
                className={`scaler-mode-btn ${mode === "reference" ? "active" : ""}`}
                onClick={() => setMode("reference")}
              >
                1 · Set Reference
              </button>
              <button
                className={`scaler-mode-btn ${mode === "measure" ? "active" : ""}`}
                onClick={() => setMode("measure")}
              >
                2 · Measure
              </button>
            </div>
            <div className="scaler-actions">
              <button className="scaler-btn" onClick={undoLast} title="Undo last line (Ctrl+Z)">↶ Undo last</button>
              <button className="scaler-btn" onClick={resetImage}>New image</button>
            </div>
          </div>

          <div className="scaler-hint-bar">
            {mode === "reference"
              ? "Draw a line over something of known real-world size, then enter that size below."
              : "Draw lines on the feat you want to measure. Each line becomes a measurement."}
          </div>

          <div className="scaler-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="scaler-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </div>

          <div className="scaler-ref-row">
            <label className="calc-label">Reference real length</label>
            <div className="calc-input-group">
              <input
                className="calc-input"
                type="number"
                value={referenceLength}
                onChange={e => setReferenceLength(e.target.value)}
                placeholder="e.g. 1.8"
              />
              <select className="calc-unit" value={refUnit} onChange={e => setRefUnit(e.target.value)}>
                <option value="m">m</option><option value="km">km</option>
                <option value="ft">ft</option><option value="mi">mi</option>
              </select>
            </div>
            <div className="scaler-scale-status">
              {referenceLine
                ? (metersPerPixel
                    ? `Scale set: 1 pixel ≈ ${metersPerPixel.toLocaleString(undefined, { maximumFractionDigits: 3 })} m`
                    : "Reference line drawn. Now enter its real length above.")
                : "No reference line yet. Switch to \"Set Reference\" and draw one."}
            </div>
          </div>

          {measureLines.length > 0 && (
            <div className="measure-chips">
              {measureLines.map((ln, i) => {
                const hasValue = measurements[i] != null;
                const isOverridden = !isNaN(parseFloat(overrides[i]));
                return (
                  <div key={i} className="measure-chip">
                    <div className="chip-top">
                      <span className="chip-name">M{i + 1}</span>
                      <span className="chip-value">
                        {hasValue ? fmtLen(measurements[i]) : "set reference or type a value"}
                        {isOverridden && <span className="chip-manual-tag">manual</span>}
                      </span>
                      {hasValue && (
                        <span className="chip-assign">
                          {shape.needs.includes("D") &&
                            <button onClick={() => setDimD(String(Math.round(measurements[i] * 100) / 100))}>→ Diameter</button>}
                          {shape.needs.includes("H") &&
                            <button onClick={() => setDimH(String(Math.round(measurements[i] * 100) / 100))}>→ Height</button>}
                          {shape.needs.includes("P") &&
                            <button onClick={() => setDimP(String(Math.round(measurements[i] * 100) / 100))}>→ Depth</button>}
                        </span>
                      )}
                      <button
                        className="chip-delete"
                        onClick={() => deleteMeasurement(i)}
                        aria-label={`Delete measurement ${i + 1}`}
                        title="Delete this measurement"
                      >×</button>
                    </div>
                    <div className="chip-override">
                      <span className="chip-override-label">Override (m):</span>
                      <input
                        className="chip-override-input"
                        type="number"
                        value={overrides[i] || ""}
                        onChange={e => setOverride(i, e.target.value)}
                        placeholder={metersPerPixel ? "use measured" : "type real meters"}
                      />
                      {isOverridden && (
                        <button className="chip-override-clear" onClick={() => setOverride(i, "")} title="Clear override, use measured value">↺</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* energy section */}
          <div className="scaler-energy">
            <div className="scaler-energy-title">Scale to Energy</div>
            <p className="scaler-energy-note">
              Fill these in by measuring on the image above (use the <strong>→ Diameter / → Height / → Depth</strong>
              buttons on each measurement), or just type the values directly if you already know the real
              size from a databook, wiki, or stated figure.
            </p>

            <div className="calc-row">
              <label className="calc-label">Feat shape</label>
              <select className="calc-unit calc-unit-full" value={shapeKey} onChange={e => setShapeKey(e.target.value)}>
                {SHAPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            <div className="scaler-dim-grid">
              <div className="calc-row">
                <label className="calc-label">Diameter (m)</label>
                <input className="calc-input" type="number" value={dimD} onChange={e => setDimD(e.target.value)} placeholder="0" />
              </div>
              {shape.needs.includes("H") && (
                <div className="calc-row">
                  <label className="calc-label">Height (m)</label>
                  <input className="calc-input" type="number" value={dimH} onChange={e => setDimH(e.target.value)} placeholder="0" />
                </div>
              )}
              {shape.needs.includes("P") && (
                <div className="calc-row">
                  <label className="calc-label">Depth (m)</label>
                  <input className="calc-input" type="number" value={dimP} onChange={e => setDimP(e.target.value)} placeholder="0" />
                </div>
              )}
            </div>

            <div className="calc-row">
              <label className="calc-label">Material / destruction type</label>
              <select className="calc-unit calc-unit-full" value={destrIdx} onChange={e => setDestrIdx(Number(e.target.value))}>
                {DESTRUCTION.map((d, i) => (
                  <option key={i} value={i}>{d.label} ({d.jcc} J/cc): {d.hint}</option>
                ))}
              </select>
            </div>

            {energy != null && (
              <div className="calc-result">
                <div className="calc-result-main">{fmtJoulesShared(energy)}</div>
                <div className="calc-result-sub">
                  Volume ≈ {fmtVol(volume)} · <strong>{tier}</strong>
                </div>
                <div className="calc-disclaimer">
                  Scaling estimate only. Assumes idealized geometry and uniform material, and measures
                  demonstrated energy, not durability, delivery, or hax. Reference accuracy decides everything.
                </div>
                <button className="calc-copy-btn" onClick={copyFeat}>{copied ? "Copied!" : "Copy as feat"}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   ENERGY TIER REFERENCE CHART
   ============================================================ */
const ENERGY_TIERS = [
  { tier: "Wall level", range: "10³ – 10⁵ J", example: "Shattering concrete, breaking through a wall" },
  { tier: "Building level", range: "10⁶ – 10⁸ J", example: "Destroying a house or small building" },
  { tier: "City block level", range: "10⁹ – 10¹¹ J", example: "Leveling a city block" },
  { tier: "City level", range: "10¹² – 10¹⁵ J", example: "Destroying a large city" },
  { tier: "Island level", range: "10¹⁶ – 10¹⁹ J", example: "Sinking or destroying an island" },
  { tier: "Country level", range: "10²⁰ – 10²³ J", example: "Devastating a whole country" },
  { tier: "Continent level", range: "10²⁴ – 10²⁷ J", example: "Wrecking a continent" },
  { tier: "Moon level", range: "10²⁸ – 10²⁹ J", example: "Destroying a moon" },
  { tier: "Planet level", range: "10³² J+", example: "Destroying an Earth-sized planet" },
  { tier: "Star level", range: "10⁴⁴ J+", example: "Blowing up a sun" },
  { tier: "Solar System level", range: "10⁴⁸ J+", example: "Destroying an entire star system" },
];

function EnergyTierChart() {
  return (
    <div className="calc-card calc-card-wide">
      <h3 className="calc-title">Energy Tier Reference</h3>
      <p className="calc-desc">
        Got an energy number from any tool above? Find which destruction tier it lands in.
        We compare the <em>physical result</em> of a feat, not the type of energy (ki, cursed energy, chakra all count the same here).
      </p>
      <div className="tier-table">
        <div className="tier-header">
          <span>Tier</span>
          <span>Energy Range</span>
          <span>Example Feat</span>
        </div>
        {ENERGY_TIERS.map((t, i) => (
          <div key={i} className="tier-row">
            <span className="tier-name">{t.tier}</span>
            <span className="tier-range">{t.range}</span>
            <span className="tier-example">{t.example}</span>
          </div>
        ))}
      </div>
      <div className="calc-disclaimer">
        These tiers measure demonstrated energy output, not whether a character can survive,
        deliver, or bypass durability. Hax (reality warping, soul attacks, etc.) sit outside raw energy entirely.
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Tools({ onBack }) {
  return (
    <div className="tools-page">
      <nav className="navbar">
        <a className="logo" href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
          VERSUS<span> ARENA</span>
        </a>
        <ul className="nav-links">
          <li><a href="#" className="nav-back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>Back to the Arena</a></li>
        </ul>
      </nav>

      <div className="tools-container">
        <div className="about-tag">Powerscaling Tools</div>
        <h1 className="about-title">The <span className="vs-word">Lab</span></h1>
        <p className="tools-intro">
          Real physics for real debates. Calculate striking power, speed, strength, and reaction time
          from a character's feats, or scale a feat straight from an image, then copy any result
          into your battle as a custom feat.
        </p>

        <div className="calc-grid">
          <KineticEnergyCalc />
          <SpeedConverter />
          <FeatToSpeed />
          <LiftingStrength />
          <ReactionTime />
          <Durability />
        </div>

        <div className="tools-note">
          <strong>Why this matters:</strong> A character like the Flash may be physically average,
          but kinetic energy scales with the <em>square</em> of velocity. At Mach 20, even a 70kg body
          carries the energy of a bomb. Speed IS strength, but remember, raw energy is only part of
          the picture. Whether a character can <em>survive</em> their own output, deliver it, and
          actually damage a target is what separates a number on paper from a real feat.
        </div>

        <ImageFeatScaler />

        <EnergyTierChart />
      </div>
    </div>
  );
}