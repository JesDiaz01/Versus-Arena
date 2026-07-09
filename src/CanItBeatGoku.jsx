import { useState, useMemo } from "react";
import FeatWheel from "./FeatWheel";
import { CATEGORIES, GOKU, LADDER, decideOutcome, FLAVOR_TEXT, fillTemplate, tierNames, tierDesc } from "./gokuData";
import "./CanItBeatGoku.css";

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeInitialResults() {
  var r = {};
  CATEGORIES.forEach(function(cat) { r[cat.key] = null; });
  return r;
}

// Presentation-only copy for the bracket-select cards. Deliberately kept here rather
// than on LADDER so the ladder data stays purely mechanical (stats + revoke flag).
const BRACKET_META = {
  EASY:    { tier: "Street to city tier",      pips: 1 },
  MID:     { tier: "Town to planet tier",      pips: 2 },
  HARD:    { tier: "Star to galaxy tier",      pips: 3 },
  EXTREME: { tier: "Universe tier and beyond", pips: 4 }
};
const PIP_TOTAL = 4;

// Gold difficulty indicator: `level` filled pips out of `total`.
function DifficultyPips({ level, total }) {
  var pips = [];
  for (var i = 0; i < total; i++) {
    pips.push(<span key={i} className={"cbg-pip" + (i < level ? " cbg-pip--on" : "")} />);
  }
  return (
    <span className="cbg-pips" role="img" aria-label={"Difficulty " + level + " of " + total}>
      {pips}
    </span>
  );
}

// Left chevron for the "Back to Brackets" control. Inherits currentColor so it
// picks up the .cbg-back-btn gold hover along with the label.
function BackArrow() {
  return (
    <svg
      className="cbg-back-arrow"
      viewBox="0 0 24 24"
      width="13"
      height="13"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5 L8 12 L15 19" />
    </svg>
  );
}

