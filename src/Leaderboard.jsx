// src/Leaderboard.jsx
// Weekly "Top Matchups" board: the most-fought matchups over the rolling last 7 days,
// read from GET /api/leaderboard (service-role aggregate; the stats tables are RLS-locked
// from the browser). Each row shows both fighters' portraits, resolved the same way the
// arena does -- GET /api/character-image?name=&universe= with a neutral silhouette while
// loading or on a miss. Reuses the About/Privacy page shell (NavBar + about-* classes).

import { useState, useEffect, useRef } from "react";
import NavBar from "./NavBar";
import FighterSilhouette from "./FighterSilhouette";

// One fighter portrait. Names here are static (unlike the live-typed arena inputs), so no
// debounce is needed -- just resolve once on mount, with a single cold-start retry, and
// fall back to the silhouette on any failure. Mirrors the arena's resolve-or-silhouette
// behavior so the board's art matches the rest of the site.
function LbFighter({ name, universe }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!name || name.trim().length < 2) return;
    let cancelled = false;

    async function attempt() {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      try {
        const params = new URLSearchParams({ name: name.trim() });
        if (universe) params.set("universe", universe);
        const res = await fetch(`/api/character-image?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.url ? data.url : null;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    (async () => {
      let u = await attempt();
      if (cancelled) return;
      if (!u) {
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;
        u = await attempt();
        if (cancelled) return;
      }
      setUrl(u);
    })();

    return () => { cancelled = true; };
  }, [name, universe]);

  return (
    <div className="lb-fighter">
      <div className="lb-avatar">
        {url && !failed ? (
          <img
            src={url}
            alt={name}
            className="lb-photo"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        ) : (
          <FighterSilhouette />
        )}
      </div>
      <div className="lb-name">{name}</div>
      {universe && <div className="lb-universe">{universe}</div>}
    </div>
  );
}

export default function Leaderboard({ onNavigate }) {
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "ready"
  const [matchups, setMatchups] = useState([]);
  // Guard against a double-fetch in React 18 StrictMode dev double-mount.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("request failed"))))
      .then((data) => {
        if (cancelled) return;
        setMatchups(Array.isArray(data.matchups) ? data.matchups : []);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="about-page">
      <NavBar onNavigate={onNavigate} active="leaderboard" />

      <div className="about-container">
        <div className="about-tag">The Rankings</div>
        <h1 className="about-title">Trending <span className="vs-word">Matchups</span></h1>

        <style>{`
          .lb-intro { font-family: 'Inter', sans-serif; color: var(--ink-soft); line-height: 1.7; margin: 0 0 28px; }
          .lb-note { font-family: 'Inter', sans-serif; color: var(--ink-soft); line-height: 1.7; }
          .lb-list { list-style: none; margin: 0; padding: 0; }
          .lb-row {
            display: grid;
            grid-template-columns: 2rem 1fr auto 1fr auto;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 1.25rem;
            margin-bottom: 0.75rem;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 6px;
          }
          .lb-row:first-child { border-color: var(--gold); box-shadow: 0 6px 20px rgba(184,134,11,0.14); }
          .lb-rank { font-family: 'Cinzel', serif; font-weight: 900; font-size: 1.25rem; color: var(--gold); text-align: center; }
          .lb-fighter { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.35rem; min-width: 0; }
          .lb-avatar {
            width: 76px; height: 76px; border-radius: 50%; overflow: hidden;
            background: var(--surface-2); color: var(--muted);
            display: flex; align-items: center; justify-content: center;
            border: 1px solid var(--line);
          }
          .lb-avatar svg { width: 100%; height: 100%; }
          /* cover fills the circle (no empty letterboxing), and anchoring the crop to the
             TOP keeps the head in frame -- wiki art is usually full-body and portrait, so a
             centered crop decapitates the character and shows the torso instead. */
          .lb-photo { width: 100%; height: 100%; object-fit: cover; object-position: 50% 0%; }
          .lb-name { font-family: 'Cinzel', serif; font-weight: 700; font-size: 0.95rem; color: var(--ink); line-height: 1.2; word-break: break-word; }
          .lb-universe { font-family: 'Inter', sans-serif; font-size: 0.72rem; color: var(--muted); }
          .lb-vs { font-family: 'Cinzel', serif; font-style: italic; color: var(--gold); font-size: 0.9rem; }
          .lb-count { font-family: 'Inter', sans-serif; font-size: 0.78rem; color: var(--ink-soft); text-align: right; white-space: nowrap; }
          .lb-count strong { display: block; font-family: 'Cinzel', serif; font-size: 1.1rem; color: var(--ink); }
          @media (max-width: 560px) {
            .lb-row { grid-template-columns: 1.5rem 1fr auto 1fr; row-gap: 0.5rem; }
            .lb-count { grid-column: 1 / -1; text-align: center; }
            .lb-count strong { display: inline; margin-right: 0.35rem; }
            .lb-avatar { width: 60px; height: 60px; }
          }
        `}</style>

        <p className="lb-intro">
          The battles everyone's running right now, ranked by how often they're fought over
          the last 7 days. Every time a matchup runs in the Arena, it climbs the board.
        </p>

        {status === "loading" && <p className="lb-note">Loading the rankings...</p>}

        {status === "error" && (
          <p className="lb-note">We couldn't load the rankings right now. Please try again in a moment.</p>
        )}

        {status === "ready" && matchups.length === 0 && (
          <p className="lb-note">
            No battles have been fought this week yet. Be the first, run a matchup in the
            Arena and watch it climb the board.
          </p>
        )}

        {status === "ready" && matchups.length > 0 && (
          <ul className="lb-list">
            {matchups.map((m, i) => (
              <li key={i} className="lb-row">
                <div className="lb-rank">{i + 1}</div>
                <LbFighter name={m.a.name} universe={m.a.universe} />
                <div className="lb-vs">vs</div>
                <LbFighter name={m.b.name} universe={m.b.universe} />
                <div className="lb-count">
                  <strong>{m.count.toLocaleString()}</strong>
                  {m.count === 1 ? "battle" : "battles"}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="about-section about-footer-cta">
          <button className="fight-btn about-cta-btn" onClick={() => onNavigate("home")}>
            Enter the Arena
          </button>
        </div>
      </div>
    </div>
  );
}
