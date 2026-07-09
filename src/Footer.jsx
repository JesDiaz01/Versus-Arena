import { useState } from "react";

export default function Footer({ onHome, onAbout, onLeaderboard, onPrivacy, onDisclaimer, onFaq }) {
  // Your real links/handles
  const TIKTOK_URL = "https://www.tiktok.com/@versus.arena.offic";
  const DISCORD_URL = "https://discord.gg/vpdswhYcpd";
  const KOFI_URL = "https://ko-fi.com/versus_arena";
  const CONTACT_EMAIL = "versusarenahq@gmail.com";

  const [copiedEmail, setCopiedEmail] = useState(false);

  function copyEmail() {
    navigator.clipboard.writeText(CONTACT_EMAIL).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  }

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">VERSUS<span> ARENA</span></div>
          <p className="footer-tagline">Settle the debate. No bias. No favorites.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <div className="footer-col-title">Explore</div>
            {/* "Battles" sends you to the main/home page (where you enter characters) */}
            <a href="#" onClick={(e) => { e.preventDefault(); if (onHome) onHome(); }}>Battles</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (onLeaderboard) onLeaderboard(); }}>Leaderboard</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (onAbout) onAbout(); }}>About</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (onFaq) onFaq(); }}>FAQ</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (onPrivacy) onPrivacy(); }}>Privacy Policy</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (onDisclaimer) onDisclaimer(); }}>Disclaimer</a>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Connect</div>
            <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="footer-social">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
              TikTok
            </a>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="footer-social">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M20.32 4.37A19.79 19.79 0 0016.56 3c-.2.36-.43.85-.59 1.23a18.27 18.27 0 00-5.5 0C10.31 3.85 10.07 3.36 9.87 3a19.74 19.74 0 00-3.76 1.37C2.55 8.06 1.97 11.65 2.27 15.19a19.9 19.9 0 005.99 3.03c.48-.66.91-1.36 1.28-2.1-.7-.27-1.37-.6-2-.98.17-.13.34-.26.5-.4 3.86 1.8 8.04 1.8 11.86 0 .16.14.33.27.5.4-.63.38-1.3.71-2 .98.37.74.8 1.44 1.28 2.1a19.86 19.86 0 005.99-3.03c.36-4.1-.61-7.66-2.55-10.82zM8.84 13.16c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4zm6.32 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4z" />
              </svg>
              Discord
            </a>
            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="footer-social">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z" />
              </svg>
              Support on Ko-fi
            </a>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Contact</div>
            <a href={`mailto:${CONTACT_EMAIL}`} onClick={copyEmail} className="footer-social">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 6L2 7" />
              </svg>
              {copiedEmail ? "Email copied!" : "Suggestions & bugs"}
            </a>
            <span className="footer-email-display">{CONTACT_EMAIL}</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} Versus Arena. All rights reserved.</span>
        <span className="footer-fineprint">Built for fans, by a fan.</span>
      </div>
    </footer>
  );
}