// The single free continue in an arcade run. Gold fill on the cream surface.
function RetryHeart() {
  return (
    <svg className="cbg-heart-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M12 21s-7.5-4.7-9.5-9.2C1.1 8.6 2.6 5.5 5.6 4.7c1.9-.5 3.9.3 5 1.9 1.1-1.6 3.1-2.4 5-1.9 3 .8 4.5 3.9 3.1 7.1C19.5 16.3 12 21 12 21z"
        fill="var(--gold)"
        stroke="var(--gold-bright)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CanItBeatGoku({ onBackToArena }) {
  var [mode, setMode] = useState("classic");   // "classic" (original vs Goku) | "arcade"
  var [results, setResults] = useState(makeInitialResults);
  var [step, setStep] = useState(0);

  // Arcade run state. Ephemeral by design: no persistence, a refresh resets the run.
  var [bracketKey, setBracketKey] = useState(null); // null renders the bracket-select screen
  var [rungIndex, setRungIndex] = useState(0);      // 0..2 within the chosen bracket
  var [retryUsed, setRetryUsed] = useState(false);  // the one free heart, per run
  var [runId, setRunId] = useState(0);              // bumped to force a fresh FeatWheel mount

  var arcade = mode === "arcade";

  var bracket = null;
  if (arcade && bracketKey) {
    for (var b = 0; b < LADDER.length; b++) {
      if (LADDER[b].key === bracketKey) { bracket = LADDER[b]; break; }
    }
  }

  var done = step >= CATEGORIES.length;
  var currentCat = done ? null : CATEGORIES[step];
  var currentResult = currentCat ? results[currentCat.key] : null;

  // Classic always fights Goku; arcade fights the current rung of the chosen bracket.
  var opponent = arcade ? (bracket ? bracket.opponents[rungIndex] : null) : GOKU;
  var allowRevoke = (arcade && bracket) ? bracket.revoke : true;
  var lastRung = bracket ? bracket.opponents.length - 1 : 0;

  // Recomputes per FIGHT. The old key was [done] alone, which froze the first verdict:
  // across a ladder run `results` stays fixed while the opponent changes, so the memo
  // has to depend on the opponent identity (bracket + rung) and the run.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  var outcomeData = useMemo(function() {
    if (!done || !opponent) return null;
    return decideOutcome(results, opponent, { allowRevoke: allowRevoke });
  }, [done, mode, bracketKey, rungIndex, runId]);

  // FLAVOR_TEXT is Goku-specific prose, so Phase 1 arcade shows no flavor line.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  var flavorLine = useMemo(function() {
    if (!outcomeData || arcade) return null;
    var line = randomPick(FLAVOR_TEXT[outcomeData.bucket]);
    return fillTemplate(line, {
      strength:   results.strength,
      speed:      results.speed,
      iq:         results.iq,
      fighting:   results.fighting,
      durability: results.durability
    });
  }, [outcomeData, arcade]);

  // A DRAW is not a win: in arcade it ends the run like any loss.
  var isWin = outcomeData ? outcomeData.bucket.endsWith("_WIN") : false;
  var cleared = arcade && isWin && rungIndex === lastRung;

  // Advance to the next feat (or, from the last feat, reveal the verdict).
  // The next wheel mounts with autoSpin, so this single action both advances
  // and spins it.
  function handleAdvance() {
    setStep(function(s) { return s + 1; });
  }

  // A "fresh spin" means remounting the wheel: FeatWheel guards handleSpin behind an
  // internal hasSpun that it never resets, so bumping runId (part of its key) is what
  // actually re-arms it.
  function freshSpin() {
    setResults(makeInitialResults());
    setStep(0);
    setRunId(function(r) { return r + 1; });
  }

  function handleRespinAll() {
    freshSpin();
  }

  function startBracket(key) {
    setBracketKey(key);
    setRungIndex(0);
    setRetryUsed(false);
    freshSpin();
  }

  // Stats are spun once per run, so advancing just re-resolves the frozen fighter
  // against the next opponent - no new spin.
  function nextOpponent() {
    setRungIndex(function(r) { return r + 1; });
  }

  function spendHeart() {
    setRetryUsed(true);
    setRungIndex(0);
    freshSpin();
  }

  function backToSelect() {
    setBracketKey(null);
    setRungIndex(0);
    setRetryUsed(false);
    freshSpin();
  }

  function toggleMode() {
    setMode(arcade ? "classic" : "arcade");
    setBracketKey(null);
    setRungIndex(0);
    setRetryUsed(false);
    freshSpin();
  }

  var showBracketSelect = arcade && !bracketKey;
  // Inside a bracket run: the fight, death, and cleared screens. Their "up one level"
  // is bracket-select, not classic mode.
  var inArcadeRun = arcade && !!bracketKey;

  return (
    <div className="cbg-page">
      <div className="cbg-topbar">
        <button className="cbg-back-btn" onClick={onBackToArena}>
          Back to the Arena
        </button>
        {/* One "up one level" action per screen, never a control that changes
            destination by context. Inside a run that level is bracket-select; at
            bracket-select (and in classic) it is the mode toggle. */}
        {inArcadeRun ? (
          <button className="cbg-back-btn cbg-back-brackets-btn" onClick={backToSelect}>
            <BackArrow />
            Back to Brackets
          </button>
        ) : (
          <button className="cbg-mode-btn" onClick={toggleMode}>
            {arcade ? "Classic Mode" : "Arcade Mode"}
          </button>
        )}
      </div>

      <div className={"cbg-container" + (showBracketSelect ? " cbg-container--center" : "")}>
        <header className="cbg-header">
          <h1 className="cbg-title">{arcade ? "ARCADE LADDER" : "CAN IT BEAT GOKU?"}</h1>
          {arcade ? (
            <p className="cbg-subtitle">Spin your fighter once, then beat all three. You get one retry.</p>
          ) : (
            <>
              <p className="cbg-subtitle">Spin every wheel. Survive the comparison.</p>
              <p className="cbg-subtitle">Put your own OC against Goku. Will they prevail?</p>
            </>
          )}
        </header>

        {showBracketSelect && (
          <div className="cbg-bracket-select">
            <div className="cbg-eyebrow">CHOOSE YOUR BRACKET</div>
            <div className="cbg-bracket-grid">
              {LADDER.map(function(br) {
                var meta = BRACKET_META[br.key] || { tier: "", pips: 0 };
                return (
                  <button
                    key={br.key}
                    className="cbg-bracket-card"
                    onClick={function() { startBracket(br.key); }}
                  >
                    <span className="cbg-bracket-label">{br.label}</span>
                    <span className="cbg-bracket-tier">{meta.tier}</span>
                    <DifficultyPips level={meta.pips} total={PIP_TOTAL} />
                    <span className="cbg-bracket-roster">
                      {br.opponents.map(function(o) { return o.version; }).join(" / ")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!showBracketSelect && (
          <>
            {arcade && bracket && opponent && (
              <div className="cbg-arcade-status">
                <span className="cbg-arcade-bracket">{bracket.label}</span>
                <span className="cbg-arcade-rung">
                  Opponent {rungIndex + 1} of {bracket.opponents.length}: <strong>{opponent.version}</strong>
                </span>
                <span className={"cbg-arcade-heart" + (retryUsed ? " cbg-arcade-heart--spent" : "")}>
                  <RetryHeart />
                  {retryUsed ? "Retry spent" : "1 retry"}
                </span>
              </div>
            )}

            {!done && currentCat && (
              <div className="cbg-progress">
                Stat {step + 1} of {CATEGORIES.length}
              </div>
            )}

            <div className="cbg-layout">
              <div className="cbg-wheel-col">
                {!done && currentCat && (
                  <div className="cbg-step-area">
                    <div className="cbg-wheel-heading">
                      <div className="cbg-wheel-title">{currentCat.title}</div>
                      <p className="cbg-cat-blurb">{currentCat.blurb}</p>
                    </div>

                    <FeatWheel
                      key={runId + ":" + currentCat.key}
                      items={tierNames(currentCat.items)}
                      autoSpin={step > 0}
                      onAdvanceRequest={handleAdvance}
                      hubLabel={currentResult && step === CATEGORIES.length - 1 ? "Verdict" : "Spin"}
                      onSpinStart={function() {
                        setResults(function(r) {
                          var next = Object.assign({}, r);
                          next[currentCat.key] = null;
                          return next;
                        });
                      }}
                      onResult={function(val) {
                        setResults(function(r) {
                          var next = Object.assign({}, r);
                          next[currentCat.key] = val;
                          return next;
                        });
                      }}
                      size={500}
                    />

                    {currentResult && tierDesc(currentCat.items, currentResult) !== "" && (
                      <p className="cbg-tier-desc">{tierDesc(currentCat.items, currentResult)}</p>
                    )}
                  </div>
                )}

                {done && outcomeData && (
                  <div className="cbg-verdict-card">
                    <div className="cbg-eyebrow">{cleared ? "BRACKET CLEARED" : "VERDICT"}</div>

                    <h2 className="cbg-headline">
                      {arcade
                        ? (isWin
                            ? "YOU BEAT " + opponent.version.toUpperCase()
                            : outcomeData.bucket === "DRAW"
                              ? "DEAD EVEN"
                              : opponent.version.toUpperCase() + " WINS")
                        : (outcomeData.bucket.endsWith("_WIN") ? "THEY BEAT GOKU" :
                           outcomeData.bucket === "DRAW"       ? "DEAD EVEN"      : "GOKU WINS")}
                    </h2>

                    {!arcade && (
                      <>
                        <p className="cbg-flavor"><strong>{flavorLine}</strong></p>
                        <button className="cbg-respin-btn" onClick={handleRespinAll}>
                          Respin All
                        </button>
                      </>
                    )}

                    {arcade && isWin && !cleared && (
                      <button className="cbg-continue-btn" onClick={nextOpponent}>
                        Next Opponent
                      </button>
                    )}

                    {arcade && cleared && (
                      <div className="cbg-cleared">
                        <p className="cbg-cleared-text">
                          The {bracket.label} bracket is cleared. All three opponents down.
                        </p>
                        <button className="cbg-continue-btn" onClick={backToSelect}>
                          Choose Another Bracket
                        </button>
                      </div>
                    )}

                    {arcade && !isWin && (
                      <div className="cbg-death">
                        <p className="cbg-death-text">
                          {outcomeData.bucket === "DRAW"
                            ? "A draw is not a win. " + opponent.version + " holds the line."
                            : "Your fighter falls to " + opponent.version + "."}
                        </p>
                        {retryUsed ? (
                          <>
                            <div className="cbg-gameover">Game Over</div>
                            <button className="cbg-respin-btn" onClick={backToSelect}>
                              Back to Bracket Select
                            </button>
                          </>
                        ) : (
                          <button className="cbg-heart-btn" onClick={spendHeart}>
                            <RetryHeart />
                            Try Again
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="cbg-score-col">
                <div className="cbg-scorecard">
                  <div className="cbg-score-header">
                    <span></span>
                    <span>Your Fighter</span>
                    <span>{opponent ? opponent.version : "Goku"}</span>
                  </div>

                  {CATEGORIES.map(function(cat, i) {
                    var isCurrent = !done && i === step;
                    var isShort = done && outcomeData && outcomeData.shortfalls.indexOf(cat.title) !== -1;
                    var isEdge  = done && outcomeData && outcomeData.edges.indexOf(cat.title)     !== -1;
                    var fighterVal = results[cat.key];
                    return (
                      <div
                        key={cat.key}
                        className={"cbg-score-row" + (isCurrent ? " cbg-score-row--current" : "")}
                      >
                        <span className="cbg-score-cat">{cat.title}</span>
                        <span
                          className={"cbg-score-val" +
                            (!fighterVal ? " cbg-score-val--empty" : "") +
                            (isShort ? " cbg-score-val--short" : "")}
                        >
                          {fighterVal || "--"}
                          {isShort && <span className="cbg-arrow-down" role="img" aria-label="below opponent">{"\u25BC"}</span>}
                          {isEdge  && <span className="cbg-arrow-up" role="img" aria-label="above opponent">{"\u25B2"}</span>}
                          {fighterVal && tierDesc(cat.items, fighterVal) !== "" && (
                            <span className="cbg-score-desc">{tierDesc(cat.items, fighterVal)}</span>
                          )}
                        </span>
                        <span className={"cbg-score-val" + (done ? "" : " cbg-score-val--empty")}>
                          {done && opponent ? opponent[cat.key] : "???"}
                          {done && opponent && tierDesc(cat.items, opponent[cat.key]) !== "" && (
                            <span className="cbg-score-desc">{tierDesc(cat.items, opponent[cat.key])}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
