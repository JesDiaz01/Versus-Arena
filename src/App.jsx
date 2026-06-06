import { useState } from "react";
import SplashScreen from "./SplashScreen";
import BattleArena from "./BattleArena";
import About from "./About";
import Tools from "./Tools";
import Leaderboard from "./Leaderboard";
import Footer from "./Footer";
import PrivacyPolicy from "./PrivacyPolicy";
import "./App.css";

export default function App() {
  const [entered, setEntered] = useState(false);
  const [page, setPage] = useState("home");

  if (!entered) {
    return <SplashScreen onEnter={() => setEntered(true)} />;
  }

  if (page === "about") {
    return (
      <>
        <About onBack={() => setPage("home")} />
        <Footer onAbout={() => setPage("about")} onPrivacy={() => setPage("privacy")} />
      </>
    );
  }

  if (page === "tools") {
    return (
      <>
        <Tools onBack={() => setPage("home")} />
        <Footer onAbout={() => setPage("about")} onPrivacy={() => setPage("privacy")} />
      </>
    );
  }

  if (page === "leaderboard") {
    return (
      <>
        <Leaderboard onBack={() => setPage("home")} />
        <Footer onAbout={() => setPage("about")} onPrivacy={() => setPage("privacy")} />
      </>
    );
  }

  if (page === "privacy") {
    return (
      <>
        <PrivacyPolicy onBack={() => setPage("home")} />
        <Footer onAbout={() => setPage("about")} onPrivacy={() => setPage("privacy")} />
      </>
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

      <Footer onAbout={() => setPage("about")} onPrivacy={() => setPage("privacy")} />
    </div>
  );
}