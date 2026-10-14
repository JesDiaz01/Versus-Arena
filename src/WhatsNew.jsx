// src/WhatsNew.jsx
// Dismissible "What's New" card shown in the home hero. It announces one update at a
// time: to announce the next one, edit UPDATE and give it a NEW id, so visitors who
// dismissed the previous card see the new one. Dismissal is remembered per id in
// localStorage as a per-browser convenience only; if storage is blocked (private mode,
// cleared site data) the card simply shows again.
import { useState } from "react";

const UPDATE = {
  id: "2026-10-stronger-verdicts",
  date: "October 2026",
  title: "Stronger Verdicts",
  body:
    "We've upgraded the AI that judges every battle, for better and stronger verdicts. " +
    "It now takes more care weighing each matchup, so new battles take a few seconds " +
    "longer to generate a result.",
};

const STORAGE_KEY = "va-whats-new-dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === UPDATE.id;
  } catch {
    return false;
  }
}

export default function WhatsNew() {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { window.localStorage.setItem(STORAGE_KEY, UPDATE.id); } catch { /* shows again next visit */ }
  }

  return (
    <aside className="whats-new" aria-label="What's new">
      <div className="whats-new-head">
        <span className="whats-new-tag">What's New</span>
        <span className="whats-new-date">{UPDATE.date}</span>
      </div>
      <h2 className="whats-new-title">{UPDATE.title}</h2>
      <p className="whats-new-body">{UPDATE.body}</p>
      <button type="button" className="whats-new-close" onClick={dismiss} aria-label="Dismiss what's new">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </aside>
  );
}
