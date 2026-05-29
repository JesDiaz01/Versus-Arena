export default function Leaderboard({ onBack }) {
  return (
    <div className="about-page">
      <nav className="navbar">
        <a className="logo" href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
          VERSUS<span> ARENA</span>
        </a>
        <ul className="nav-links">
          <li><a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Back to Arena</a></li>
        </ul>
      </nav>

      <div className="about-container">
        <div className="about-tag">The Rankings</div>
        <h1 className="about-title">Trending <span className="vs-word">Matchups</span></h1>

        <div className="about-section">
          <p className="about-lead">
            The battles everyone's talking about, ranked by how often they're fought.
          </p>
          <p>
            Every time a matchup gets run in the Arena, it climbs the board. This is where you'll
            find the internet's most-debated fights — the eternal rivalries, the surprise upsets,
            and whatever the community is obsessed with this week.
          </p>
        </div>

        <div className="about-divider" />

        <div className="about-section">
          <h2 className="about-subtitle">Coming Soon</h2>
          <p>
            We're building out the full leaderboard experience. Soon you'll be able to see:
          </p>
          <ul className="leaderboard-list">
            <li>Top 10 most-compared battles of all time</li>
            <li>Most-searched characters on the site</li>
            <li>Biggest winners — characters with the highest verdict win rate</li>
            <li>Trending this week vs all-time legends</li>
          </ul>
          <p className="about-quiet">
            The more battles the community runs, the richer these rankings get. Keep fighting.
          </p>
        </div>

        <div className="about-section about-footer-cta">
          <button className="fight-btn about-cta-btn" onClick={onBack}>
            Enter the Arena
          </button>
        </div>
      </div>
    </div>
  );
}