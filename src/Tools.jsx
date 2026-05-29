import { useState } from "react";

// ===== KINETIC ENERGY CALCULATOR =====
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
    else if (tntTons < 0.001) return `${(joules / 1e6).toFixed(1)} MJ — large-explosion-level energy`;
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
  function fmtJoules(j) {
    if (j === null) return "—";
    if (j < 1000) return `${j.toFixed(1)} J`;
    if (j < 1e6) return `${(j / 1000).toFixed(2)} kJ`;
    if (j < 1e9) return `${(j / 1e6).toFixed(2)} MJ`;
    if (j < 1e12) return `${(j / 1e9).toFixed(2)} GJ`;
    return `${j.toExponential(2)} J`;
  }

  const featText = ke !== null
    ? `Strikes with ${fmtJoules(ke)} of kinetic energy (mass ${mass}${massUnit} at ${speed} ${speedUnit}) — ${describeEnergy(ke)}. (Raw energy figure; does not account for delivery, durability, or area of effect.)`
    : "";

  function copyFeat() {
    if (!featText) return;
    navigator.clipboard.writeText(featText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="calc-card">
      <h3 className="calc-title">Kinetic Energy</h3>
      <p className="calc-desc">How hard does a character actually hit? Speed matters exponentially — doubling speed quadruples the energy.</p>
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
          <div className="calc-result-main">{fmtJoules(ke)}</div>
          <div className="calc-result-sub">≈ {describeEnergy(ke)}</div>
          <div className="calc-disclaimer">
            Raw kinetic energy only. Real destructive capacity also depends on durability,
            delivery, and area of effect — energy alone isn't a confirmed feat.
          </div>
          <button className="calc-copy-btn" onClick={copyFeat}>{copied ? "Copied!" : "Copy as feat"}</button>
        </div>
      )}
    </div>
  );
}

// ===== SPEED CONVERTER =====
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
      <p className="calc-desc">Translate any speed into every scale — from mph to fractions of light speed.</p>
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

// ===== FEAT → SPEED =====
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
  // Human-relatable comparisons across the whole range
  function describeSpeed(ms) {
    if (ms === null) return "";
    const mph = ms / 0.44704;
    const mach = ms / 343;
    const pctC = (ms / 299792458) * 100;
    if (pctC >= 100) return "faster than light — beyond physics";
    if (pctC >= 10) return "relativistic — a real fraction of light speed";
    if (pctC >= 1) return "sub-relativistic — almost incomprehensibly fast";
    if (mach >= 5) return `hypersonic (Mach ${mach.toFixed(1)}) — like a re-entering spacecraft`;
    if (mach >= 1) return `supersonic (Mach ${mach.toFixed(1)}) — like a fighter jet breaking the sound barrier`;
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
    ? `Covered ${dist}${distUnit} in ${time}${timeUnit} — a speed of ${fmt(speedMs)} m/s (${fmt(speedMs / 0.44704)} mph, Mach ${fmt(speedMs / 343)}), ${describeSpeed(speedMs)}.`
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

// ===== LIFTING STRENGTH =====
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
    if(kg < 15) return "a heavy bag of groceries";
    if (kg < 50) return "a heavy dumbell or bar in the gym";
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
    return "planetary mass — class-defying";
  }
  function fmtKg(n) {
    if (n === null) return "—";
    if (n < 1000) return `${n.toFixed(1)} kg`;
    if (n < 1e6) return `${(n / 1000).toFixed(2)} tons`;
    if (n < 1e9) return `${(n / 1e6).toFixed(2)} kilotons`;
    return `${n.toExponential(2)} kg`;
  }

  const featText = kg !== null
    ? `Lifts ${fmtKg(kg)} (${newtons.toExponential(2)} N of force) — comparable to ${compare(kg)}.`
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

// ===== REACTION TIME =====
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
    if (s < 1e-6) return "superhuman — far beyond biological possibility";
    if (s < 1e-3) return "vastly superhuman reaction";
    if (s < 0.05) return "well beyond human (humans react in ~0.25s)";
    if (s < 0.25) return "peak-human to enhanced reaction";
    return "within normal human range";
  }

  const featText = reactionS !== null
    ? `Reacted to a projectile from ${dist}${distUnit} away traveling ${projSpeed} ${speedUnit} — a reaction time of ${fmtTime(reactionS)} (${describeReaction(reactionS)}).`
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

// ===== ENERGY TIER REFERENCE CHART =====
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
        Got an energy number from the Kinetic Energy tool? Find which destruction tier it lands in.
        We compare the <em>physical result</em> of a feat — not the type of energy (ki, cursed energy, chakra all count the same here).
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

export default function Tools({ onBack }) {
  return (
    <div className="tools-page">
      <nav className="navbar">
        <a className="logo" href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
          VERSUS<span> ARENA</span>
        </a>
        <ul className="nav-links">
          <li><a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Back to Arena</a></li>
        </ul>
      </nav>

      <div className="tools-container">
        <div className="about-tag">Powerscaling Tools</div>
        <h1 className="about-title">The <span className="vs-word">Lab</span></h1>
        <p className="tools-intro">
          Real physics for real debates. Calculate striking power, speed, strength, and reaction time
          from a character's feats — then copy any result straight into your battle as a custom feat.
        </p>

        <div className="calc-grid">
          <KineticEnergyCalc />
          <SpeedConverter />
          <FeatToSpeed />
          <LiftingStrength />
          <ReactionTime />
        </div>

        <EnergyTierChart />

        <div className="tools-note">
          <strong>Why this matters:</strong> A character like the Flash may be physically average,
          but kinetic energy scales with the <em>square</em> of velocity. At Mach 20, even a 70kg body
          carries the energy of a bomb. Speed IS strength — but remember, raw energy is only part of
          the picture. Whether a character can <em>survive</em> their own output, deliver it, and
          actually damage a target is what separates a number on paper from a real feat.
        </div>
      </div>
    </div>
  );
}