// src/MyBattles.jsx
// Signed-in user's saved battle history. Reads GET /api/my-battles with the
// Supabase access token; the server verifies the token and returns only this
// user's battles (RLS + server-side ownership filter). Clicking an item re-opens
// that battle's stored verdict via the app's existing share-link mechanism
// (onOpenBattle -> the ?b= / SharedBattle path).
//
// History is paged (25 at a time) rather than a single flat pull, so a user with
// hundreds of battles can actually reach the old ones instead of silently seeing
// only the newest page.
//
// "Remove" deletes only the link between this user and the battle (POST
// /api/remove-battle). The battle itself stays cached and its share link keeps
// working -- see api/remove-battle.js. It is a two-step confirm so a stray click
// cannot wipe a row.
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
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  // Battle id awaiting a second click to confirm removal, and the one in flight.
  const [confirmId, setConfirmId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  // Permanent delete is deliberately separate from "remove": it needs a spelled-out
  // warning panel rather than a second click, because it erases the verdict for everyone
  // and breaks the public share link.
  const [deleteId, setDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState("");

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
        setHasMore(Boolean(data.hasMore));
        setNextOffset(typeof data.nextOffset === "number" ? data.nextOffset : 0);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Append the next page. Guarded so a double-click cannot fire two requests, and
  // failures surface inline without destroying the list already on screen.
  function loadMore() {
    if (loadingMore || !hasMore || !session || !session.access_token) return;
    setLoadingMore(true);
    setActionError("");

    fetch(`/api/my-battles?offset=${encodeURIComponent(nextOffset)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("request failed"))))
      .then((data) => {
        const more = Array.isArray(data.battles) ? data.battles : [];
        // Guard against any duplicate ids so React keys stay unique.
        setBattles((prev) => {
          const seen = new Set(prev.map((b) => b.id));
          return prev.concat(more.filter((b) => !seen.has(b.id)));
        });
        setHasMore(Boolean(data.hasMore));
        setNextOffset(typeof data.nextOffset === "number" ? data.nextOffset : nextOffset + more.length);
      })
      .catch(() => setActionError("Couldn't load more battles. Try again in a moment."))
      .finally(() => setLoadingMore(false));
  }

  // Remove one battle from this user's history (does not delete the battle itself).
  function removeBattle(id) {
    if (removingId || !session || !session.access_token) return;
    setRemovingId(id);
    setActionError("");

    fetch("/api/remove-battle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ battle_id: id }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("request failed"))))
      .then(() => {
        setBattles((prev) => prev.filter((b) => b.id !== id));
        // The removed row sat BEFORE the pagination cursor, so the underlying result set
        // just shrank by one. Pull the cursor back to match, otherwise the next "Load
        // More" would start one row too deep and silently skip a battle.
        setNextOffset((n) => (n > 0 ? n - 1 : 0));
        setConfirmId(null);
      })
      .catch(() => setActionError("Couldn't remove that battle. Try again in a moment."))
      .finally(() => setRemovingId(null));
  }

  // Permanently erase the battle itself (content + share link + cache entry), not just
  // this user's link to it. The server refuses ids the caller has no history link to, and
  // refuses curated/authored verdicts.
  function deleteBattle(id) {
    if (deletingId || !session || !session.access_token) return;
    setDeletingId(id);
    setActionError("");

    fetch("/api/delete-battle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ battle_id: id }),
    })
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d && d.error)))))
      .then(() => {
        setBattles((prev) => prev.filter((b) => b.id !== id));
        // Same cursor correction as removal: the result set just shrank by one.
        setNextOffset((n) => (n > 0 ? n - 1 : 0));
        setDeleteId(null);
      })
      .catch((err) =>
        setActionError(
          (err && err.message) || "Couldn't delete that battle. Try again in a moment."
        )
      )
      .finally(() => setDeletingId(null));
  }

  return (
    <div className="privacy-page">
      <NavBar onNavigate={onNavigate} active="mybattles" />

      <div className="about-container">
        <div className="about-tag">Accounts</div>
        <h1 className="about-title">My <span className="vs-word">Battles</span></h1>

        <style>{`
          .mb-list { list-style: none; margin: 0; padding: 0; }
          .mb-entry { margin-bottom: 0.75rem; }
          .mb-row { display: flex; align-items: stretch; gap: 0.5rem; }
          .mb-item {
            flex: 1;
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 1rem;
            text-align: left;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 4px;
            padding: 1rem 1.25rem;
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
          .mb-error { font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #9b2c2c; margin: 0 0 0.75rem; }
          .mb-remove {
            flex: 0 0 auto;
            font-family: 'Inter', sans-serif;
            font-size: 0.75rem;
            color: var(--muted);
            background: transparent;
            border: 1px solid var(--line);
            border-radius: 4px;
            padding: 0 0.85rem;
            cursor: pointer;
            white-space: nowrap;
            transition: color 0.2s, border-color 0.2s, background 0.2s;
          }
          .mb-remove:hover { color: #9b2c2c; border-color: #9b2c2c; }
          .mb-remove.confirming { color: #fff; background: #9b2c2c; border-color: #9b2c2c; }
          .mb-remove:disabled { opacity: 0.6; cursor: default; }
          .mb-more-wrap { display: flex; justify-content: center; margin: 1.25rem 0 0; }
          .mb-more {
            font-family: 'Cinzel', serif;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-size: 0.8rem;
            background: transparent;
            color: var(--ink);
            border: 1px solid var(--line-strong);
            border-radius: 4px;
            padding: 0.7rem 1.6rem;
            cursor: pointer;
            transition: border-color 0.2s, color 0.2s;
          }
          .mb-more:hover { border-color: var(--gold); color: var(--gold); }
          .mb-more:disabled { opacity: 0.6; cursor: default; }
          .mb-delete {
            flex: 0 0 auto;
            font-family: 'Inter', sans-serif;
            font-size: 0.75rem;
            color: var(--muted);
            background: transparent;
            border: 1px solid var(--line);
            border-radius: 4px;
            padding: 0 0.85rem;
            cursor: pointer;
            white-space: nowrap;
            transition: color 0.2s, border-color 0.2s;
          }
          .mb-delete:hover { color: #9b2c2c; border-color: #9b2c2c; }
          .mb-danger {
            border: 1px solid #9b2c2c;
            border-top: none;
            border-radius: 0 0 4px 4px;
            background: rgba(155,44,44,0.06);
            padding: 0.85rem 1.1rem;
            font-family: 'Inter', sans-serif;
          }
          .mb-danger p { margin: 0 0 0.7rem; font-size: 0.85rem; line-height: 1.6; color: var(--ink-soft); }
          .mb-danger strong { color: #9b2c2c; }
          .mb-danger-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
          .mb-danger-go {
            font-family: 'Inter', sans-serif; font-size: 0.78rem;
            background: #9b2c2c; color: #fff; border: 1px solid #9b2c2c;
            border-radius: 4px; padding: 0.45rem 0.9rem; cursor: pointer;
          }
          .mb-danger-go:disabled { opacity: 0.6; cursor: default; }
          .mb-danger-cancel {
            font-family: 'Inter', sans-serif; font-size: 0.78rem;
            background: transparent; color: var(--ink-soft);
            border: 1px solid var(--line-strong);
            border-radius: 4px; padding: 0.45rem 0.9rem; cursor: pointer;
          }
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
          <>
            {actionError && <p className="mb-error" role="alert">{actionError}</p>}

            <ul className="mb-list">
              {battles.map((b) => (
                <li key={b.id} className="mb-entry">
                  <div className="mb-row">
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

                  {/* Two-step: the first click arms the confirm, the second removes. */}
                  <button
                    type="button"
                    className={"mb-remove" + (confirmId === b.id ? " confirming" : "")}
                    disabled={removingId === b.id}
                    aria-label={
                      confirmId === b.id
                        ? `Confirm removing ${b.f1} vs ${b.f2} from your history`
                        : `Remove ${b.f1} vs ${b.f2} from your history`
                    }
                    onClick={() => {
                      if (removingId) return;
                      if (confirmId === b.id) removeBattle(b.id);
                      else setConfirmId(b.id);
                    }}
                    onBlur={() => setConfirmId((c) => (c === b.id ? null : c))}
                  >
                    {removingId === b.id
                      ? "Removing..."
                      : confirmId === b.id
                        ? "Confirm?"
                        : "Remove"}
                  </button>

                  {/* Permanent erase. Opens a warning panel rather than acting on click. */}
                  <button
                    type="button"
                    className="mb-delete"
                    aria-label={`Permanently delete ${b.f1} vs ${b.f2}`}
                    aria-expanded={deleteId === b.id}
                    onClick={() => {
                      setConfirmId(null);
                      setDeleteId((d) => (d === b.id ? null : b.id));
                    }}
                  >
                    Delete
                  </button>
                  </div>

                  {deleteId === b.id && (
                    <div className="mb-danger" role="alert">
                      <p>
                        <strong>Permanently delete this battle?</strong> This erases the
                        verdict itself, not just your history entry. Its share link will
                        stop working for anyone who has it, and it will disappear from
                        any other user's history too. This cannot be undone.
                      </p>
                      <div className="mb-danger-actions">
                        <button
                          type="button"
                          className="mb-danger-go"
                          disabled={deletingId === b.id}
                          onClick={() => deleteBattle(b.id)}
                        >
                          {deletingId === b.id ? "Deleting..." : "Yes, delete permanently"}
                        </button>
                        <button
                          type="button"
                          className="mb-danger-cancel"
                          onClick={() => setDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {hasMore && (
              <div className="mb-more-wrap">
                <button
                  type="button"
                  className="mb-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
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
