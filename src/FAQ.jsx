// FAQ / Help page. Presentational only - reuses the same about-* shell that About.jsx
// uses (its own minimal navbar, about-container, and the "Enter the Arena" CTA), routed
// by page-state in App.jsx (setPage("faq")) and wrapped there with the shared Footer
// like every other page. Discord + email are the same real handles used in Footer.jsx.
//
// Each Q&A is a collapsible accordion item: the question is a focusable <button> and the
// answer is hidden until clicked. Open state is plain per-item React state (no storage,
// no deps); multiple items may be open at once.
import { useState } from "react";

const DISCORD_URL = "https://discord.gg/vpdswhYcpd";
const CONTACT_EMAIL = "versusarenahq@gmail.com";

// Reused from Footer.jsx so the Discord mark stays identical across the site.
function DiscordIcon() {
  return (
    <svg className="faq-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M20.32 4.37A19.79 19.79 0 0016.56 3c-.2.36-.43.85-.59 1.23a18.27 18.27 0 00-5.5 0C10.31 3.85 10.07 3.36 9.87 3a19.74 19.74 0 00-3.76 1.37C2.55 8.06 1.97 11.65 2.27 15.19a19.9 19.9 0 005.99 3.03c.48-.66.91-1.36 1.28-2.1-.7-.27-1.37-.6-2-.98.17-.13.34-.26.5-.4 3.86 1.8 8.04 1.8 11.86 0 .16.14.33.27.5.4-.63.38-1.3.71-2 .98.37.74.8 1.44 1.28 2.1a19.86 19.86 0 005.99-3.03c.36-4.1-.61-7.66-2.55-10.82zM8.84 13.16c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4zm6.32 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4z" />
    </svg>
  );
}

// Generic envelope (same outline mark Footer.jsx uses for Contact) - not a brand logo.
function MailIcon() {
  return (
    <svg className="faq-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

function FaqItem({ q, isOpen, onToggle, children }) {
  return (
    <div className="faq-item">
      <button type="button" className="faq-q" aria-expanded={isOpen} onClick={onToggle}>
        <span className="faq-q-text">{q}</span>
        <svg className="faq-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={isOpen ? "faq-answer open" : "faq-answer"}>
        <div className="faq-answer-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function FAQ({ onBack }) {
  // Map of index -> open. Toggling one never closes the others (multiple-open accordion).
  const [openItems, setOpenItems] = useState({});
  const toggle = (i) => setOpenItems((prev) => ({ ...prev, [i]: !prev[i] }));

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
        <div className="about-tag">Help</div>
        <h1 className="about-title">Frequently Asked <span className="vs-word">Questions</span></h1>

        <div className="faq-list">
          <FaqItem q="Why don't some character images load?" isOpen={!!openItems[0]} onToggle={() => toggle(0)}>
            <p className="faq-a">
              Character art is pulled in automatically from public fan wikis. Well-known
              characters usually resolve right away, but obscure, brand-new, or niche
              characters sometimes can't be found, so you'll see a plain silhouette
              instead. That's expected, not a bug.
            </p>
          </FaqItem>

          <FaqItem q="How do I fix a missing or wrong image?" isOpen={!!openItems[1]} onToggle={() => toggle(1)}>
            <p className="faq-a">
              Click <strong>Use My Own Image</strong> under the fighter and either paste
              an image URL or upload your own picture. It works for any character and is
              the reliable way to set exactly the art you want.
            </p>
          </FaqItem>

          <FaqItem q="What does the Universe / Series field do?" isOpen={!!openItems[2]} onToggle={() => toggle(2)}>
            <p className="faq-a">
              It does two things: it points us to the character's home wiki for better
              art, and it gives the judge extra context for the matchup. Filling it in
              improves image accuracy. Some very obscure characters still won't resolve
              even with it, and that's what <strong>Use My Own Image</strong> is for.
            </p>
          </FaqItem>

          <FaqItem q="How do Custom Feats / Lore work?" isOpen={!!openItems[3]} onToggle={() => toggle(3)}>
            <p className="faq-a">
              They're optional notes you add to a fighter: specific abilities, feats, or
              lore you want the judge to weigh. Anything you add is considered in the
              verdict, so it's the place to fill in what a wiki might be missing.
            </p>
          </FaqItem>

          <FaqItem q="How does the judging work?" isOpen={!!openItems[4]} onToggle={() => toggle(4)}>
            <p className="faq-a">
              Each fighter is weighed on their established feats plus any Custom Feats /
              Lore you provide, and both sides are held to the same standard to reach a
              verdict. It's a feat-driven judgment meant to be fair and consistent: a
              well-reasoned take, not the final word.
            </p>
          </FaqItem>

          <FaqItem q="How do I get in touch or report something?" isOpen={!!openItems[5]} onToggle={() => toggle(5)}>
            <p className="faq-a">
              Join the Discord or email us. We read suggestions and bug reports.
            </p>
            <div className="faq-contact">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="faq-link">
                <DiscordIcon />
                discord.gg/vpdswhYcpd
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="faq-link">
                <MailIcon />
                {CONTACT_EMAIL}
              </a>
            </div>
          </FaqItem>
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
