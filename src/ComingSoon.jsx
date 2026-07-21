// Shared "coming soon" / roadmap-teaser page, also used as the shell for the
// accounts page. Presentational only - it renders the same about-* shell the
// Leaderboard uses, with the site-wide NavBar and an "Enter the Arena" CTA.
// Callers pass the eyebrow tag, the title (string or JSX), the body via children,
// and `active` so the nav can highlight the current page. Routed by page-state in
// App.jsx, wrapped there with the shared Footer like every other page.
import NavBar from "./NavBar";

export default function ComingSoon({ tag, title, onNavigate, active, children }) {
  return (
    <div className="about-page">
      <NavBar onNavigate={onNavigate} active={active} />

      <div className="about-container">
        <div className="about-tag">{tag}</div>
        <h1 className="about-title">{title}</h1>

        {children}

        <div className="about-section about-footer-cta">
          <button className="fight-btn about-cta-btn" onClick={() => onNavigate("home")}>
            Enter the Arena
          </button>
        </div>
      </div>
    </div>
  );
}
