import { useState } from "react";

export default function Footer({ onHome, onAbout, onLeaderboard, onPrivacy, onDisclaimer }) {
  // ⬇️ Your real links/handles
  const INSTAGRAM_URL = "https://www.instagram.com/jes_diaz01/";
  const DISCORD_URL = "https://discord.gg/vpdswhYcpd";
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
            <a href="#" onClick={(e) => { e.preventDefault(); if (onPrivacy) onPrivacy(); }}>Privacy Policy</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (onDisclaimer) onDisclaimer(); }}>Disclaimer</a>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Connect</div>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="footer-social">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56-.79.31-1.46.72-2.13 1.38C1.35 2.67.94 3.34.63 4.13c-.3.76-.5 1.63-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.63.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.33 1.35 20.66.94 19.87.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-10.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" />
              </svg>
              Instagram
            </a>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="footer-social">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M20.32 4.37A19.79 19.79 0 0016.56 3c-.2.36-.43.85-.59 1.23a18.27 18.27 0 00-5.5 0C10.31 3.85 10.07 3.36 9.87 3a19.74 19.74 0 00-3.76 1.37C2.55 8.06 1.97 11.65 2.27 15.19a19.9 19.9 0 005.99 3.03c.48-.66.91-1.36 1.28-2.1-.7-.27-1.37-.6-2-.98.17-.13.34-.26.5-.4 3.86 1.8 8.04 1.8 11.86 0 .16.14.33.27.5.4-.63.38-1.3.71-2 .98.37.74.8 1.44 1.28 2.1a19.86 19.86 0 005.99-3.03c.36-4.1-.61-7.66-2.55-10.82zM8.84 13.16c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4zm6.32 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4z" />
              </svg>
              Discord
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
        <span>© {new Date().getFullYear()} Versus Arena. All rights reserved.</span>
        <span className="footer-fineprint">Built for fans, by a fan.</span>
      </div>
    </footer>
  );
}