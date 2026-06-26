// src/Disclaimer.jsx
// Disclaimer page for Versus Arena.
// Implemented exactly like PrivacyPolicy.jsx: its own simple navbar with a
// "Back to Arena" link (reusing the existing navbar / logo / nav-links / fight-btn
// classes), plus its own scoped styles for the page text. It uses the CSS
// variables already defined in App.css, so it needs no changes to App.css.
//
// Takes an onBack callback (same pattern as PrivacyPolicy.jsx) to return to the arena.

export default function Disclaimer({ onBack }) {
  const goBack = (e) => {
    if (e) e.preventDefault();
    if (onBack) onBack();
  };

  return (
    <div className="privacy-page">
      <nav className="navbar">
        <div className="nav-inner">
          <a className="logo" href="#" onClick={goBack}>
            VERSUS<span> ARENA</span>
          </a>
          <ul className="nav-links">
            <li><a href="#" className="nav-back-link" onClick={goBack}>Back to the Arena</a></li>
          </ul>
        </div>
      </nav>

      <div className="pp-wrap">
        <style>{`
          .privacy-page { background: var(--bg); min-height: 100vh; }
          .pp-wrap {
            width: 100%;
            display: flex;
            justify-content: center;
            padding: 40px 24px 88px;
            color: var(--ink);
          }
          .pp-inner { width: 100%; max-width: 760px; }
          .pp-title {
            font-family: "Cinzel", serif;
            font-weight: 900;
            font-size: 40px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin: 0 0 8px;
            color: var(--ink);
          }
          .pp-updated {
            font-family: "Inter", sans-serif;
            font-size: 13px;
            color: var(--muted);
            margin: 0 0 36px;
          }
          .pp-tldr {
            background: var(--surface-2);
            border-left: 3px solid var(--gold);
            border-radius: 6px;
            padding: 18px 22px;
            margin: 0 0 40px;
          }
          .pp-tldr strong {
            font-family: "Cinzel", serif;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            font-size: 13px;
            color: var(--gold);
            display: block;
            margin-bottom: 8px;
          }
          .pp-inner h2 {
            font-family: "Cinzel", serif;
            font-weight: 700;
            font-size: 20px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--ink);
            margin: 40px 0 14px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--line);
          }
          .pp-inner p,
          .pp-inner li {
            font-family: "Inter", sans-serif;
            font-size: 16px;
            line-height: 1.75;
            color: var(--ink-soft);
            margin: 0 0 14px;
          }
          .pp-inner ul { margin: 0 0 14px; padding-left: 20px; }
          .pp-inner li { margin-bottom: 10px; }
          .pp-inner li strong { color: var(--ink); }
          .pp-inner a {
            color: var(--gold);
            text-decoration: none;
            border-bottom: 1px solid var(--line-strong);
          }
          .pp-inner a:hover { color: var(--gold-bright); }
          .pp-cta { margin-top: 44px; text-align: center; }
          @media (max-width: 768px) {
            .pp-wrap { padding: 28px 18px 64px; }
            .pp-title { font-size: 30px; }
          }
        `}</style>

        <div className="pp-inner">
          <h1 className="pp-title">Disclaimer</h1>
          <p className="pp-updated">Last updated: June 15, 2026</p>

          <div className="pp-tldr">
            <strong>The short version</strong>
            <p style={{ margin: 0 }}>
              Versus Arena is an entertainment site. Every battle outcome, verdict,
              and analysis is a fictional, AI-generated hypothetical made for fun and
              discussion. None of it is a statement of fact about any real person, and
              the verdicts can be wrong.
            </p>
          </div>

          <p>
            Versus Arena lets you pit fictional characters against each other and get
            an AI-generated verdict on who would win. It exists purely for
            entertainment. This page explains, in plain terms, what that does and does
            not mean.
          </p>

          <h2>Entertainment only</h2>
          <p>
            All battle outcomes, verdicts, and analyses on this site are fictional
            hypotheticals created for fun and discussion. They are meant to entertain,
            not to settle anything in the real world.
          </p>

          <h2>Not statements of fact about real people</h2>
          <p>
            Outcomes do not represent the real abilities, opinions, statements,
            actions, or characteristics of any real person, and are not statements of
            fact about anyone. Any matchup involving a real public figure is parody and
            entertainment only.
          </p>

          <h2>AI-generated and may be inaccurate</h2>
          <p>
            Verdicts are produced by an AI model and may be inaccurate, incomplete, or
            out of date with current canon or real-world information. Nothing here
            should be taken as factual or relied upon as accurate.
          </p>

          <h2>Your responsibility</h2>
          <p>
            You are responsible for the content you enter into the custom feats and lore
            fields. Do not use this site to harass, defame, or post hateful content
            about any real person.
          </p>

          <h2>Intellectual property</h2>
          <p>
            Character names, series, and related properties belong to their respective
            owners. This site is an unofficial fan project and is not affiliated with,
            sponsored by, or endorsed by any rights holder.
          </p>

          <div className="pp-cta">
            <button className="fight-btn" onClick={() => onBack && onBack()}>
              Back to the Arena
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
