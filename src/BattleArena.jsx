import { useState, useEffect, useRef, useId } from "react";
import { highlightClaims } from "./highlightClaims";
import { verdictDiffLabel } from "./diffTier";
import { checkClientBlocked } from "./clientBlocklist";
import FighterSilhouette from "./FighterSilhouette";
import PresetCard from "./PresetCard";
import { useAuth } from "./AuthContext";

// Presentation only: a single charging portrait for the loading clash.
// Falls back to the silhouette if the image is missing or fails to load.
function ClashFighter({ url, name, side, adjust }) {
  const [err, setErr] = useState(false);
  const a = adjust || DEFAULT_ADJUST;
  return (
    <div className={`clash-fighter ${side}`}>
      {url && !err ? (
        <img
          src={url}
          alt={name || ""}
          onError={() => setErr(true)}
          referrerPolicy="no-referrer"
          style={{
            objectPosition: `${a.x}% ${a.y}%`,
            transform: `scale(${a.zoom})`,
            transformOrigin: `${a.x}% ${a.y}%`,
          }}
        />
      ) : (
        <FighterSilhouette />
      )}
    </div>
  );
}

// Presentation only: the loading "clash" animation. Two portraits lean toward
// center and a refined gold bloom blooms between them, looping until the
// verdict arrives. Decorative; the Analyzing button conveys status to AT.
function BattleClash({ img1Url, img2Url, name1, name2, adjust1, adjust2 }) {
  return (
    <div className="clash-stage" aria-hidden="true">
      <div className="clash-track">
        <ClashFighter url={img1Url} name={name1} side="left" adjust={adjust1} />
        <div className="clash-bloom" />
        <div className="clash-ring" />
        <ClashFighter url={img2Url} name={name2} side="right" adjust={adjust2} />
      </div>
      <div className="clash-label">The arena decides</div>
    </div>
  );
}

const CLAIM_LIMIT = 100;
// Same invite as the site footer (Footer.jsx); reused as the identical string.
const DISCORD_URL = "https://discord.gg/vpdswhYcpd";
export const DEFAULT_ADJUST = { x: 50, y: 50, zoom: 1 };

// Small muted inline note, reused for the "couldn't load image" hint and the
// "please use appropriate wording" name/universe notes so they share one look.
const MUTED_NOTE_STYLE = { fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", margin: "0.3rem 0 0.5rem" };
const BLOCKED_WORDING_NOTE = "Please use appropriate wording.";

// Character-image resolution moved to api/character-image.js (server-side, where wiki
// 404s and redirects cannot surface as browser CORS failures). The override short-
// circuit, debounce, cancellation, and silhouette fallback stay client-side here.
function useCharacterImage(name, universe, override) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (override) {
      setImageUrl(override);
      setLoading(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!name || name.trim().length < 2) {
      setImageUrl(null);
      setLoading(false);
      return;
    }
    // Early-catch a blocked word client-side: never fire an image fetch for an
    // obvious slur. Show the silhouette (null url) instead. Clean input falls
    // straight through and fetches exactly as before. The server filter on
    // /api/character-image is the real backstop (see api/character-image.js).
    if (checkClientBlocked(name) || checkClientBlocked(universe)) {
      setImageUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Clear the previously resolved image the instant a new fetch starts, so an
    // in-place name change never leaves the OLD fighter's portrait on screen (or
    // frozen into a Simulate snapshot) during the 700ms debounce + async fetch.
    // Only reached for a valid name >= 2 chars; the override branch above returns
    // first, so an uploaded override image is never cleared here.
    setImageUrl(null);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      // One fetch attempt, hard-capped at 7s via AbortController so a cold serverless
      // start can't hang the spinner forever. Returns the resolved url, or null on any
      // failure (!res.ok like a cold 504, an abort when the 7s fires, or a network
      // error) so the caller can uniformly decide whether to retry, never a throw.
      async function attempt() {
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), 7000);
        try {
          const params = new URLSearchParams({ name: name.trim() });
          if (universe) params.set("universe", universe);
          const res = await fetch(`/api/character-image?${params.toString()}`, { signal: controller.signal });
          if (!res.ok) return null;
          const data = await res.json();
          return data && data.url ? data.url : null;
        } catch {
          return null;
        } finally {
          clearTimeout(abortTimer);
        }
      }

      // Retry ONCE on a falsy result (covers a cold 504/timeout that surfaces as
      // null), waiting ~1.5s first so the function has time to warm up. Capped at one
      // retry so an intentionally image-less fighter settles on the silhouette instead
      // of looping.
      let url = await attempt();
      if (cancelled) return;
      if (!url) {
        await new Promise(r => setTimeout(r, 1500));
        if (cancelled) return;
        url = await attempt();
        if (cancelled) return;
      }
      setImageUrl(url);
      setLoading(false);
    }, 700);
    return () => { cancelled = true; clearTimeout(timerRef.current); };
  }, [name, universe, override]);

  return { imageUrl, loading };
}

function cleanImageUrl(url) {
  let s = url.trim();
  if (s.includes("imgurl=")) {
    try {
      const parsed = new URL(s);
      const inner = parsed.searchParams.get("imgurl");
      if (inner) s = decodeURIComponent(inner);
    } catch (_) {
      const idx = s.indexOf("imgurl=");
      if (idx !== -1) {
        const after = s.slice(idx + 7);
        const end = after.indexOf("&");
        s = decodeURIComponent(end === -1 ? after : after.slice(0, end));
      }
    }
  }
  s = s.split("/revision/")[0];
  return s;
}

