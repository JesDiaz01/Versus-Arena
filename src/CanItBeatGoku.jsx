import { useState, useMemo } from "react";
import FeatWheel from "./FeatWheel";
import { CATEGORIES, GOKU, decideOutcome, FLAVOR_TEXT, fillTemplate } from "./gokuData";
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
    var line = randomPick(FLAVOR_TEXT[outcomeData.result]);
    return fillTemplate(line, {
      version:  GOKU.version,
      strength: results.strength,
      speed:    results.speed,
      iq:       results.iq,
      fighting: results.fighting
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

      <header className="cbg-header">
        <h1 className="cbg-title">CAN IT BEAT GOKU?</h1>
        <p className="cbg-subtitle">Spin every wheel. Survive the comparison.</p>
        <p className="cbg-subtitle">Put your own OC against Goku. Will they prevail?</p>
      </header>

      {!done && currentCat && (
        <div className="cbg-step-area">
          <div className="cbg-progress">
            Stat {step + 1} of {CATEGORIES.length}: <strong>{currentCat.title}</strong>
          </div>

          <FeatWheel
            key={currentCat.key}
            title={currentCat.title}
            items={currentCat.items}
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
            size={320}
          />

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
            {outcomeData.result === "WIN"  ? "THEY BEAT GOKU" :
             outcomeData.result === "DRAW" ? "DEAD EVEN"      : "GOKU WINS"}
          </h2>

          <div className="cbg-comparison">
            <div className="cbg-cmp-header">
              <span>Stat</span>
              <span>Your Fighter</span>
              <span>{GOKU.version}</span>
            </div>
            {CATEGORIES.map(function(cat) {
              var isShort = outcomeData.shortfalls.indexOf(cat.title) !== -1;
              var isEdge  = outcomeData.edges.indexOf(cat.title)     !== -1;
              return (
                <div
                  key={cat.key}
                  className={"cbg-cmp-row" +
                    (isShort ? " cbg-cmp-row--loss" : isEdge ? " cbg-cmp-row--win" : "")}
                >
                  <span className="cbg-cmp-cat">{cat.title}</span>
                  <span className={"cbg-cmp-val" + (isShort ? " cbg-cmp-val--short" : "")}>
                    {isShort ? "↓ " : isEdge ? "↑ " : ""}{results[cat.key]}
                  </span>
                  <span className="cbg-cmp-val">{GOKU[cat.key]}</span>
                </div>
              );
            })}
          </div>

          {outcomeData.shortfalls.length > 0 && (
            <p className="cbg-shortfall-note">
              Falls short on: <strong>{outcomeData.shortfalls.join(", ")}</strong>
            </p>
          )}

          <p className="cbg-flavor"><strong>{flavorLine}</strong></p>

          <button className="cbg-respin-btn" onClick={handleRespinAll}>
            Respin All
          </button>
        </div>
      )}
    </div>
  );
}
