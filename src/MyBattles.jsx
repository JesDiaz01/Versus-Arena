// src/MyBattles.jsx
// Signed-in user's saved battle history. Reads GET /api/my-battles with the
// Supabase access token; the server verifies the token and returns only this
// user's battles (RLS + server-side ownership filter). Clicking an item re-opens
// that battle's stored verdict via the app's existing share-link mechanism
// (onOpenBattle -> the ?b= / SharedBattle path).
//
// Reuses the About/Privacy page shell (navbar + about-* classes + tokens) so it
// looks native; only a small scoped style block is added for the list rows.

import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import NavBar from "./NavBar";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function MyBattles({ onNavigate, onOpenBattle }) {
  const { session } = useAuth();
  // Start "ready"/empty when there is no session so the effect never has to set
  // state synchronously; a signed-in mount starts "loading" and the fetch fills it.
  const [status, setStatus] = useState(session && session.access_token ? "loading" : "ready");
  const [battles, setBattles] = useState([]);

  const goBack = (e) => {
    if (e) e.preventDefault();
    if (onNavigate) onNavigate("home");
  };

  useEffect(() => {
    // No session -> nothing to load. (App only routes here when signed in, but
    // guard anyway so a token refresh gap never crashes the view.) No setState
    // here: initial state already reflects the no-session case.
    if (!session || !session.access_token) return;

    let cancelled = false;

    fetch("/api/my-battles", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("request failed"))))
      .then((data) => {
        if (cancelled) return;
        setBattles(Array.isArray(data.battles) ? data.battles : []);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <div className="privacy-page">
      <NavBar onNavigate={onNavigate} active="mybattles" />

      <div className="about-container">
        <div className="about-tag">Accounts</div>
        <h1 className="about-title">My <span className="vs-word">Battles</span></h1>

        <style>{`
          .mb-list { list-style: none; margin: 0; padding: 0; }
          .mb-item {
            width: 100%;
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 1rem;
            text-align: left;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 4px;
            padding: 1rem 1.25rem;
            margin-bottom: 0.75rem;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          }
          .mb-item:hover {
            border-color: var(--gold);
            box-shadow: 0 6px 18px rgba(184,134,11,0.12);
            transform: translateY(-1px);
          }
          .mb-matchup {
            font-family: 'Cinzel', serif;
            font-weight: 700;
            font-size: 1.05rem;
            color: var(--ink);
            letter-spacing: 0.02em;
          }
          .mb-vs { color: var(--gold); font-style: italic; margin: 0 0.4rem; }
          .mb-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; white-space: nowrap; }
          .mb-winner { font-size: 0.8rem; color: var(--ink-soft); }
          .mb-winner strong { color: var(--gold); font-weight: 600; }
          .mb-date { font-size: 0.72rem; color: var(--muted); }
          .mb-note { font-size: 1.05rem; color: var(--ink-soft); line-height: 1.7; }
          @media (max-width: 520px) {
            .mb-item { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
            .mb-meta { align-items: flex-start; }
          }
        `}</style>

        {status === "loading" && (
          <p className="mb-note">Loading your battles...</p>
        )}

        {status === "error" && (
          <p className="mb-note">
            We couldn't load your battles right now. Please try again in a moment.
          </p>
        )}

        {status === "ready" && battles.length === 0 && (
          <p className="mb-note">No saved battles yet - run one!</p>
        )}

        {status === "ready" && battles.length > 0 && (
          <ul className="mb-list">
            {battles.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className="mb-item"
                  onClick={() => onOpenBattle && onOpenBattle(b.id)}
                >
                  <span className="mb-matchup">
                    {b.f1 || "Fighter 1"}<span className="mb-vs">vs</span>{b.f2 || "Fighter 2"}
                  </span>
                  <span className="mb-meta">
                    <span className="mb-winner">
                      {b.winner === "Draw"
                        ? "Draw"
                        : b.winner
                          ? <>Winner: <strong>{b.winner}</strong></>
                          : ""}
                    </span>
                    <span className="mb-date">{formatDate(b.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="about-section about-footer-cta">
          <button className="fight-btn about-cta-btn" onClick={goBack}>
            Enter the Arena
          </button>
        </div>
      </div>
    </div>
  );
}