// --- User-upload image limits (cosmetic avatars only; never sent to the API) ---
// The override is purely a displayed avatar, so we downscale every upload hard and
// keep it small. Edge cap, a pre-decode guard (so a weak phone never decodes a giant
// file), and a backstop on the downscaled result.
const UPLOAD_MAX_EDGE = 512;                      // downscale: cap the longest edge, px
const UPLOAD_PRE_DECODE_MAX = 25 * 1024 * 1024;   // reject BEFORE decoding (avoid OOM)
const UPLOAD_STORED_MAX = 1024 * 1024;            // hard backstop on the downscaled result

// Decoded byte size of a data: URL, derived from its base64 payload length.
function dataUrlBytes(dataUrl) {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  let padding = 0;
  if (b64.endsWith("==")) padding = 2;
  else if (b64.endsWith("=")) padding = 1;
  return Math.floor(b64.length * 3 / 4) - padding;
}

// Downscale a user-uploaded image File to a small avatar via an offscreen canvas.
// Caps the longest edge to UPLOAD_MAX_EDGE, preserves transparency (PNG out if the
// source has any alpha, smaller JPEG q0.85 otherwise), and resolves to a data: URL
// string - the exact format the rest of the app already stores for an override, so
// nothing downstream changes. Browser-native only; rejects on any decode/encode
// failure. Uses an object URL (not a base64 read) so a large file is never fully
// buffered as a string just to be decoded.
function downscaleImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        if (!srcW || !srcH) { URL.revokeObjectURL(url); reject(new Error("empty image")); return; }
        const scale = Math.min(1, UPLOAD_MAX_EDGE / Math.max(srcW, srcH));
        const w = Math.max(1, Math.round(srcW * scale));
        const h = Math.max(1, Math.round(srcH * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        // Detect transparency on the downscaled canvas: if any pixel is not fully
        // opaque, keep alpha with PNG; otherwise use the smaller JPEG encoding.
        let hasAlpha = false;
        try {
          const px = ctx.getImageData(0, 0, w, h).data;
          for (let i = 3; i < px.length; i += 4) {
            if (px[i] < 255) { hasAlpha = true; break; }
          }
        } catch (_) {
          hasAlpha = true; // sampling failed - default to lossless PNG, never crash
        }

        const out = hasAlpha
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", 0.85);
        resolve(out);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

function ImageOverride({ onSet, hasOverride, onClear }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [msg, setMsg] = useState("");
  const fileInputRef = useRef(null);
  // This component renders once per fighter, so ids must be unique PER INSTANCE.
  // useId gives each mount its own stable prefix (no manual slot prop needed).
  const uid = useId();

  function handleUrlSubmit() {
    if (!urlInput.trim()) return;
    onSet(cleanImageUrl(urlInput));
    setUrlInput("");
    setOpen(false);
    setMode(null);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    // Clear the input so picking the SAME file again still fires onChange (lets a
    // user retry after a rejection).
    e.target.value = "";
    if (!file) return;

    // Must actually be an image before we try to decode it.
    if (!file.type || !file.type.startsWith("image/")) {
      setMsg("That file is not an image - please use a PNG, JPG, or WebP.");
      return;
    }
    // Pre-decode guard: reject an absurdly large file BEFORE decoding, so a weak
    // mobile device never loads a giant image into memory.
    if (file.size > UPLOAD_PRE_DECODE_MAX) {
      setMsg("That image file is too large to open - please use one under 25MB.");
      return;
    }

    setMsg("");
    downscaleImage(file)
      .then((dataUrl) => {
        // Backstop: if it is STILL too big after downscaling (or not a real image),
        // reject rather than store it. A rejected upload never calls onSet, so any
        // existing override is left untouched.
        if (!dataUrl || dataUrlBytes(dataUrl) > UPLOAD_STORED_MAX) {
          setMsg("That image is too large - please use one under 1MB.");
          return;
        }
        onSet(dataUrl);
        setMsg("");
        setOpen(false);
        setMode(null);
      })
      .catch(() => {
        setMsg("That image could not be processed - please try a different one.");
      });
  }

  if (hasOverride) {
    return (
      <button className="image-override-clear" onClick={onClear} title="Remove custom image">
        ↺ Reset image
      </button>
    );
  }

  if (!open) {
    return (
      <button className="image-override-trigger" onClick={() => { setMsg(""); setOpen(true); }}>
        Use my own image
      </button>
    );
  }

  return (
    <div className="image-override-panel">
      {!mode && (
        <>
          <button className="override-option" onClick={() => { setMsg(""); setMode("url"); }}>Paste URL</button>
          <button className="override-option" onClick={() => fileInputRef.current?.click()}>Upload file</button>
          <button className="override-cancel" onClick={() => { setMsg(""); setOpen(false); }}>Cancel</button>
          <input ref={fileInputRef} id={`${uid}-file`} name="overrideImageFile" aria-label="Upload a fighter image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} style={{ display: "none" }} />
          {msg && <div className="override-msg">{msg}</div>}
        </>
      )}
      {mode === "url" && (
        <>
          <input
            className="override-url-input"
            id={`${uid}-url`}
            name="overrideImageUrl"
            aria-label="Paste an image URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste image URL..."
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <div className="override-url-actions">
            <button className="override-option small" onClick={handleUrlSubmit}>Use</button>
            <button className="override-cancel small" onClick={() => { setMode(null); setUrlInput(""); }}>Back</button>
          </div>
        </>
      )}
    </div>
  );
}

// id/name/ariaLabel are forwarded so each textarea has a stable identity and an
// accessible name (a placeholder is not an accessible name).
function AutoTextarea({ value, onChange, onKeyDown, placeholder, maxLength, id, name, ariaLabel }) {
  const textareaRef = useRef(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={textareaRef}
      className="claim-input"
      id={id}
      name={name}
      aria-label={ariaLabel}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={1}
    />
  );
}

/* ============================================================
   MOCK VERDICT GENERATOR (demo only — no API, no cost)
   Produces a plausible, CONSISTENT verdict for a matchup so the
   battle flow works end to end. Same matchup => same result.
   Swap this out for a real /api/battle call when the backend is live.
   ============================================================ */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngPick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function rngPickN(rng, arr, n) {
  const copy = [...arr]; const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}
function rngInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }

const ADVANTAGE_POOL = [
  "Speed Advantage", "Higher Durability", "Greater Raw Power", "Superior Firepower",
  "Better Range", "Combat Experience", "Tactical Intelligence", "Versatile Abilities",
  "Regeneration", "Energy Projection", "Scaling Edge", "Stronger Hax",
];

function generateMockVerdict({ f1, f2, u1, u2, battleType, location, power, depth, claims1, claims2 }) {
  // Seed off the sorted names so the same matchup is consistent regardless of slot order.
  const seed = hashString([f1.toLowerCase(), f2.toLowerCase()].sort().join("|"));
  const rng = mulberry32(seed);

  // Collect user claims (both sides) for the disclosure.
  const claimSummaries = [];
  (claims1 || []).forEach(c => claimSummaries.push(`${f1}: "${c}"`));
  (claims2 || []).forEach(c => claimSummaries.push(`${f2}: "${c}"`));
  const user_claims_used = claimSummaries.slice(0, 6);
  const hasClaims = claimSummaries.length > 0;

  const feats_scanned = rngInt(rng, 20, 80);
  const sources = rngInt(rng, 5, 20);

  // ~12% chance of a draw, otherwise pick a winner.
  const roll = rng();
  const isDraw = roll < 0.12;

  if (isDraw) {
    const verdict_short = rngPick(rng, [
      "Too close to call. It's a draw.",
      "A genuine stalemate.",
      "Dead even, no clear winner.",
    ]);
    const analysis = `This one is genuinely too close to call. ${f1} and ${f2} trade advantages evenly, and neither secures a decisive edge in a ${battleType.toLowerCase()} set on ${location.toLowerCase()}.${hasClaims ? " The user-submitted feats were weighed in, but they don't tip the balance either way." : ""} A real verdict would hinge on specifics outside the feats currently on the table.`;
    return {
      winner: "Draw",
      verdict_short,
      analysis,
      advantages: rngPickN(rng, ADVANTAGE_POOL, 2),
      user_claims_used,
      feats_scanned,
      sources,
      demo: true,
    };
  }

  const winnerIsF1 = rng() < 0.5;
  const winner = winnerIsF1 ? f1 : f2;
  const loser = winnerIsF1 ? f2 : f1;
  const advantages = rngPickN(rng, ADVANTAGE_POOL, rngInt(rng, 2, 3));

  const verdict_short = rngPick(rng, [
    `${winner} takes it.`,
    `${winner} wins, but not without a fight.`,
    `${winner} edges out a hard-fought victory.`,
    `${winner} comes out on top.`,
  ]);

  const powerNote = power === "Composite"
    ? `At composite level, both are scaled to their strongest showings, and ${winner} still pulls ahead.`
    : `Weighing canon feats first, the matchup leans ${winner}'s way.`;

  const analysis = [
    `In a ${battleType.toLowerCase()} set on ${location.toLowerCase()}, ${winner} holds the edge over ${loser}.`,
    `${winner}'s ${advantages[0].toLowerCase()}${advantages[1] ? ` and ${advantages[1].toLowerCase()}` : ""} prove decisive.`,
    `${loser} puts up a real fight${hasClaims ? ", especially given the feats provided," : ""} but can't fully close the gap.`,
    powerNote,
  ].join(" ");

  return {
    winner,
    verdict_short,
    analysis,
    advantages,
    user_claims_used,
    feats_scanned,
    sources,
    demo: true,
  };
}

// Small "Universe" field label with an info "i" affordance. Mirrors the POWERSCALER
// APPROVED badge tooltip pattern (hover on desktop, tap on mobile) but styled neutrally
// for a form field, not as a gold badge. Holds its own state so each fighter's hint
// toggles independently.
function UniverseHint() {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div
      className="universe-hint"
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
      onClick={() => setShowInfo(v => !v)}
    >
      <span className="universe-hint-label">Universe</span>
      <span className="universe-hint-i" aria-label="What is this?">i</span>
      {showInfo && (
        <span className="universe-tip" role="tooltip">
          Optional, but adding the universe helps identify the right character (e.g. Poppy from League, not the flower).
        </span>
      )}
    </div>
  );
}

