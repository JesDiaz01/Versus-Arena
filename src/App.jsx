import { useState } from "react";
import SplashScreen from "./SplashScreen";
import BattleArena from "./BattleArena";
import "./App.css";

export default function App() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <SplashScreen onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="page">
      <nav className="navbar">
        <a className="logo" href="#">VERSUS<span> ARENA</span></a>
        <ul className="nav-links">
          <li><a href="#">Battles</a></li>
          <li><a href="#">Leaderboard</a></li>
          <li><a href="#">Categories</a></li>
          <li><a href="#" className="nav-cta">Sign Up Free</a></li>
        </ul>
      </nav>

      <div className="hero">
        <div className="hero-tag">AI-powered character analysis</div>
        <h1>Who Would<br /><span className="vs-word">Win?</span></h1>
        <p className="hero-sub">
          Pick any two fictional characters from any universe. Our AI analyzes feats,
          powerscaling, and lore to deliver a definitive verdict.
        </p>
      </div>

      <BattleArena />

      <div className="stats-strip">
        <div className="stat-item"><span className="stat-num">248K</span><span className="stat-label">Battles Fought</span></div>
        <div className="stat-item"><span className="stat-num">14K</span><span className="stat-label">Characters Indexed</span></div>
        <div className="stat-item"><span className="stat-num">890</span><span className="stat-label">Universes</span></div>
        <div className="stat-item"><span className="stat-num">99.1%</span><span className="stat-label">Sourced Verdicts</span></div>
      </div>
    </div>
  );
}