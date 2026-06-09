import { useState, useEffect } from "react";
import SplashScreen from "./SplashScreen";
import BattleArena from "./BattleArena";
import SharedBattle from "./SharedBattle";
import About from "./About";
import Tools from "./Tools";
import Leaderboard from "./Leaderboard";
import Footer from "./Footer";
import PrivacyPolicy from "./PrivacyPolicy";
import "./App.css";

export default function App() {
  const [entered, setEntered] = useState(false);
  const [page, setPage] = useState("home");
  const [sharedBattle, setSharedBattle] = useState(null);
  const [sharedLoading, setSharedLoading] = useState(false);

  // When you switch pages, jump back to the top so you land at the start of the
  // new page (e.g. the arena on home) instead of staying scrolled down where the
  // footer was. Runs every time `page` changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // On startup, check for a shared battle link (?b=<id>).
  // If found, skip the splash and load the saved battle.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const battleId = params.get("b");
    if (!battleId) return;

    setEntered(true);
    setSharedLoading(true);

    fetch("/api/get-battle?id=" + encodeURIComponent(battleId))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.error) setSharedBattle(data);
      })
      .catch(function() {})
      .finally(function() { setSharedLoading(false); });
  }, []);

  if (!entered) {
    return <SplashScreen onEnter={() => setEntered(true)} />;
  }

  if (page === "about") {
    return (
      <>
        <About onBack={() => setPage("home")} />
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
        />
      </>
    );
  }

  if (page === "tools") {
    return (
      <>
        <Tools onBack={() => setPage("home")} />
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
        />
      </>
    );
  }

  if (page === "leaderboard") {
    return (
      <>
        <Leaderboard onBack={() => setPage("home")} />
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
        />
      </>
    );
  }

  if (page === "privacy") {
    return (
      <>
        <PrivacyPolicy onBack={() => setPage("home")} />
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
        />
      </>
    );
  }

  if (sharedLoading) {
    return (
      <div className="sb-loading-screen">
        <div className="sb-loading-text">Loading battle...</div>
      </div>
    );
  }

  if (sharedBattle) {
    return (
      <SharedBattle
        battle={sharedBattle}
        onBackToArena={function() {
          setSharedBattle(null);
          window.history.replaceState({}, "", window.location.pathname);
        }}
      />
    );
  }

  return (
    <div className="page">
      <nav className="navbar">
        <a className="logo" href="#">VERSUS<span> ARENA</span></a>
        <ul className="nav-links">
          <li><a href="#">Battles</a></li>
          <li><a href="#" onClick={(e) => { e.preventDefault(); setPage("leaderboard"); }}>Leaderboard</a></li>
          <li><a href="#" onClick={(e) => { e.preventDefault(); setPage("tools"); }}>Tools</a></li>
          <li><a href="#">Categories</a></li>
          <li><a href="#" onClick={(e) => { e.preventDefault(); setPage("about"); }}>About</a></li>
          <li><a href="#" className="nav-cta">Sign Up Free</a></li>
        </ul>
      </nav>

      <div className="hero">
        <div className="hero-tag">Settle the debate</div>
        <h1>Who Would<br /><span className="vs-word">Win?</span></h1>
        <p className="hero-sub">
          Pick any two fictional characters from any universe.
          Every verdict is weighed against feats, powerscaling, and lore.
        </p>
      </div>

      <BattleArena />

      <div className="stats-strip">
        <div className="stat-item"><span className="stat-num">99.9%</span><span className="stat-label">Sourced Verdicts</span></div>
        <div className="stat-item"><span className="stat-num">100%</span><span className="stat-label">Unbiased</span></div>
      </div>

      <Footer
        onHome={() => setPage("home")}
        onAbout={() => setPage("about")}
        onLeaderboard={() => setPage("leaderboard")}
        onPrivacy={() => setPage("privacy")}
      />
    </div>
  );
}