export default function BattleArena({
  initialBattle = null,
  f1, setF1, f2, setF2, u1, setU1, u2, setU2,
  override1, setOverride1, override2, setOverride2,
  claims1, setClaims1, claims2, setClaims2,
  draft1, setDraft1, draft2, setDraft2,
  battleType, setBattleType, location, setLocation, power, setPower, depth, setDepth,
  imgAdjust1, setImgAdjust1, imgAdjust2, setImgAdjust2,
  imgAdjusted1, setImgAdjusted1, imgAdjusted2, setImgAdjusted2,
  loadPresetRef,
}) {
  // Battle INPUTS (names, universes, feats, drafts, dropdowns, image overrides,
  // and framing) are lifted to App.jsx so they survive in-site navigation; this
  // component receives them and their setters as props. The verdict result and
  // the transient UI state below stay local and clear normally on unmount.
  // Auth session (may be null for anonymous users). Only used to attach the access
  // token to the battle request so logged-in battles auto-save; never gates the UI.
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialBattle?.result || null);
  // Battle-time snapshot of the winner's portrait (image url + error flag + framing) plus
  // the fought names, captured when the verdict arrives. The verdict avatar reads this
  // instead of live f1/f2/img1/img2 so editing an input after a verdict cannot flip it.
  const [battleSnapshot, setBattleSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // Toggle for the "POWERSCALER APPROVED" badge tooltip (hover on desktop, tap on mobile).
  const [showAuthoredInfo, setShowAuthoredInfo] = useState(false);
  // Result-panel anchor + a one-shot flag so a PRESET tap (not a normal battle) can scroll
  // the verdict into view once it commits.
  const resultPanelRef = useRef(null);
  const scrollOnResultRef = useRef(false);

  // "Disagree with the outcome" feedback control (purely additive; never blocks the
  // verdict). Resets to collapsed/unsubmitted whenever a new verdict arrives.
  const [disagreeOpen, setDisagreeOpen] = useState(false);
  const [disagreeChoice, setDisagreeChoice] = useState(null);
  const [disagreeNote, setDisagreeNote] = useState("");
  const [disagreeStatus, setDisagreeStatus] = useState("idle"); // idle | submitting | done | error

  const [imgError1, setImgError1] = useState(false);
  const [imgError2, setImgError2] = useState(false);

  // When true, a verdict that arrives AFTER the user cancelled is discarded so it
  // doesn't pop onto a user who already left the clash. (The request still fired
  // and still counted against the rate limit; this is a UI escape, not a refund.)
  const cancelledRef = useRef(false);

  const img1 = useCharacterImage(f1, u1, override1);
  const img2 = useCharacterImage(f2, u2, override2);

  // Per-field early-catch flags, used to show a polite inline note under the
  // offending input. Cheap, in-memory; the server filter is the real backstop.
  const f1Blocked = checkClientBlocked(f1);
  const u1Blocked = checkClientBlocked(u1);
  const f2Blocked = checkClientBlocked(f2);
  const u2Blocked = checkClientBlocked(u2);

  useEffect(() => { setImgError1(false); }, [img1.imageUrl]);
  useEffect(() => { setImgError2(false); }, [img2.imageUrl]);
  // A fresh verdict gets a fresh disagree control (collapsed, unsubmitted).
  useEffect(() => {
    setDisagreeOpen(false);
    setDisagreeChoice(null);
    setDisagreeNote("");
    setDisagreeStatus("idle");
  }, [result]);
  // After a PRESET tap commits its verdict, scroll the result panel into view (presets live
  // in the hero, so the verdict renders below the fold). Normal battles never set the flag,
  // so they do not scroll. One-shot: the flag is cleared after firing.
  useEffect(() => {
    if (result && scrollOnResultRef.current) {
      scrollOnResultRef.current = false;
      if (resultPanelRef.current) {
        resultPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [result]);
  // Reset framing when the user changes a fighter (name, universe, or override),
  // so a new image starts in the adjustable (un-done) state instead of inheriting
  // the prior image's framing. Keyed on the lifted INPUTS (not img.imageUrl) and
  // skipping the first run after each mount: framing still resets on a real
  // change, but a remount from in-site navigation preserves the lifted framing
  // instead of wiping it when the image re-fetches. Per fighter, so editing one
  // never resets the other.
  const skipFrame1 = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (skipFrame1.current) { skipFrame1.current = false; return; }
    setImgAdjust1(DEFAULT_ADJUST); setImgAdjusted1(false);
  }, [f1, u1, override1]);
  const skipFrame2 = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (skipFrame2.current) { skipFrame2.current = false; return; }
    setImgAdjust2(DEFAULT_ADJUST); setImgAdjusted2(false);
  }, [f2, u2, override2]);

  // Lock body scroll while a battle is processing so the clash overlay is the
  // only thing the user can interact with. The cleanup is tied to `loading`, so
  // it restores scroll on EVERY exit path (verdict, error, cancel, unmount) and
  // can never get stuck locked. Saves/restores the prior value rather than
  // hardcoding so it does not clobber any pre-existing overflow.
  useEffect(() => {
    if (!loading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [loading]);

  function addClaim(side) {
    const draft = side === 1 ? draft1 : draft2;
    if (!draft.trim()) return;
    if (side === 1) { setClaims1([...claims1, draft.trim()]); setDraft1(""); }
    else { setClaims2([...claims2, draft.trim()]); setDraft2(""); }
  }
  function removeClaim(side, index) {
    if (side === 1) setClaims1(claims1.filter((_, i) => i !== index));
    else setClaims2(claims2.filter((_, i) => i !== index));
  }
  function handleClaimKey(e, side) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addClaim(side);
    }
  }

  async function simulate() {
    if (!f1.trim() || !f2.trim()) { setError("Please enter both fighter names."); return; }
    // Early-catch an obvious slur so it never round-trips. The server filter in
    // api/battle.js stays as the authoritative backstop.
    if (checkClientBlocked(f1) || checkClientBlocked(f2) || checkClientBlocked(u1) || checkClientBlocked(u2)) {
      setError("Please use appropriate wording and try again.");
      return;
    }
    setError(""); setLoading(true); setResult(null);
    cancelledRef.current = false;

    // ===== REAL VERDICT (calls your Vercel backend at /api/battle) =====
    // The backend holds the API key securely and calls Anthropic for you.
    try {
      // Attach the Supabase access token ONLY when signed in, so the server can
      // auto-save the battle to this user's history. Anonymous users (no session)
      // send the exact same request as before -- no header, no change in behavior.
      const headers = { "Content-Type": "application/json" };
      if (session && session.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/battle", {
        method: "POST",
        headers,
        body: JSON.stringify({
          f1: f1.trim(), f2: f2.trim(), u1, u2,
          battleType, location, power, depth, claims1, claims2,
        }),
      });

      if (!res.ok) {
        if (cancelledRef.current) return;
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Try again in a moment.");
        setLoading(false);
        return;
      }

      const verdict = await res.json();
      if (cancelledRef.current) return;
      // Snapshot the winning side's portrait + framing from the CURRENT live state, which
      // still reflects the matchup just fought. Computed once from the fresh verdict's
      // winner so the verdict avatar stays frozen even if the user later edits an input.
      const won1 = verdict.winner && verdict.winner.toLowerCase().includes(f1.toLowerCase());
      // Never freeze a still-resolving portrait: if the winner's slot image is mid-fetch
      // (loading) or has no URL yet, store null so the verdict avatar renders the silhouette
      // instead of the PREVIOUS fighter's stale image. won1 matching is unchanged.
      const winnerImg = won1 ? img1 : img2;
      const frozenWinnerUrl = (winnerImg.loading || !winnerImg.imageUrl) ? null : winnerImg.imageUrl;
      setBattleSnapshot({
        f1, f2,
        winnerImageUrl: frozenWinnerUrl,
        winnerImageError: frozenWinnerUrl === null ? true : (won1 ? imgError1 : imgError2),
        winnerAdjust: won1 ? imgAdjust1 : imgAdjust2,
      });
      setResult(verdict);
    } catch (e) {
      if (cancelledRef.current) return;
      setError("Couldn't reach the analyst. Check your connection and try again.");
    }
    setLoading(false);

    // ===== DEMO / MOCK FALLBACK (no API, no cost) =====
    // To go back to free local testing, comment out the try/catch above and
    // uncomment this block instead:
    //
    // await new Promise(r => setTimeout(r, 1400));
    // const mock = generateMockVerdict({
    //   f1: f1.trim(), f2: f2.trim(), u1, u2,
    //   battleType, location, power, depth, claims1, claims2,
    // });
    // setResult(mock);
    // setLoading(false);
  }

  // Cancel an in-flight battle: a UI escape only. Returns to the form with all
  // entered fighters/feats intact (NOT a full reset), drops the dim + clash, and
  // restores scroll via the loading-tied effect. The flag makes any verdict that
  // arrives after this point get discarded in simulate().
  function cancelBattle() {
    cancelledRef.current = true;
    setLoading(false);
  }

  function reset() {
    setF1(""); setF2(""); setU1(""); setU2("");
    setOverride1(null); setOverride2(null);
    setClaims1([]); setClaims2([]);
    setDraft1(""); setDraft2("");
    setResult(null); setError(""); setCopied(false);
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  // Phase A: show a STORED preset verdict instantly. The result panel renders fully from
  // result + battleSnapshot, so no fetch and no loading state are needed (and the dim/
  // clash overlay + body-scroll-lock, both gated on `loading`, stay off).
  function loadPreset(preset) {
    setError("");
    scrollOnResultRef.current = true; // preset taps scroll the verdict into view (battles do not)
    setBattleSnapshot(preset.snapshot);
    setResult(preset.verdict);
  }

  // Expose loadPreset to the parent hero rotator without lifting result/snapshot state.
  // Reassigned each render so the ref always points at the current closure.
  if (loadPresetRef) loadPresetRef.current = loadPreset;

  function shareBattle() {
    if (!result || !result.id) return;
    const url = window.location.origin + "/?b=" + result.id;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  // POST the disagreement to our serverless endpoint. Purely additive: a failure shows a
  // quiet inline error and allows retry; it never affects the verdict already on screen.
  async function submitDisagreement() {
    if (!disagreeChoice || disagreeStatus === "submitting" || disagreeStatus === "done") return;
    setDisagreeStatus("submitting");
    // Use the two fighter names exactly as the verdict scored them; fall back to the
    // entered names only when scores is missing/empty (e.g. a draw carries no scores).
    const scoreKeys = (result.scores && typeof result.scores === "object") ? Object.keys(result.scores) : [];
    const char_a = scoreKeys[0] || f1;
    const char_b = scoreKeys[1] || f2;
    try {
      const res = await fetch("/api/disagreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battle_id: result.id || null,
          char_a,
          char_b,
          winner: result.winner,
          disagreed_with: disagreeChoice,
          note: disagreeNote.trim() || "",
        }),
      });
      if (!res.ok) { setDisagreeStatus("error"); return; }
      setDisagreeStatus("done");
    } catch (e) {
      setDisagreeStatus("error");
    }
  }

  const isWinner1 = result && result.winner.toLowerCase().includes(f1.toLowerCase());
  const isDraw = result && result.winner === "Draw";
  const diffLabel = result ? verdictDiffLabel(result) : null;

  // Winner portrait for the verdict header: read the battle-time SNAPSHOT (set when the
  // verdict arrived) so it reflects the fought winner's image/framing and never flips when
  // the user edits an input afterward. Before any battle (snapshot null) fall back to live
  // state. isWinner1 stays as-is for its other uses; only these three switch to the snapshot.
  const winnerImageUrl = battleSnapshot ? battleSnapshot.winnerImageUrl : (isWinner1 ? img1.imageUrl : img2.imageUrl);
  const winnerImageError = battleSnapshot ? battleSnapshot.winnerImageError : (isWinner1 ? imgError1 : imgError2);
  const winnerAdjust = battleSnapshot ? battleSnapshot.winnerAdjust : (isWinner1 ? imgAdjust1 : imgAdjust2);

  // Up to 5 disagreement choices from THIS verdict's own data, in priority order:
  // the outcome itself, then each advantage label, then a granted-ability catch-all.
  const disagreeChoices = [];
  if (result) {
    if (isDraw) disagreeChoices.push("This shouldn't have been a draw");
    else if (result.winner) disagreeChoices.push(result.winner + " shouldn't have won");
    for (const a of (result.advantages || [])) {
      if (disagreeChoices.length >= 5) break;
      if (typeof a === "string" && a.trim()) disagreeChoices.push("Disagree: " + a);
    }
    if (disagreeChoices.length < 5 && result.user_claims_used && result.user_claims_used.length > 0) {
      disagreeChoices.push("Disagree with a granted ability call");
    }
  }

  function renderAvatar(side) {
    const img = side === 1 ? img1 : img2;
    const imgError = side === 1 ? imgError1 : imgError2;
    const setImgError = side === 1 ? setImgError1 : setImgError2;
    const adjust = side === 1 ? imgAdjust1 : imgAdjust2;
    const setAdjust = side === 1 ? setImgAdjust1 : setImgAdjust2;
    const adjusted = side === 1 ? imgAdjusted1 : imgAdjusted2;
    const setAdjusted = side === 1 ? setImgAdjusted1 : setImgAdjusted2;
    const fighter = side === 1 ? f1 : f2;
    const stateClass = result
      ? (isDraw ? "active" : ((side === 1 ? isWinner1 : !isWinner1) ? "winner" : "loser"))
      : (fighter ? "active" : "");
    const isDefaultAdjust = adjust.x === 50 && adjust.y === 50 && adjust.zoom === 1;

    return (
      <>
        <div className={`fighter-avatar ${stateClass} ${img.loading ? "loading" : ""}`}>
          {img.imageUrl && !imgError ? (
            <img
              src={img.imageUrl}
              alt={fighter}
              className="fighter-photo"
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
              style={{
                objectPosition: `${adjust.x}% ${adjust.y}%`,
                transform: `scale(${adjust.zoom})`,
                transformOrigin: `${adjust.x}% ${adjust.y}%`,
              }}
            />
          ) : (
            <FighterSilhouette />
          )}
          {img.loading && <div className="avatar-spinner" />}
        </div>
        {img.imageUrl && !imgError && !adjusted && (
          <div className="img-adjust">
            <div className="img-adjust-row">
              <label className="img-adjust-label" htmlFor={`fighter-${side}-adjust-y`}>vertical</label>
              <input type="range" className="img-adjust-slider"
                id={`fighter-${side}-adjust-y`} name={`fighter${side}AdjustY`}
                min="0" max="100" step="1" value={adjust.y}
                onChange={e => setAdjust({ ...adjust, y: Number(e.target.value) })} />
            </div>
            <div className="img-adjust-row">
              <label className="img-adjust-label" htmlFor={`fighter-${side}-adjust-zoom`}>zoom</label>
              <input type="range" className="img-adjust-slider"
                id={`fighter-${side}-adjust-zoom`} name={`fighter${side}AdjustZoom`}
                min="1" max="3" step="0.05" value={adjust.zoom}
                onChange={e => setAdjust({ ...adjust, zoom: Number(e.target.value) })} />
            </div>
            <div className="img-adjust-row">
              <label className="img-adjust-label" htmlFor={`fighter-${side}-adjust-x`}>horizontal</label>
              <input type="range" className="img-adjust-slider"
                id={`fighter-${side}-adjust-x`} name={`fighter${side}AdjustX`}
                min="0" max="100" step="1" value={adjust.x}
                onChange={e => setAdjust({ ...adjust, x: Number(e.target.value) })} />
            </div>
            <div className="img-adjust-actions">
              {!isDefaultAdjust && (
                <button className="img-adjust-reset" onClick={() => setAdjust(DEFAULT_ADJUST)}>
                  reset
                </button>
              )}
              <button className="img-adjust-done" onClick={() => setAdjusted(true)}>
                done
              </button>
            </div>
          </div>
        )}
        {img.imageUrl && !imgError && adjusted && (
          <button className="img-readjust" onClick={() => setAdjusted(false)}>
            Adjust
          </button>
        )}
        {imgError && (
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", margin: "0.3rem 0 0.5rem" }}>
            Couldn't load that image — try a different link.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="arena">
      <div className={"battle-dim" + (loading ? " active" : "")} aria-hidden="true" />
      <div className="arena-card">
        <div className="arena-header">
          <h2>The Arena</h2>
          <span className="universe-badge">Any Universe</span>
        </div>

        <div className="fighters-grid">
          <div className="fighter-slot">
            <div className="fighter-label">Fighter One</div>
            {renderAvatar(1)}
            <ImageOverride onSet={setOverride1} hasOverride={!!override1} onClear={() => setOverride1(null)} />
            <input className="fighter-name-input" id="fighter-1-name" name="fighter1Name" aria-label="Fighter one name" value={f1} onChange={e => setF1(e.target.value)} placeholder="Enter character name" />
            {f1Blocked && <p style={MUTED_NOTE_STYLE}>{BLOCKED_WORDING_NOTE}</p>}
            <UniverseHint />
            <input className="universe-input" id="fighter-1-universe" name="fighter1Universe" aria-label="Fighter one universe or series" value={u1} onChange={e => setU1(e.target.value)} placeholder="Universe / Series" />
            {u1Blocked && <p style={MUTED_NOTE_STYLE}>{BLOCKED_WORDING_NOTE}</p>}

            <div className="claims-section">
              <div className="claims-label">Custom Feats / Lore <span className="claims-hint">(optional)</span></div>
              <div className="claims-list">
                {claims1.map((c, i) => (
                  <div key={i} className="claim-pill">
                    <span>{c}</span>
                    <button className="claim-remove" onClick={() => removeClaim(1, i)} aria-label="Remove claim">×</button>
                  </div>
                ))}
              </div>
              <div className="claim-input-wrap">
                <AutoTextarea
                  id="fighter-1-feat"
                  name="fighter1Feat"
                  ariaLabel="Add a custom feat or lore note for fighter one"
                  value={draft1}
                  onChange={e => setDraft1(e.target.value.slice(0, CLAIM_LIMIT))}
                  onKeyDown={e => handleClaimKey(e, 1)}
                  placeholder="Add a feat or lore note..."
                  maxLength={CLAIM_LIMIT}
                />
                <button className="claim-add-btn" onClick={() => addClaim(1)} disabled={!draft1.trim()}>+</button>
              </div>
              <div className="claim-counter">{draft1.length}/{CLAIM_LIMIT}</div>
            </div>
          </div>

          <div className="vs-divider">
            <div className="divider-line" />
            <div className="vs-text">vs</div>
            <div className="divider-line" />
          </div>

          <div className="fighter-slot right">
            <div className="fighter-label">Fighter Two</div>
            {renderAvatar(2)}
            <ImageOverride onSet={setOverride2} hasOverride={!!override2} onClear={() => setOverride2(null)} />
            <input className="fighter-name-input" id="fighter-2-name" name="fighter2Name" aria-label="Fighter two name" value={f2} onChange={e => setF2(e.target.value)} placeholder="Enter character name" />
            {f2Blocked && <p style={MUTED_NOTE_STYLE}>{BLOCKED_WORDING_NOTE}</p>}
            <UniverseHint />
            <input className="universe-input" id="fighter-2-universe" name="fighter2Universe" aria-label="Fighter two universe or series" value={u2} onChange={e => setU2(e.target.value)} placeholder="Universe / Series" />
            {u2Blocked && <p style={MUTED_NOTE_STYLE}>{BLOCKED_WORDING_NOTE}</p>}

            <div className="claims-section">
              <div className="claims-label">Custom Feats / Lore <span className="claims-hint">(optional)</span></div>
              <div className="claims-list">
                {claims2.map((c, i) => (
                  <div key={i} className="claim-pill">
                    <span>{c}</span>
                    <button className="claim-remove" onClick={() => removeClaim(2, i)} aria-label="Remove claim">×</button>
                  </div>
                ))}
              </div>
              <div className="claim-input-wrap">
                <AutoTextarea
                  id="fighter-2-feat"
                  name="fighter2Feat"
                  ariaLabel="Add a custom feat or lore note for fighter two"
                  value={draft2}
                  onChange={e => setDraft2(e.target.value.slice(0, CLAIM_LIMIT))}
                  onKeyDown={e => handleClaimKey(e, 2)}
                  placeholder="Add a feat or lore note..."
                  maxLength={CLAIM_LIMIT}
                />
                <button className="claim-add-btn" onClick={() => addClaim(2)} disabled={!draft2.trim()}>+</button>
              </div>
              <div className="claim-counter">{draft2.length}/{CLAIM_LIMIT}</div>
            </div>
          </div>
        </div>

        <div className="fight-settings">
          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-battle-type">Battle Type</label>
            <select className="setting-select" id="setting-battle-type" name="battleType" value={battleType} onChange={e => setBattleType(e.target.value)}>
              <option>Standard Fight</option>
              <option>In-Character</option>
              <option>Out of Character</option>
              <option>Battle of Wits</option>
              <option>Speed Blitz</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-location">Location</label>
            <select className="setting-select" id="setting-location" name="location" value={location} onChange={e => setLocation(e.target.value)}>
              <option>Neutral Terrain</option>
              <option>Urban City</option>
              <option>Space</option>
              <option>Their Home Universe</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-power">Power Level</label>
            <select className="setting-select" id="setting-power" name="power" value={power} onChange={e => setPower(e.target.value)}>
              <option>Canon Only</option>
              <option>Composite</option>
              <option>Post-Series Peak</option>
              <option>Current</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label" htmlFor="setting-depth">Depth</label>
            <select className="setting-select" id="setting-depth" name="depth" value={depth} onChange={e => setDepth(e.target.value)}>
              <option>Quick Verdict</option>
              <option>Detailed Analysis</option>
              <option>Deep Dive</option>
            </select>
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}

        {loading && (
          <div className="clash-spotlight">
            <button
              type="button"
              className="clash-cancel"
              aria-label="Cancel battle"
              onClick={cancelBattle}
            >
              {"\u00D7"}
            </button>
            <BattleClash
              img1Url={img1.imageUrl}
              img2Url={img2.imageUrl}
              name1={f1}
              name2={f2}
              adjust1={imgAdjust1}
              adjust2={imgAdjust2}
            />
          </div>
        )}

        <div className="fight-btn-wrap">
          <button className={`fight-btn ${loading ? "loading" : ""}`} onClick={simulate} disabled={loading}>
            {loading ? "Analyzing..." : "Simulate Battle"}
          </button>
          <div className="fight-stance">
            <span>Feat-Driven</span>
            <span>Unbiased</span>
            <span>No Favorites</span>
          </div>
        </div>

        {/* PRESET ONLY: a preset tap sets snapshot.image1/image2, which swaps the normal
            result panel for the cinematic PresetCard. Normal battles (no snapshot images)
            fall through to the existing panel below, completely unchanged. The scroll-to-
            verdict ref moves to whichever renders, so the tap still scrolls the card in. */}
        {result && (battleSnapshot && battleSnapshot.image1 && battleSnapshot.image2 ? (
          <PresetCard
            ref={resultPanelRef}
            result={result}
            snapshot={battleSnapshot}
            onNewBattle={reset}
          />
        ) : (
          <div className="result-panel" ref={resultPanelRef}>
            {result.demo && (
              <div className="demo-banner">
                <strong>Demo verdict.</strong> Real AI analysis isn't connected yet; the winner here is illustrative only, to show how results will look.
              </div>
            )}
            <div className="result-header">
              {battleSnapshot && battleSnapshot.image1 && battleSnapshot.image2 ? (
                <img
                  className="verdict-matchup-img left"
                  src={battleSnapshot.image1}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : isDraw ? (
                <span className="winner-crown">⚖</span>
              ) : winnerImageUrl && !winnerImageError ? (
                <div className="winner-avatar-frame">
                  <img
                    className="winner-avatar-photo"
                    src={winnerImageUrl}
                    onError={() => setBattleSnapshot(s => s ? { ...s, winnerImageError: true } : s)}
                    alt=""
                    referrerPolicy="no-referrer"
                    style={{
                      objectPosition: `${winnerAdjust.x}% ${winnerAdjust.y}%`,
                      transform: `scale(${winnerAdjust.zoom})`,
                      transformOrigin: `${winnerAdjust.x}% ${winnerAdjust.y}%`,
                    }}
                  />
                </div>
              ) : (
                <span className="winner-avatar-frame winner-avatar-fallback">
                  <FighterSilhouette />
                </span>
              )}
              <div>
                <div className="result-title">
                  {isDraw ? "It's a Draw" : `Winner: ${result.winner}`}
                </div>
                {diffLabel && <div className="verdict-diff">{diffLabel}</div>}
                {result.authored && (
                  <div
                    className="verdict-badge"
                    onMouseEnter={() => setShowAuthoredInfo(true)}
                    onMouseLeave={() => setShowAuthoredInfo(false)}
                    onClick={() => setShowAuthoredInfo(v => !v)}
                  >
                    POWERSCALER APPROVED
                    <span className="verdict-badge-shield" aria-label="What does this mean?">
                      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                        <path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z"
                              fill="rgba(184,134,11,0.12)" stroke="currentColor" strokeWidth="2"
                              strokeLinejoin="round" strokeLinecap="round" />
                        <line x1="12" y1="3" x2="12" y2="21.2" stroke="currentColor"
                              strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
                      </svg>
                    </span>
                    {showAuthoredInfo && (
                      <span className="verdict-badge-tip" role="tooltip">
                        Written and fact-checked by a human powerscaler.
                      </span>
                    )}
                  </div>
                )}
              </div>
              {battleSnapshot && battleSnapshot.image1 && battleSnapshot.image2 && (
                <img
                  className="verdict-matchup-img right"
                  src={battleSnapshot.image2}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="verdict-chips">
              {(result.advantages || []).map((a, i) => (
                <span key={i} className="chip">{a}</span>
              ))}
            </div>

            <p className="result-text">
              <strong className="verdict-short">{result.verdict_short}</strong>
              {highlightClaims(result.analysis, [...claims1, ...claims2], [f1, f2])}
            </p>

            {result.user_claims_used && result.user_claims_used.length > 0 && (
              <div className="claims-disclosure">
                <div className="claims-disclosure-label">Granted Abilities Applied</div>
                <ul className="claims-disclosure-list">
                  {result.user_claims_used.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="share-row">
              <button className="rematch-btn" onClick={reset}>New Battle</button>
              {result.id && (
                <button className="share-btn" onClick={shareBattle}>
                  {copied ? "Link copied!" : "Share Battle"}
                </button>
              )}
            </div>

            <a
              className="discord-invite"
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                <path d="M20.32 4.37A19.79 19.79 0 0016.56 3c-.2.36-.43.85-.59 1.23a18.27 18.27 0 00-5.5 0C10.31 3.85 10.07 3.36 9.87 3a19.74 19.74 0 00-3.76 1.37C2.55 8.06 1.97 11.65 2.27 15.19a19.9 19.9 0 005.99 3.03c.48-.66.91-1.36 1.28-2.1-.7-.27-1.37-.6-2-.98.17-.13.34-.26.5-.4 3.86 1.8 8.04 1.8 11.86 0 .16.14.33.27.5.4-.63.38-1.3.71-2 .98.37.74.8 1.44 1.28 2.1a19.86 19.86 0 005.99-3.03c.36-4.1-.61-7.66-2.55-10.82zM8.84 13.16c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4zm6.32 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.41 0 1.32-.95 2.4-2.15 2.4z" />
              </svg>
              Join the Discord
            </a>

            {/* Disagree with the outcome - additive post-verdict feedback; never blocks
                the verdict, share row, or Discord link above. */}
            <div className="disagree">
              {disagreeStatus === "done" ? (
                <p className="disagree-thanks">Thanks - noted.</p>
              ) : !disagreeOpen ? (
                <button className="disagree-toggle" onClick={() => setDisagreeOpen(true)}>
                  Disagree with the outcome?
                </button>
              ) : (
                <div className="disagree-panel">
                  <div className="disagree-prompt">What do you disagree with?</div>
                  <div className="disagree-choices">
                    {disagreeChoices.map((choice, i) => (
                      <button
                        key={i}
                        type="button"
                        className={"chip disagree-choice" + (disagreeChoice === choice ? " selected" : "")}
                        onClick={() => setDisagreeChoice(choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="disagree-note"
                    id="disagree-note"
                    name="disagreeNote"
                    aria-label="Optional: tell us why you disagree"
                    value={disagreeNote}
                    onChange={(e) => setDisagreeNote(e.target.value.slice(0, 500))}
                    maxLength={500}
                    rows={2}
                    placeholder="Optional: tell us why"
                  />
                  {disagreeStatus === "error" && (
                    <p className="disagree-error">Couldn't submit that - please try again.</p>
                  )}
                  <div className="disagree-actions">
                    <button className="share-btn" onClick={() => setDisagreeOpen(false)}>Cancel</button>
                    <button
                      className="rematch-btn"
                      onClick={submitDisagreement}
                      disabled={!disagreeChoice || disagreeStatus === "submitting"}
                    >
                      {disagreeStatus === "submitting" ? "Sending..." : "Submit"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}