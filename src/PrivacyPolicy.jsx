import NavBar from "./NavBar";
// src/PrivacyPolicy.jsx
// Privacy policy page for Versus Arena.
// Matches your About page: its own simple navbar with a "Back to Arena" link
// (reusing your existing navbar / logo / nav-links / fight-btn classes), plus its
// own scoped styles for the policy text. It uses the CSS variables already defined
// in App.css, so it needs no changes to App.css.
//
// Takes the shared onNavigate(target) callback (same pattern as every page) for
// the site nav and the "back to the arena" CTA.

export default function PrivacyPolicy({ onNavigate }) {
  return (
    <div className="privacy-page">
      <NavBar onNavigate={onNavigate} active="privacy" />

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
          <p className="pp-updated">Last updated: July 24, 2026</p>

          <div className="pp-tldr">
            <strong>The short version</strong>
            <p style={{ margin: 0 }}>
              You can use Versus Arena without an account, we don't track you across the
              web, and we don't sell your data. If you choose to create an account, we
              collect your email and a password (handled securely by our authentication
              provider) so you can sign in and keep your battles. Either way, two things
              to know: the battles you run are saved to our database (so they load fast
              and can be shared by link), and any battle can be opened by anyone who has
              its share link. Any image you upload stays on your own device. Please don't
              type anything private into a battle.
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
              Anthropic, to generate a verdict, and are saved to our database along
              with the verdict. Each saved battle gets a share link that anyone can
              open. Please don't put personal or sensitive information into these
              fields, since saved battles are stored and can be shared publicly.
            </li>
            <li>
              <strong>Saved battles.</strong> We keep saved battles indefinitely,
              because they power two things: instant results when a matchup has been
              run before, and shareable battle links. Battles themselves are stored
              anonymously in a shared cache. If you are signed in, we separately record
              which battles are yours so you can find them again; that link between you
              and a battle is private to your account and is never part of the public
              share link.
            </li>
            <li>
              <strong>Images you upload.</strong> If you upload your own image for a
              fighter, it stays in your browser for that session only. It is never sent
              to or stored on our servers.
            </li>
            <li>
              <strong>Feedback on verdicts.</strong> If you use the "Disagree with the
              outcome?" option after a battle, we save the two characters, the verdict
              you disagreed with, the reason you picked, and your optional written note,
              so we can improve the judging. That note is free text and is stored in our
              database, so please don't include personal information in it.
            </li>
            <li>
              <strong>Crash reports.</strong> If the site hits an unexpected error in
              your browser, it automatically sends us a diagnostic report containing the
              error message and technical stack trace, the page address you were on
              (which may include a battle share link), and your browser's user-agent
              string. We use these only to find and fix bugs.
            </li>
            <li>
              <strong>Technical information.</strong> Like almost every website, our
              hosting provider (Vercel) records standard request information, including
              your IP address, in operational logs. We also store your IP briefly in our
              rate-limiting system (Upstash) to count requests and block abuse; those
              records expire automatically after a short time. We use this only to keep
              the site running and secure, and we don't use it to build a profile of you
              or attach it to your saved battles.
            </li>
            <li>
              <strong>Accounts.</strong> Accounts are optional - you can use the whole
              site without one. If you create an account, we collect your email address
              and a password so you can sign in. Passwords are handled and stored
              securely by our authentication provider (Supabase Auth); we never see or
              store your password in plain text. We use your email to sign you in, to
              send account emails such as confirmation and password-reset links, and to
              contact you about your account if needed.
            </li>
            <li>
              <strong>Analytics and cookies.</strong> We use Vercel Web Analytics, a
              privacy-friendly, cookieless analytics tool, to count visits and page views
              so we can understand how the site is used. It does not use tracking cookies
              and does not track you across other websites.
            </li>
            <li>
              <strong>Email.</strong> If you email us, we'll have whatever you choose to
              send (your address and your message), used only to reply to you.
            </li>
          </ul>

          <h2>How we use information</h2>
          <p>
            To run the site and generate your verdicts, to create and secure your
            account and sign you in if you choose to register, to prevent abuse and keep
            our costs under control through rate limiting, and to respond to you if you
            get in touch.
          </p>

          <h2>Shared battle links</h2>
          <p>
            When you share a battle, we create a public link (like
            versus-arena.vercel.app/?b=... ) that shows that battle's characters,
            settings, and verdict to anyone who opens it. There is no password on these
            links. Because of this, treat anything you type into a battle as potentially
            public, and don't enter private information.
          </p>

          <h2>Who we share information with</h2>
          <ul>
            <li>
              <strong>Anthropic</strong>, our AI provider, which processes your battle
              inputs to create verdicts under its own terms and privacy policy.
            </li>
            <li>
              <strong>Supabase</strong>, our database and authentication provider, which
              stores your saved battles and verdicts and, if you create an account, your
              account details (your email and a securely hashed password).
            </li>
            <li>
              <strong>Upstash</strong>, which handles rate limiting and abuse prevention
              and briefly stores IP addresses.
            </li>
            <li>
              <strong>Vercel</strong>, our hosting provider, which serves the site and
              keeps the standard logs described above.
            </li>
            <li>
              <strong>Cloudflare</strong>, which provides the anti-bot verification
              challenge on our sign-in and sign-up forms, and receives your IP address
              and basic browser signals in order to tell real people from bots.
            </li>
            <li>
              <strong>Fandom and Wikipedia.</strong> When the site looks up a character
              image, it may send the character name and universe you typed to these
              sites to find a match.
            </li>
          </ul>
          <p>
            We do not sell your personal information, and we don't share it with
            advertisers.
          </p>

          <h2>Links to other services</h2>
          <p>
            The site links out to places like TikTok and Discord, and offers an email
            contact. Once you leave Versus Arena for one of those, you're covered by that
            service's own privacy policy, not this one.
          </p>

          <h2>Children's privacy</h2>
          <p>
            Versus Arena is intended for people aged 13 and older, and you must be at
            least 13 to create an account. We do not knowingly collect personal
            information from children under 13. If you're a parent or guardian and you
            believe your child under 13 has provided us information (for example, by
            emailing us or creating an account), please contact us at the address below
            and we'll delete it.
          </p>

          <h2>Your choices</h2>
          <p>
            If you have an account, you can manage your own battles from the My Battles
            page: "Remove" takes a battle out of your history (the battle itself stays
            saved and its share link keeps working), and "Delete" permanently erases the
            battle itself, so its share link stops working for everyone. If you'd rather
            not do it yourself, or the battle was run without an account, email us at
            versusarenahq@gmail.com with its share link and we'll delete it. You can also
            delete your whole account from the account page, which removes your sign-in
            details and your saved battle history. The battles themselves stay in the
            Arena, but nothing links them to you once the account is gone, so please
            delete any battle containing private information before closing your account. For anonymous battles, because we don't attach an
            identity to them, we may not be able to locate all of your data without the
            specific share links. If you'd like to know what we have, or ask us to delete
            something like an email you've sent us, just reach out. Depending on where
            you live, you may have rights under laws like the GDPR or CCPA, and we'll
            honor reasonable requests.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy as the site grows. Optional accounts, which this
            policy previously listed as a future feature, are now being introduced and
            are described above. When we make changes, we'll update the "last updated"
            date at the top of this page.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy? Email us at{" "}
            <a href="mailto:versusarenahq@gmail.com">versusarenahq@gmail.com</a>.
          </p>

          <div className="pp-cta">
            <button className="fight-btn" onClick={() => onNavigate && onNavigate("home")}>
              Back to the Arena
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}