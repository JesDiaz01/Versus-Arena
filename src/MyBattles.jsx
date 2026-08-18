// src/MyBattles.jsx
// Signed-in user's saved battle history. Reads GET /api/my-battles with the
// Supabase access token; the server verifies the token and returns only this
// user's battles (RLS + server-side ownership filter). Clicking an item re-opens
// that battle's stored verdict via the app's existing share-link mechanism
// (onOpenBattle -> the ?b= / SharedBattle path).
//
// History is paged 10 at a time with numbered page buttons rather than a single
// flat pull, so a user with hundreds of battles can jump straight to the old ones.
// The server owns the page size and the total count; this view only asks for a
// page number and renders what comes back.
//
// "Remove" deletes only the link between this user and the battle (POST
// /api/remove-battle). The battle itself stays cached and its share link keeps
// working -- see api/remove-battle.js. It is a two-step confirm so a stray click
// cannot wipe a row.
//
// Reuses the About/Privacy page shell (navbar + about-* classes + tokens) so it
// looks native; only a small scoped style block is added for the list rows.

import { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import NavBar from "./NavBar";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Which page buttons to draw. Up to 7 pages get every number; beyond that the list is
// windowed to first / last / current +-1 with "..." gaps, so a user with 40 pages of
// history still gets a pager that wraps onto a phone screen instead of overflowing it.
function pageNumbers(current, count) {
  if (count <= 7) {
    const all = [];
    for (let i = 1; i <= count; i++) all.push(i);
    return all;
  }
  const out = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);
  if (start > 2) out.push("gap-left");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 1) out.push("gap-right");
  out.push(count);
  return out;
}

