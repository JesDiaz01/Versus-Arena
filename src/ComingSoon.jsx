// Shared "coming soon" / roadmap-teaser page. Presentational only - it renders the
// same about-* shell the Leaderboard uses, with its own minimal navbar and an
// "Enter the Arena" CTA. Callers pass the eyebrow tag, the title (string or JSX),
// and the body via children. Routed by page-state in App.jsx (setPage), wrapped
// there with the shared Footer like every other page.
export default function ComingSoon({ tag, title, onBack, children }) {
  return (
    <div className="about-page">
      <nav className="navbar">
        <a className="logo" href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
          VERSUS<span> ARENA</span>
        </a>
        <ul className="nav-links">
          <li><a href="#" className="nav-back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>Back to the Arena</a></li>
        </ul>
      </nav>

      <div className="about-container">
        <div className="about-tag">{tag}</div>
        <h1 className="about-title">{title}</h1>

        {children}

        <div className="about-section about-footer-cta">
          <button className="fight-btn about-cta-btn" onClick={onBack}>
            Enter the Arena
          </button>
        </div>
      </div>
    </div>
  );
}
