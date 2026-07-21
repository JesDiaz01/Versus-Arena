// src/NavBar.jsx
// The single site-wide navigation bar. Every page renders this, so navigation is
// always available instead of collapsing to a lone "Back to the Arena" link the
// moment you leave the home page (which also left "Battles" visible only on the
// one page where it did nothing).
//
// Navigation is expressed as ONE onNavigate(target) callback rather than a
// separate handler per link, so a page only has to forward a single prop. App
// owns the routing and treats "goku" as its one special case.
//
// `active` highlights the current page. It reads the session itself, so the
// signed-in-only links stay correct without every page having to pass a user.

import { useAuth } from "./AuthContext";

export default function NavBar({ onNavigate, active }) {
  const { user } = useAuth();

  function go(target) {
    return function (e) {
      e.preventDefault();
      if (onNavigate) onNavigate(target);
    };
  }

  function link(target, label, extraClass) {
    const classes = [extraClass, active === target ? "active" : ""]
      .filter(Boolean)
      .join(" ");
    return (
      <li>
        <a href="#" className={classes || undefined} onClick={go(target)}>
          {label}
        </a>
      </li>
    );
  }

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <a className="logo" href="#" onClick={go("home")}>
          VERSUS<span> ARENA</span>
        </a>
        <ul className="nav-links">
          {/* "Battles" now actually routes home (it was a dead href="#"). */}
          {link("home", "Battles", "nav-nowrap")}
          {link("leaderboard", "Leaderboard")}
          {link("tools", "Tools")}
          {link("categories", "Categories")}
          {link("about", "About")}
          {link("faq", "FAQ")}
          {link("goku", "vs Goku?", "nav-goku")}
          {user && link("mybattles", "My Battles", "nav-nowrap")}
          {/* Signed out -> acquisition CTA. Signed in -> the account page. */}
          {link("signup", user ? "Account" : "Sign Up Free", "nav-cta nav-nowrap")}
        </ul>
      </div>
    </nav>
  );
}
