import { useState, useEffect, useRef } from "react";
import SplashScreen from "./SplashScreen";
import BattleArena, { DEFAULT_ADJUST } from "./BattleArena";
import SharedBattle from "./SharedBattle";
import About from "./About";
import FAQ from "./FAQ";
import Tools from "./Tools";
import Leaderboard from "./Leaderboard";
import Footer from "./Footer";
import PrivacyPolicy from "./PrivacyPolicy";
import Disclaimer from "./Disclaimer";
import ComingSoon from "./ComingSoon";
import AuthPanel from "./AuthPanel";
import MyBattles from "./MyBattles";
import { useAuth } from "./AuthContext";
import "./App.css";
import CanItBeatGoku from "./CanItBeatGoku";
import { PRESETS, PresetImg } from "./presets";

export default function App() {
  // Auth session, used only to gate the "My Battles" entry points (nav link +
  // account page). Anonymous users get user === null and see none of it.
  // `recovery` is true when the visitor arrived from a reset-password email.
  const { user, recovery } = useAuth();
  const [entered, setEntered] = useState(false);
  const [page, setPage] = useState("home");
  const [sharedBattle, setSharedBattle] = useState(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState(false);
  const [showGoku, setShowGoku] = useState(false);

  // Battle INPUT state lives here (not in BattleArena) so it survives in-site
  // navigation: App never unmounts, but BattleArena does when you switch pages,
  // which would otherwise destroy these. Passed down to BattleArena as props.
  // (Verdict result, loading, and cancel state stay inside BattleArena.)
  const [f1, setF1] = useState("");
  const [f2, setF2] = useState("");
  const [u1, setU1] = useState("");
  const [u2, setU2] = useState("");
  const [override1, setOverride1] = useState(null);
  const [override2, setOverride2] = useState(null);
  const [claims1, setClaims1] = useState([]);
  const [claims2, setClaims2] = useState([]);
  const [draft1, setDraft1] = useState("");
  const [draft2, setDraft2] = useState("");
  const [battleType, setBattleType] = useState("Standard Fight");
  const [location, setLocation] = useState("Neutral Terrain");
  const [power, setPower] = useState("Canon Only");
  const [depth, setDepth] = useState("Quick Verdict");
  const [imgAdjust1, setImgAdjust1] = useState(DEFAULT_ADJUST);
  const [imgAdjust2, setImgAdjust2] = useState(DEFAULT_ADJUST);
  const [imgAdjusted1, setImgAdjusted1] = useState(false);
  const [imgAdjusted2, setImgAdjusted2] = useState(false);

  // Hero "matchup spotlight" rotator. loadPresetRef is handed to BattleArena, which
  // registers its loadPreset into .current, so tapping a spotlight shows that preset's
  // STORED verdict (no fetch). One preset shown at a time, auto-advancing every 5s.
  const loadPresetRef = useRef(null);
  const [presetIndex, setPresetIndex] = useState(0);
  const [presetPaused, setPresetPaused] = useState(false);
  const prevPreset = () => setPresetIndex(i => (i - 1 + PRESETS.length) % PRESETS.length);
  const nextPreset = () => setPresetIndex(i => (i + 1) % PRESETS.length);
  // Auto-advance every 5s; pause on hover; reset on any change (presetIndex in deps);
  // disabled under prefers-reduced-motion and skipped when there is only one preset.
  useEffect(() => {
    if (presetPaused || PRESETS.length <= 1) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setPresetIndex(i => (i + 1) % PRESETS.length), 5000);
    return () => clearInterval(t);
  }, [presetPaused, presetIndex]);

  // Warm the browser cache with every preset image once on mount, so that when the
  // rotator swaps to the next matchup the new src is already decoded and paints
  // instantly instead of lingering on the previous card's image for a beat.
  useEffect(() => {
    PRESETS.forEach(p => {
      if (p.image1) { const a = new Image(); a.src = p.image1; }
      if (p.image2) { const b = new Image(); b.src = p.image2; }
    });
  }, []);

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
        // A missing/invalid battle or an API error surfaces a visible message
        // instead of silently dropping the user on the homepage.
        if (data && !data.error) setSharedBattle(data);
        else setSharedError(true);
      })
      .catch(function() { setSharedError(true); })
      .finally(function() { setSharedLoading(false); });
  }, []);

  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("b")) return;
    if (params.get("goku") !== null) {
      setEntered(true);
      setShowGoku(true);
    }
  }, []);

  // Re-open a saved battle by id from the My Battles list. Reuses the exact
  // shared-battle path (sharedLoading -> SharedBattle) the ?b= mount effect uses,
  // so no new render machinery is needed. Sets page to "home" first so the render
  // falls through the page routing to the sharedBattle branch, and points the URL
  // at ?b=<id> so a refresh/share still resolves the same battle.
  function openSavedBattle(id) {
    setPage("home");
    setSharedLoading(true);
    window.history.pushState({}, "", "?b=" + encodeURIComponent(id));
    fetch("/api/get-battle?id=" + encodeURIComponent(id))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && !data.error) setSharedBattle(data);
        else setSharedError(true);
      })
      .catch(function() { setSharedError(true); })
      .finally(function() { setSharedLoading(false); });
  }

  // Skip the splash when the visitor arrived from a reset-password link: making
  // them click "Press to Start" before they can set a new password would look like
  // the link was broken.
  if (!entered && !recovery) {
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
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
        />
      </>
    );
  }

  if (page === "faq") {
    return (
      <>
        <FAQ onBack={() => setPage("home")} />
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
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
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
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
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
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
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
        />
      </>
    );
  }

  if (page === "disclaimer") {
    return (
      <>
        <Disclaimer onBack={() => setPage("home")} />
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
        />
      </>
    );
  }

  // A reset-password link drops the user on whatever page the redirect targets
  // (usually home). Force the accounts page so the "set a new password" form is
  // actually visible -- otherwise the link appears to do nothing. Takes priority
  // over every other route, and clears itself once the password is saved.
  if (page === "signup" || recovery) {
    return (
      <>
        <ComingSoon
          // Signed in, the eyebrow states STATUS ("Signed In") rather than repeating
          // the title's "Account"; signed out it names the section. Kept as a string
          // either way so the shell's bordered tag never renders empty.
          tag={user ? "Signed In" : "Accounts"}
          title={user
            ? <>Your <span className="vs-word">Account</span></>
            : <>Join the <span className="vs-word">Arena</span></>}
          onBack={() => setPage("home")}
        >
          <AuthPanel onViewBattles={() => setPage("mybattles")} />
        </ComingSoon>
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
        />
      </>
    );
  }

  if (page === "categories") {
    return (
      <>
        <ComingSoon
          tag="Ranked Mode"
          title={<>Ranked <span className="vs-word">Mode</span></>}
          onBack={() => setPage("home")}
        >
          <div className="about-section">
            <p className="about-lead">Ranked Mode is coming soon.</p>
            <p>
              Battle other users head to head, climb the ranks, and prove your
              powerscaling. Every win moves you up the ladder; every upset shakes the
              standings.
            </p>
          </div>

          <div className="about-divider" />

          <div className="about-section">
            <h2 className="about-subtitle">What's Coming</h2>
            <ul className="leaderboard-list">
              <li>Head-to-head matches against other users</li>
              <li>A climbing rank and a global ladder</li>
              <li>Seasonal resets and placement battles</li>
            </ul>
            <p className="about-quiet">
              Not live yet - we're building it. For now, settle any debate in the Arena.
            </p>
          </div>
        </ComingSoon>
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
        />
      </>
    );
  }

  // "My Battles" is signed-in only: the branch is gated on `user`, so a logged-out
  // visitor (even one whose page state is stale) falls through to the normal app
  // instead of ever seeing the page.
  if (page === "mybattles" && user) {
    return (
      <>
        <MyBattles onBack={() => setPage("home")} onOpenBattle={openSavedBattle} />
        <Footer
          onHome={() => setPage("home")}
          onAbout={() => setPage("about")}
          onLeaderboard={() => setPage("leaderboard")}
          onPrivacy={() => setPage("privacy")}
          onDisclaimer={() => setPage("disclaimer")}
          onFaq={() => setPage("faq")}
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

  if (sharedError) {
    return (
      <div className="sb-loading-screen">
        <div className="sb-error">
          <div className="sb-loading-text">Battle not found</div>
          <p className="sb-error-text">
            This shared battle couldn't be loaded. The link may be broken or the
            battle may have expired.
          </p>
          <button
            className="fight-btn"
            onClick={function() {
              setSharedError(false);
              window.history.replaceState({}, "", window.location.pathname);
            }}
          >
            Go to the Arena
          </button>
        </div>
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

  if (showGoku) {
    return (
      <CanItBeatGoku
        onBackToArena={function() {
          setShowGoku(false);
          window.history.replaceState({}, "", window.location.pathname);
        }}
      />
    );
  }

  return (
    <div className="page">
      <nav className="navbar">
        <div className="nav-inner">
          <a className="logo" href="#">VERSUS<span> ARENA</span></a>
          <ul className="nav-links">
            <li><a href="#">Battles</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setPage("leaderboard"); }}>Leaderboard</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setPage("tools"); }}>Tools</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setPage("categories"); }}>Categories</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setPage("about"); }}>About</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setPage("faq"); }}>FAQ</a></li>
            <li><a href="#" className="nav-goku" onClick={(e) => { e.preventDefault(); setShowGoku(true); window.history.replaceState(null, "", "?goku=1"); }}>vs Goku?</a></li>
            {user && (
              <li><a href="#" className="nav-nowrap" onClick={(e) => { e.preventDefault(); setPage("mybattles"); }}>My Battles</a></li>
            )}
            {/* Signed out -> "Sign Up Free" (acquisition CTA). Signed in -> "Account",
                which opens the same page, where AuthPanel renders the signed-in view
                (email + View My Battles + Sign Out). Showing "Sign Up Free" to someone
                who is already signed in makes no sense. */}
            <li>
              <a
                href="#"
                className="nav-cta nav-nowrap"
                onClick={(e) => { e.preventDefault(); setPage("signup"); }}
              >
                {user ? "Account" : "Sign Up Free"}
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-tag">Settle the debate</div>
        <h1>Who Would<br /><span className="vs-word">Win?</span></h1>
        <p className="hero-sub">
          Pick any two fictional characters from any universe.
          Every verdict is weighed against feats, powerscaling, and lore.
        </p>

        {/* Matchup spotlight: a wide cinematic band below the hero title. < > change the
            matchup; tapping the band shows its STORED verdict via the loadPreset BattleArena
            registered on loadPresetRef. Auto-advances every 5s (paused on hover). */}
        <div
          className="spotlight"
          onMouseEnter={() => setPresetPaused(true)}
          onMouseLeave={() => setPresetPaused(false)}
        >
          <button type="button" className="spotlight-arrow left" onClick={prevPreset} aria-label="Previous matchup">{"<"}</button>
          <button
            type="button"
            className="spotlight-band"
            onClick={() => { const p = PRESETS[presetIndex]; if (loadPresetRef.current) loadPresetRef.current(p); }}
            aria-label={"Show verdict: " + PRESETS[presetIndex].label}
          >
            <PresetImg key={PRESETS[presetIndex].id + "-1"} src={PRESETS[presetIndex].image1} side="left" pos={PRESETS[presetIndex].leftPos} scale={PRESETS[presetIndex].leftScale} />
            <PresetImg key={PRESETS[presetIndex].id + "-2"} src={PRESETS[presetIndex].image2} side="right" pos={PRESETS[presetIndex].rightPos} scale={PRESETS[presetIndex].rightScale} />
            <span className="spotlight-vs">VS</span>
            <div className="spotlight-caption">
              <span className="spotlight-title">{PRESETS[presetIndex].label}</span>
              <span className="spotlight-hint">Tap to see the verdict</span>
            </div>
          </button>
          <button type="button" className="spotlight-arrow right" onClick={nextPreset} aria-label="Next matchup">{">"}</button>
        </div>
      </div>

      <BattleArena
        f1={f1} setF1={setF1} f2={f2} setF2={setF2}
        u1={u1} setU1={setU1} u2={u2} setU2={setU2}
        override1={override1} setOverride1={setOverride1}
        override2={override2} setOverride2={setOverride2}
        claims1={claims1} setClaims1={setClaims1}
        claims2={claims2} setClaims2={setClaims2}
        draft1={draft1} setDraft1={setDraft1}
        draft2={draft2} setDraft2={setDraft2}
        battleType={battleType} setBattleType={setBattleType}
        location={location} setLocation={setLocation}
        power={power} setPower={setPower}
        depth={depth} setDepth={setDepth}
        imgAdjust1={imgAdjust1} setImgAdjust1={setImgAdjust1}
        imgAdjust2={imgAdjust2} setImgAdjust2={setImgAdjust2}
        imgAdjusted1={imgAdjusted1} setImgAdjusted1={setImgAdjusted1}
        imgAdjusted2={imgAdjusted2} setImgAdjusted2={setImgAdjusted2}
        loadPresetRef={loadPresetRef}
      />

      <Footer
        onHome={() => setPage("home")}
        onAbout={() => setPage("about")}
        onLeaderboard={() => setPage("leaderboard")}
        onPrivacy={() => setPage("privacy")}
        onDisclaimer={() => setPage("disclaimer")}
        onFaq={() => setPage("faq")}
      />
    </div>
  );
}