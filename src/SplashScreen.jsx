import { useState, useEffect } from "react";
import "./SplashScreen.css";

export default function SplashScreen({ onEnter }) {
  const [progress, setProgress] = useState(0);
  const [showPress, setShowPress] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let start = null;
    const duration = 1000;

    function step(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(step);
      } else {
        setTimeout(() => setShowPress(true), 200);
      }
    }

    requestAnimationFrame(step);
  }, []);

  function handleEnter() {
    setLeaving(true);
    setTimeout(onEnter, 800);
  }

  return (
    <div className={`splash ${leaving ? "splash-out" : ""}`} onClick={showPress ? handleEnter : undefined}>
      <div className="splash-content">

        {/* V LOGO */}
        <div className="v-logo-wrap">
          <svg className="v-logo" viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="vGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5D76E" />
                <stop offset="30%" stopColor="#D4A017" />
                <stop offset="60%" stopColor="#B8860B" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
              <linearGradient id="vShine" x1="0%" y1="0%" x2="60%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
              <linearGradient id="rimLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C8A84B" />
                <stop offset="50%" stopColor="#8B6914" />
                <stop offset="100%" stopColor="#C8A84B" />
              </linearGradient>
            </defs>

            <path
              d="M20 20 L150 240 L280 20 L240 20 L150 185 L60 20 Z"
              fill="url(#rimLight)"
              stroke="#6B5010"
              strokeWidth="2"
            />

            <path
              d="M30 28 L150 232 L270 28 L234 28 L150 196 L66 28 Z"
              fill="url(#vGold)"
            />

            <path
              d="M30 28 L150 232 L270 28 L234 28 L150 196 L66 28 Z"
              fill="url(#vShine)"
            />

            <line x1="185" y1="80" x2="200" y2="160" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="192" y1="75" x2="205" y2="130" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" strokeLinecap="round" />
          </svg>

          <div className="v-title">VERSUS ARENA</div>
        </div>

        {/* LOADING BAR */}
        <div className="loading-section">
          <div className="loading-bar-track">
            <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="loading-label">
            {progress < 100 ? "WELCOME TO THE ARENA" : "READY"}
          </div>
        </div>

        {/* PRESS TO START */}
        <div className={`press-start ${showPress ? "visible" : ""}`}>
          Press to Start
        </div>

      </div>
    </div>
  );
}