// src/PrivacyPolicy.jsx
// Privacy policy page for Versus Arena.
// Matches your About page: its own simple navbar with a "Back to Arena" link
// (reusing your existing navbar / logo / nav-links / fight-btn classes), plus its
// own scoped styles for the policy text. It uses the CSS variables already defined
// in App.css, so it needs no changes to App.css.
//
// Takes an onBack callback (same pattern as About.jsx) to return to the arena.

export default function PrivacyPolicy({ onBack }) {
  const goBack = (e) => {
    if (e) e.preventDefault();
    if (onBack) onBack();
  };

  return (
    <div className="privacy-page">
      <nav className="navbar">
        <a className="logo" href="#" onClick={goBack}>
          VERSUS<span> ARENA</span>
        </a>
        <ul className="nav-links">
          <li><a href="#" className="nav-back-link" onClick={goBack}>Back to the Arena</a></li>
        </ul>
      </nav>

      <div className="pp-wrap">
        <style>{`
          .privacy-page { background: var(--bg); min-height: 100vh; }
          .pp-wrap {
            width: 100%;
            display: flex;
            justify-content: center;
            padding: 40px 24px 88px;
            color: var(--ink);
          }
          .pp-inner { width: 100%; max-width: 760px; }
          .pp-title {
            font-family: "Cinzel", serif;
            font-weight: 900;
            font-size: 40px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin: 0 0 8px;
            color: var(--ink);
          }
          .pp-updated {
            font-family: "Inter", sans-serif;
            font-size: 13px;
            color: var(--muted);
            margin: 0 0 36px;
          }
          .pp-tldr {
            background: var(--surface-2);
            border-left: 3px solid var(--gold);
            border-radius: 6px;
            padding: 18px 22px;
            margin: 0 0 40px;
          }
          .pp-tldr strong {
            font-family: "Cinzel", serif;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            font-size: 13px;
            color: var(--gold);
            display: block;
            margin-bottom: 8px;
          }
          .pp-inner h2 {
            font-family: "Cinzel", serif;
            font-weight: 700;
            font-size: 20px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--ink);
            margin: 40px 0 14px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--line);
          }
          .pp-inner p,
          .pp-inner li {
            font-family: "Inter", sans-serif;
            font-size: 16px;
            line-height: 1.75;
            color: var(--ink-soft);
            margin: 0 0 14px;
          }
          .pp-inner ul { margin: 0 0 14px; padding-left: 20px; }
          .pp-inner li { margin-bottom: 10px; }
          .pp-inner li strong { color: var(--ink); }
          .pp-inner a {
            color: var(--gold);
            text-decoration: none;
            border-bottom: 1px solid var(--line-strong);
          }
          .pp-inner a:hover { color: var(--gold-bright); }
          .pp-cta { margin-top: 44px; text-align: center; }
          @media (max-width: 768px) {
            .pp-wrap { padding: 28px 18px 64px; }
            .pp-title { font-size: 30px; }
          }
        `}</style>

        <div className="pp-inner">
          <h1 className="pp-title">Privacy Policy</h1>
          <p className="pp-updated">Last updated: June 5, 2026</p>

          <div className="pp-tldr">
            <strong>The short version</strong>
            <p style={{ margin: 0 }}>
              We don't make you create an account, we don't track you across the web,
              and we don't sell your data. The text you type into a battle is sent to
              our AI provider to generate a verdict, and any image you upload stays on
              your own device. That is basically it.
            </p>
          </div>

          <p>
            Versus Arena ("we," "us," or "the site") lets you compare fictional
            characters and get an AI-generated verdict on who would win. We try to keep
            things simple and to collect as little as possible. This page explains, in
            plain terms, what that means.
          </p>

          <h2>What we collect (and what we don't)</h2>
          <ul>
            <li>
              <strong>Battle inputs.</strong> The fighter names, universes, settings,
              and any granted abilities you enter are sent to our AI provider,
              Anthropic, so it can generate a verdict. Please don't put personal or
              sensitive information into these fields, since they're meant for fictional
              matchups. We don't save your battle inputs on our own servers after the
              verdict is generated.
            </li>
            <li>
              <strong>Images you upload.</strong> If you upload your own image for a
              fighter, it stays in your browser for that session only. It is never sent
              to or stored on our servers.
            </li>
            <li>
              <strong>Technical information.</strong> Like almost every website, our
              hosting provider (Vercel) automatically records standard request
              information, including your IP address, in operational logs. We use this
              only to keep the site running and secure, and to power basic rate limiting
              (which stops any one visitor from overloading the site). We don't use it to
              build a profile of you.
            </li>
            <li>
              <strong>Accounts.</strong> We don't have accounts or logins yet, so we
              don't collect names, passwords, or profiles. If that changes, we'll update
              this policy first.
            </li>
            <li>
              <strong>Analytics and cookies.</strong> Our own code includes no analytics
              or tracking tools, and we don't use tracking cookies.
            </li>
            <li>
              <strong>Email.</strong> If you email us, we'll have whatever you choose to
              send (your address and your message), used only to reply to you.
            </li>
          </ul>

          <h2>How we use information</h2>
          <p>
            To run the site and generate your verdicts, to prevent abuse and keep our
            costs under control through rate limiting, and to respond to you if you get
            in touch.
          </p>

          <h2>Who we share information with</h2>
          <ul>
            <li>
              <strong>Anthropic</strong>, our AI provider, which processes your battle
              inputs to create verdicts under its own terms and privacy policy.
            </li>
            <li>
              <strong>Vercel</strong>, our hosting provider, which serves the site and
              keeps the standard logs described above.
            </li>
          </ul>
          <p>
            We do not sell your personal information, and we don't share it with
            advertisers.
          </p>

          <h2>Links to other services</h2>
          <p>
            The site links out to places like Instagram and Discord, and offers an email
            contact. Once you leave Versus Arena for one of those, you're covered by that
            service's own privacy policy, not this one.
          </p>

          <h2>Children's privacy</h2>
          <p>
            Versus Arena is intended for people aged 13 and older. We do not knowingly
            collect personal information from children under 13. If you're a parent or
            guardian and you believe your child under 13 has provided us information (for
            example, by emailing us), please contact us at the address below and we'll
            delete it.
          </p>

          <h2>Your choices</h2>
          <p>
            Because we store so little, there usually isn't much personal data of yours
            for us to hand over or erase. Still, if you'd like to know what we have, or
            ask us to delete something (such as an email you've sent us), just reach out
            and we'll help. Depending on where you live, you may have rights under laws
            like the GDPR or CCPA, and we'll honor reasonable requests.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy as the site grows (for example, when we add
            accounts or save battle history). When we do, we'll change the "last updated"
            date at the top of this page.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy? Email us at{" "}
            <a href="mailto:versusarenahq@gmail.com">versusarenahq@gmail.com</a>.
          </p>

          <div className="pp-cta">
            <button className="fight-btn" onClick={() => onBack && onBack()}>
              Back to the Arena
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}