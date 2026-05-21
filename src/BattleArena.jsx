import { useState, useEffect } from "react";

const AVATARS = {
  goku: "🐉", superman: "🦸", batman: "🦇", thor: "⚡",
  ironman: "🤖", saitama: "👊", naruto: "🍥", luffy: "🌀",
  spiderman: "🕷", wolverine: "🐺", flash: "💨", hulk: "💚",
  gojo: "🌀", wanda: "🔮", thanos: "💜", ichigo: "⚔️",
};

function getAvatar(name, fallback) {
  const key = name.toLowerCase().replace(/\s/g, "");
  return AVATARS[key] || fallback;
}

export default function Battlearena({ preloaded }) {
  const [f1, setF1] = useState("");
  const [f2, setF2] = useState("");
  const [u1, setU1] = useState("");
  const [u2, setU2] = useState("");
  const [battleType, setBattleType] = useState("Standard Fight");
  const [location, setLocation] = useState("Neutral Terrain");
  const [power, setPower] = useState("Canon Only");
  const [depth, setDepth] = useState("Quick Verdict");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (preloaded) {
      setF1(preloaded.f1);
      setF2(preloaded.f2);
      setU1(preloaded.u1 || "");
      setU2(preloaded.u2 || "");
      setResult(null);
    }
  }, [preloaded]);

  const avatar1 = getAvatar(f1, "⚡");
  const avatar2 = getAvatar(f2, "🔥");

  async function simulate() {
    if (!f1.trim() || !f2.trim()) {
      setError("Please enter both fighter names.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a fictional character battle analyst. Analyze this 1v1 fight based on known feats, powerscaling, and lore.

Fighter 1: ${f1} (${u1 || "unknown universe"})
Fighter 2: ${f2} (${u2 || "unknown universe"})
Battle Type: ${battleType}
Location: ${location}
Power Level: ${power}
Depth: ${depth}

Respond ONLY with a valid JSON object (no markdown, no backticks) with these fields:
{
  "winner": "name of winner or Draw",
  "verdict_short": "one confident sentence summary",
  "analysis": "3-4 sentences citing specific feats, abilities, and reasoning. Be definitive.",
  "advantages": ["up to 3 short labels like Speed Advantage or Higher Durability"],
  "feats_scanned": number between 20 and 80,
  "sources": number between 5 and 20
}`
          }]
        })
      });

      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (e) {
      setError("Analysis failed. Check your connection and try again.");
    }

    setLoading(false);
  }

  function reset() {
    setF1(""); setF2(""); setU1(""); setU2(""); setResult(null); setError("");
  }

  const isWinner1 = result && result.winner.toLowerCase().includes(f1.toLowerCase());
  const isDraw = result && result.winner === "Draw";

  return (
    <div className="arena">
      <div className="arena-card">
        <div className="arena-header">
          <h2>Battle Arena</h2>
          <span className="universe-badge">Any Universe</span>
        </div>

        <div className="fighters-grid">
          {/* FIGHTER 1 */}
          <div className="fighter-slot">
            <div className="fighter-label">Fighter One</div>
            <div className={`fighter-avatar ${result ? (isDraw ? "active" : isWinner1 ? "winner" : "loser") : ""}`}>
              {avatar1}
            </div>
            <input className="fighter-name-input" value={f1} onChange={e => setF1(e.target.value)} placeholder="e.g. Goku" />
            <input className="universe-input" value={u1} onChange={e => setU1(e.target.value)} placeholder="Universe / Series" />
          </div>

          {/* VS */}
          <div className="vs-divider">
            <div className="divider-line" />
            <div className="vs-text">VS</div>
            <div className="divider-line" />
          </div>

          {/* FIGHTER 2 */}
          <div className="fighter-slot right">
            <div className="fighter-label">Fighter Two</div>
            <div className={`fighter-avatar ${result ? (isDraw ? "active" : !isWinner1 ? "winner" : "loser") : ""}`}>
              {avatar2}
            </div>
            <input className="fighter-name-input" value={f2} onChange={e => setF2(e.target.value)} placeholder="e.g. Superman" />
            <input className="universe-input" value={u2} onChange={e => setU2(e.target.value)} placeholder="Universe / Series" />
          </div>
        </div>

        {/* SETTINGS */}
        <div className="fight-settings">
          <div className="setting-group">
            <label className="setting-label">Battle Type</label>
            <select className="setting-select" value={battleType} onChange={e => setBattleType(e.target.value)}>
              <option>Standard Fight</option>
              <option>In-Character</option>
              <option>Out of Character</option>
              <option>Battle of Wits</option>
              <option>Speed Blitz</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label">Location</label>
            <select className="setting-select" value={location} onChange={e => setLocation(e.target.value)}>
              <option>Neutral Terrain</option>
              <option>Urban City</option>
              <option>Space</option>
              <option>Their Home Universe</option>
              <option>Random</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label">Power Level</label>
            <select className="setting-select" value={power} onChange={e => setPower(e.target.value)}>
              <option>Canon Only</option>
              <option>Composite</option>
              <option>Post-Series Peak</option>
              <option>Current</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label">Depth</label>
            <select className="setting-select" value={depth} onChange={e => setDepth(e.target.value)}>
              <option>Quick Verdict</option>
              <option>Detailed Analysis</option>
              <option>Deep Dive</option>
            </select>
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="fight-btn-wrap">
          <button className={`fight-btn ${loading ? "loading" : ""}`} onClick={simulate} disabled={loading}>
            {loading ? "Analyzing..." : "⚔ SIMULATE BATTLE"}
          </button>
        </div>

        {/* RESULT */}
        {result && (
          <div className="result-panel">
            <div className="result-header">
              <span className="winner-crown">{isDraw ? "⚖" : "🏆"}</span>
              <div>
                <div className="result-title">
                  {isDraw ? "It's a Draw!" : `Winner: ${result.winner}`}
                </div>
                <div className="result-subtitle">
                  Analyzed {result.feats_scanned} feats · {result.sources} sources
                </div>
              </div>
            </div>

            <div className="verdict-chips">
              {(result.advantages || []).map((a, i) => (
                <span key={i} className={`chip chip-${i}`}>{a}</span>
              ))}
            </div>

            <p className="result-text">
              <strong className="verdict-short">{result.verdict_short}</strong>
              {result.analysis}
            </p>

            <div className="share-row">
              <button className="rematch-btn" onClick={reset}>↺ New Battle</button>
              <button className="share-btn">Share Result</button>
              <button className="share-btn">Copy Link</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
