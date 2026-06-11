import { useState, useMemo } from "react";
import FeatWheel from "./FeatWheel";
import { CATEGORIES, GOKU, decideOutcome, FLAVOR_TEXT, fillTemplate, tierNames, tierDesc } from "./gokuData";
import "./CanItBeatGoku.css";

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeInitialResults() {
  var r = {};
  CATEGORIES.forEach(function(cat) { r[cat.key] = null; });
  return r;
}

export default function CanItBeatGoku({ onBackToArena }) {
  var [results, setResults] = useState(makeInitialResults);
  var [step, setStep] = useState(0);

  var done = step >= CATEGORIES.length;
  var currentCat = done ? null : CATEGORIES[step];
  var currentResult = currentCat ? results[currentCat.key] : null;

  // Computed once when done flips true; stable until Respin All resets step.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  var outcomeData = useMemo(function() {
    return done ? decideOutcome(results) : null;
  }, [done]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  var flavorLine = useMemo(function() {
    if (!outcomeData) return null;
    var line = randomPick(FLAVOR_TEXT[outcomeData.bucket]);
    return fillTemplate(line, {
      strength:   results.strength,
      speed:      results.speed,
      iq:         results.iq,
      fighting:   results.fighting,
      durability: results.durability
    });
  }, [outcomeData]);

  function handleContinue() {
    setStep(function(s) { return s + 1; });
  }

  function handleRespinAll() {
    setResults(makeInitialResults());
    setStep(0);
  }

  return (
    <div className="cbg-page">
      <div className="cbg-topbar">
        <button className="cbg-back-btn" onClick={onBackToArena}>
          Back to the Arena
        </button>
      </div>

      <div className="cbg-container">
        <header className="cbg-header">
          <h1 className="cbg-title">CAN IT BEAT GOKU?</h1>
          <p className="cbg-subtitle">Spin every wheel. Survive the comparison.</p>
          <p className="cbg-subtitle">Put your own OC against Goku. Will they prevail?</p>
        </header>

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
                  key={currentCat.key}
                  items={tierNames(currentCat.items)}
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

                {currentResult && (
                  <button className="cbg-continue-btn" onClick={handleContinue}>
                    {step < CATEGORIES.length - 1 ? "Continue" : "See Verdict"}
                  </button>
                )}
              </div>
            )}

            {done && outcomeData && (
              <div className="cbg-verdict-card">
                <div className="cbg-eyebrow">VERDICT</div>
                <h2 className="cbg-headline">
                  {outcomeData.bucket.endsWith("_WIN") ? "THEY BEAT GOKU" :
                   outcomeData.bucket === "DRAW"       ? "DEAD EVEN"      : "GOKU WINS"}
                </h2>

                <p className="cbg-flavor"><strong>{flavorLine}</strong></p>

                <button className="cbg-respin-btn" onClick={handleRespinAll}>
                  Respin All
                </button>
              </div>
            )}
          </div>

          <div className="cbg-score-col">
            <div className="cbg-scorecard">
              <div className="cbg-score-header">
                <span></span>
                <span>Your Fighter</span>
                <span>Goku</span>
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
                      {isShort && <span className="cbg-arrow-down" role="img" aria-label="below Goku">{"\u25BC"}</span>}
                      {isEdge  && <span className="cbg-arrow-up" role="img" aria-label="above Goku">{"\u25B2"}</span>}
                      {fighterVal && tierDesc(cat.items, fighterVal) !== "" && (
                        <span className="cbg-score-desc">{tierDesc(cat.items, fighterVal)}</span>
                      )}
                    </span>
                    <span className={"cbg-score-val" + (done ? "" : " cbg-score-val--empty")}>
                      {done ? GOKU[cat.key] : "???"}
                      {done && tierDesc(cat.items, GOKU[cat.key]) !== "" && (
                        <span className="cbg-score-desc">{tierDesc(cat.items, GOKU[cat.key])}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
