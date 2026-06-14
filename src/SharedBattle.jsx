import { highlightClaims } from "./highlightClaims";
import "./SharedBattle.css";

export default function SharedBattle({ battle, onBackToArena }) {
  const bd = battle.battle_data || {};
  const result = battle.result || {};

  const f1 = bd.f1 || "";
  const f2 = bd.f2 || "";
  const u1 = bd.u1 || "";
  const u2 = bd.u2 || "";
  const claims1 = Array.isArray(bd.claims1) ? bd.claims1 : [];
  const claims2 = Array.isArray(bd.claims2) ? bd.claims2 : [];
  const battleType = bd.battleType || "";
  const location = bd.location || "";
  const power = bd.power || "";
  const depth = bd.depth || "";

  const winner = result.winner || "";
  const isDraw = winner === "Draw";
  const verdictShort = result.verdict_short || "";
  const analysis = result.analysis || "";
  const advantages = Array.isArray(result.advantages) ? result.advantages : [];

  const settings = [battleType, location, power, depth].filter(Boolean);

  return (
    <div className="sb-page">
      <div className="sb-card">

        {/* ── Header ── */}
        <header className="sb-header">
          <svg className="sb-v-logo" viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sbVGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5D76E" />
                <stop offset="30%" stopColor="#D4A017" />
                <stop offset="60%" stopColor="#B8860B" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
              <linearGradient id="sbVShine" x1="0%" y1="0%" x2="60%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
              <linearGradient id="sbRimLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C8A84B" />
                <stop offset="50%" stopColor="#8B6914" />
                <stop offset="100%" stopColor="#C8A84B" />
              </linearGradient>
            </defs>
            <path
              d="M20 20 L150 240 L280 20 L240 20 L150 185 L60 20 Z"
              fill="url(#sbRimLight)"
              stroke="#6B5010"
              strokeWidth="2"
            />
            <path
              d="M30 28 L150 232 L270 28 L234 28 L150 196 L66 28 Z"
              fill="url(#sbVGold)"
            />
            <path
              d="M30 28 L150 232 L270 28 L234 28 L150 196 L66 28 Z"
              fill="url(#sbVShine)"
            />
            <line x1="185" y1="80" x2="200" y2="160" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="192" y1="75" x2="205" y2="130" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" strokeLinecap="round" />
          </svg>
          <div className="sb-wordmark">
            <span className="sb-wordmark-text">VERSUS ARENA</span>
          </div>
        </header>

        {/* ── Matchup ── */}
        <div className="sb-matchup">
          <div className="sb-fighter">
            <div className="sb-fighter-name">{f1}</div>
            {u1 && <div className="sb-fighter-universe">{u1}</div>}
            {claims1.length > 0 && (
              <div className="sb-claims">
                <div className="sb-claims-label">Added feats</div>
                <ul className="sb-claims-list">
                  {claims1.map(function(c, i) { return <li key={i}>{c}</li>; })}
                </ul>
              </div>
            )}
          </div>

          <div className="sb-vs">VS</div>

          <div className="sb-fighter">
            <div className="sb-fighter-name">{f2}</div>
            {u2 && <div className="sb-fighter-universe">{u2}</div>}
            {claims2.length > 0 && (
              <div className="sb-claims">
                <div className="sb-claims-label">Added feats</div>
                <ul className="sb-claims-list">
                  {claims2.map(function(c, i) { return <li key={i}>{c}</li>; })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Settings tags ── */}
        {settings.length > 0 && (
          <div className="sb-settings">
            {settings.join(" · ")}
          </div>
        )}

        {/* ── Verdict ── */}
        <div className="sb-verdict">
          <div className="sb-verdict-eyebrow">
            {isDraw ? "VERDICT" : "WINNER"}
          </div>
          <div className="sb-winner">
            {isDraw ? "Draw" : winner}
          </div>
          {advantages.length > 0 && (
            <div className="sb-chips">
              {advantages.map(function(a, i) {
                return <span key={i} className="sb-chip">{a}</span>;
              })}
            </div>
          )}
          {verdictShort && (
            <p className="sb-verdict-short">{verdictShort}</p>
          )}
          {analysis && (
            <p className="sb-analysis">
              {highlightClaims(analysis, [...claims1, ...claims2], [f1, f2])}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="sb-footer">
          <button className="sb-back-btn" onClick={onBackToArena}>
            Back to the Arena
          </button>
        </div>

      </div>
    </div>
  );
}