export default function MyBattles({ onNavigate, onOpenBattle }) {
  const { session } = useAuth();
  // Start "ready"/empty when there is no session so the effect never has to set
  // state synchronously; a signed-in mount starts "loading" and the fetch fills it.
  const [status, setStatus] = useState(session && session.access_token ? "loading" : "ready");
  const [battles, setBattles] = useState([]);
  // Server-owned paging state. pageSize is echoed by the API rather than hardcoded here
  // so the two can never disagree about how many buttons to draw.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  // Set by whoever asks for a page (mount, goToPage, refreshPage) and cleared by the
  // fetch that answers, rather than raised inside the effect -- a synchronous setState
  // in an effect body is a cascading render.
  const [pageLoading, setPageLoading] = useState(Boolean(session && session.access_token));
  // Bumped to re-run the fetch effect for the SAME page (after a remove/delete).
  const [reloadKey, setReloadKey] = useState(0);
  // Rising id of the newest in-flight request. Clicking through pages quickly can land
  // responses out of order; anything that is not the latest request is dropped so a
  // slow earlier page cannot paint over a newer one.
  const requestRef = useRef(0);
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
    const reqId = requestRef.current + 1;
    requestRef.current = reqId;

    fetch(`/api/my-battles?page=${encodeURIComponent(page)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("request failed"))))
      .then((data) => {
        if (cancelled || reqId !== requestRef.current) return;

        const list = Array.isArray(data.battles) ? data.battles : [];
        const size = typeof data.pageSize === "number" && data.pageSize > 0 ? data.pageSize : 10;
        const count = typeof data.total === "number" && data.total >= 0 ? data.total : list.length;
        const lastPage = Math.max(1, Math.ceil(count / size));

        // Stranded past the end -- the last row on this page was just removed, or the
        // history shrank in another tab. Step back to the last page that still has rows
        // and let the effect re-run; pageLoading stays true across the hop so the view
        // never flashes an empty list. This only ever moves DOWN, so it cannot loop.
        if (list.length === 0 && page > lastPage) {
          setTotal(count);
          setPageSize(size);
          setPage(lastPage);
          return;
        }

        setBattles(list);
        setTotal(count);
        setPageSize(size);
        setStatus("ready");
        setPageLoading(false);
      })
      .catch(() => {
        if (cancelled || reqId !== requestRef.current) return;
        setPageLoading(false);
        // A failed page change keeps the list that is already on screen and reports the
        // failure inline; only a failed FIRST load takes over the whole view.
        setStatus((s) => (s === "ready" ? s : "error"));
        setActionError("Couldn't load that page. Try again in a moment.");
      });

    return () => {
      cancelled = true;
    };
  }, [session, page, reloadKey]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Jump to a page. Guarded against re-requesting the page already shown.
  function goToPage(next) {
    if (next < 1 || next > pageCount || next === page || pageLoading) return;
    // A row's two-step confirm and its danger panel belong to the row that opened them,
    // so neither may survive the hop into whatever row lands in that slot next. (The
    // clamp path in the effect needs no such reset: the remove/delete handler that
    // triggered it already cleared both.)
    setConfirmId(null);
    setDeleteId(null);
    setActionError("");
    setPageLoading(true);
    setPage(next);
    if (typeof window !== "undefined" && window.scrollTo) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Re-fetch the page currently on screen (after a row leaves it), so the list and the
  // total both come from the server rather than being guessed at locally.
  function refreshPage() {
    setPageLoading(true);
    setReloadKey((k) => k + 1);
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
        // Drop the row immediately so the click feels instant, then re-fetch this page:
        // the rows after it have all shifted up by one, and the total (and with it the
        // page buttons) has changed. The re-fetch also handles emptying the last page --
        // see the clamp in the fetch effect.
        setBattles((prev) => prev.filter((b) => b.id !== id));
        setConfirmId(null);
        refreshPage();
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
        // Same as removal: optimistic drop, then re-fetch this page for the corrected
        // rows and total.
        setBattles((prev) => prev.filter((b) => b.id !== id));
        setDeleteId(null);
        refreshPage();
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
          .mb-pager {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 0.4rem;
            margin: 1.5rem 0 0;
          }
          .mb-page-btn {
            font-family: 'Cinzel', serif;
            font-size: 0.8rem;
            letter-spacing: 0.06em;
            min-width: 2.3rem;
            background: transparent;
            color: var(--ink);
            border: 1px solid var(--line);
            border-radius: 4px;
            padding: 0.5rem 0.6rem;
            cursor: pointer;
            transition: border-color 0.2s, color 0.2s, background 0.2s;
          }
          .mb-page-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
          .mb-page-btn.current {
            border-color: var(--gold);
            color: var(--gold);
            background: rgba(184,134,11,0.10);
            font-weight: 700;
            cursor: default;
          }
          .mb-page-btn:disabled { opacity: 0.45; cursor: default; }
          .mb-page-step {
            text-transform: uppercase;
            border-color: var(--line-strong);
            padding: 0.5rem 0.9rem;
          }
          .mb-page-gap {
            font-family: 'Cinzel', serif;
            font-size: 0.8rem;
            color: var(--muted);
            padding: 0 0.1rem;
            user-select: none;
          }
          .mb-page-count {
            width: 100%;
            text-align: center;
            font-family: 'Inter', sans-serif;
            font-size: 0.72rem;
            color: var(--muted);
            margin: 0.35rem 0 0;
          }
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
            /* Tighter buttons + wrapping keeps the pager inside a narrow screen. */
            .mb-pager { gap: 0.3rem; }
            .mb-page-btn { min-width: 2rem; padding: 0.45rem 0.4rem; font-size: 0.72rem; }
            .mb-page-step { padding: 0.45rem 0.65rem; }
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

        {/* pageLoading guard: after removing the last row on a page the list is briefly
            empty while the corrected page is fetched -- that is not "no battles yet". */}
        {status === "ready" && battles.length === 0 && !pageLoading && (
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

            {/* One page of history needs no pager. */}
            {pageCount > 1 && (
              <nav className="mb-pager" aria-label="Battle history pages">
                <button
                  type="button"
                  className="mb-page-btn mb-page-step"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || pageLoading}
                >
                  Prev
                </button>

                {pageNumbers(page, pageCount).map((n) =>
                  typeof n === "number" ? (
                    <button
                      key={n}
                      type="button"
                      className={"mb-page-btn" + (n === page ? " current" : "")}
                      aria-label={`Page ${n}`}
                      aria-current={n === page ? "page" : undefined}
                      onClick={() => goToPage(n)}
                      disabled={pageLoading || n === page}
                    >
                      {n}
                    </button>
                  ) : (
                    <span key={n} className="mb-page-gap" aria-hidden="true">...</span>
                  )
                )}

                <button
                  type="button"
                  className="mb-page-btn mb-page-step"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pageCount || pageLoading}
                >
                  Next
                </button>

                <p className="mb-page-count">
                  {pageLoading ? "Loading..." : `Page ${page} of ${pageCount} - ${total} battles`}
                </p>
              </nav>
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
