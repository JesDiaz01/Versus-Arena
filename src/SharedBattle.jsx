import { useState } from "react";
import { highlightClaims } from "./highlightClaims";
import { verdictDiffLabel } from "./diffTier";
import "./SharedBattle.css";

// Same invite as the site footer (Footer.jsx). Reused as the identical string
// here rather than a shared import so the footer itself stays untouched.
const DISCORD_URL = "https://discord.gg/vpdswhYcpd";

// battleId is the share id of the battle being viewed. It is passed down from App
// (which knows it from the ?b= URL param or from the My Battles row that was opened)
// because GET /api/get-battle returns only { battle_data, result } and not the id
// itself, so this component cannot derive the share link from `battle` alone.
export default function SharedBattle({ battle, battleId, onBackToArena }) {
  const bd = battle.battle_data || {};
  const result = battle.result || {};
  const [copied, setCopied] = useState(false);

  // Copy this battle's public link. Mirrors BattleArena's share button so the two
  // behave identically (same URL shape, same 2s "copied" confirmation).
  function shareBattle() {
    if (!battleId) return;
    const url = window.location.origin + "/?b=" + encodeURIComponent(battleId);
    navigator.clipboard.writeText(url).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    }).catch(function() {});
  }

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
  const diffLabel = verdictDiffLabel(result);

  const settings = [battleType, location, power, depth].filter(Boolean);

  return (
    <div className="sb-page">
      <div className="sb-card">

        {/* -- Header -- */}
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

        {/* -- Matchup -- */}
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

        {/* -- Settings tags -- */}
        {settings.length > 0 && (
          <div className="sb-settings">
            {settings.join(" · ")}
          </div>
        )}

        {/* -- Verdict -- */}
        <div className="sb-verdict">
          <div className="sb-verdict-eyebrow">
            {isDraw ? "VERDICT" : "WINNER"}
          </div>
          <div className="sb-winner">
            {isDraw ? "Draw" : winner}
          </div>
          {diffLabel && <div className="verdict-diff">{diffLabel}</div>}
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

        {/* -- Footer -- */}
        <div className="sb-footer">
          <div className="sb-actions">
            {/* Shown to every viewer, not just the owner: the link is public either
                way, so surfacing it here lets anyone pass the battle along. */}
            {battleId && (
              <button className="sb-share-btn" onClick={shareBattle}>
                {copied ? "Link Copied!" : "Share Battle"}
              </button>
            )}
            <button className="sb-back-btn" onClick={onBackToArena}>
              Back to the Arena
            </button>
          </div>
          <a
            className="sb-discord-link"
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
              <path d="M20.32 4.37A19.79 19.79 0 0016.56 3c-.2.36-.43.85-.59 1.23a18.27 18.27 0 00-5.5 0C10.31 3.85 10.07 3.36 9.87 3a19.74 19.74 0 00-3.76 1.37C2.55 8.06 1.97 11.65 2.27 15.19a19.9 19.9 0 005.99 3.03c.48-.66.91-1.36 1.28-2.1-.7-.27-1.37-.6-2-.98.17-.13.34-.26.5-.4 3.86 1.8 8.04 1.8 11.86 0 .16.14.33.27.5.4-.63.38-1.3.71-2 .98.37.74.8 1.44 1.28 2.1a19.86 19.86 0 005.99-3.03c.36-4.1-.61-7.66-2.55-10.82zM8.84 13.16c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4zm6.32 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4z" />
            </svg>
            Join the Discord
          </a>
        </div>

      </div>
    </div>
  );
}
