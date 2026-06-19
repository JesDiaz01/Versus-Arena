import { useState, useEffect, useRef } from "react";
import { highlightClaims } from "./highlightClaims";
import { verdictDiffLabel } from "./diffTier";

function FighterSilhouette() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M50 12 C42 12, 36 18, 36 27 C36 33, 38 38, 41 41 L41 46 L59 46 L59 41 C62 38, 64 33, 64 27 C64 18, 58 12, 50 12 Z"
        fill="currentColor"
      />
      <rect x="40" y="28" width="20" height="2.5" fill="rgba(255,255,255,0.4)" />
      <path
        d="M30 50 L70 50 L74 58 L78 90 L62 90 L60 65 L40 65 L38 90 L22 90 L26 58 Z"
        fill="currentColor"
      />
      <path
        d="M47 52 L53 52 L52 62 L50 65 L48 62 Z"
        fill="rgba(255,255,255,0.25)"
      />
    </svg>
  );
}

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

const FANDOM_MAP = {
  "persona": "megamitensei", "persona 3": "megamitensei", "persona 4": "megamitensei",
  "persona 5": "megamitensei", "shin megami tensei": "megamitensei", "smt": "megamitensei",
  "dragon ball": "dragonball", "dragon ball z": "dragonball", "dragon ball super": "dragonball", "dbz": "dragonball",
  "naruto": "naruto", "boruto": "naruto",
  "one piece": "onepiece", "bleach": "bleach",
  "jujutsu kaisen": "jujutsu-kaisen", "jjk": "jujutsu-kaisen",
  "my hero academia": "myheroacademia", "mha": "myheroacademia",
  "hunter x hunter": "hunterxhunter", "hxh": "hunterxhunter",
  "fullmetal alchemist": "fma", "fma": "fma",
  "attack on titan": "attackontitan", "aot": "attackontitan",
  "one punch man": "onepunchman", "opm": "onepunchman",
  "demon slayer": "kimetsu-no-yaiba", "kimetsu no yaiba": "kimetsu-no-yaiba",
  "tokyo ghoul": "tokyoghoul", "death note": "deathnote",
  "chainsaw man": "chainsaw-man", "spy x family": "spy-x-family",
  "fairy tail": "fairytail", "black clover": "blackclover",
  "hellsing": "hellsing", "berserk": "berserk", "vinland saga": "vinlandsaga",
  "marvel": "marvel", "mcu": "marvelcinematicuniverse", "marvel comics": "marvel",
  "dc": "dc", "dc comics": "dc", "dceu": "dcextendeduniverse",
  "the boys": "the-boys", "invincible": "invincible-comics",
  "star wars": "starwars", "harry potter": "harrypotter",
  "lord of the rings": "lotr", "lotr": "lotr",
  "game of thrones": "gameofthrones", "got": "gameofthrones",
  "halo": "halo", "mass effect": "masseffect",
  "elden ring": "eldenring", "dark souls": "darksouls",
  "final fantasy": "finalfantasy", "kingdom hearts": "kingdomhearts",
  "pokemon": "pokemon", "pokémon": "pokemon",
  "zelda": "zelda", "legend of zelda": "zelda",
  "mario": "mario", "super mario": "mario",
  "sonic": "sonic", "metal gear": "metalgear",
  "resident evil": "residentevil", "street fighter": "streetfighter",
  "tekken": "tekken", "mortal kombat": "mortalkombat",
  "smash bros": "supersmashbros", "super smash bros": "supersmashbros",
  "league of legends": "leagueoflegends", "lol": "leagueoflegends",
  "overwatch": "overwatch", "genshin impact": "genshin-impact",
  "honkai": "honkai-impact-3", "honkai star rail": "honkai-star-rail",
  "warcraft": "wowwiki", "world of warcraft": "wowwiki", "wow": "wowwiki",
  "minecraft": "minecraft", "fortnite": "fortnite",
  "rick and morty": "rickandmorty", "south park": "southpark",
  "the simpsons": "simpsons", "family guy": "familyguy",
  "spongebob": "spongebob",
  "avatar": "avatar", "avatar the last airbender": "avatar", "atla": "avatar", "korra": "avatar",
  "ben 10": "ben10", "adventure time": "adventuretime",
  "regular show": "regularshow", "steven universe": "steven-universe",
};

const FANDOM_PAGE_SUFFIX = {
  "leagueoflegends": "/LoL",
};

// Normalize a name or filename for loose matching: lowercase, then drop anything
// that is not a letter or digit (spaces, underscores, punctuation, extension dot).
// So "Thragg.png" -> "thraggpng" and the target "Thragg" -> "thragg".
function normalizeForMatch(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Option 1: the page's representative portrait via the PageImages extension. This
// is the infobox image (the actual subject of the page), not just the first image
// on it. Returns null if the wiki has PageImages disabled or the page has none.
async function fetchFandomPortrait(wikiName, pageTitle) {
  try {
    const url = `https://${wikiName}.fandom.com/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=400&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    return page?.original?.source || page?.thumbnail?.source || null;
  } catch (e) { return null; }
}

async function fetchFandomPageImage(wikiName, pageTitle, nameForMatch) {
  // Option 1: prefer the page's representative portrait (infobox image) first.
  const portrait = await fetchFandomPortrait(wikiName, pageTitle);
  if (portrait) return portrait;

  // Fallback: scan the page's full image list (PageImages absent or empty).
  try {
    const url = `https://${wikiName}.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=images|text&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const images = data?.parse?.images || [];

    // Same skip filter as before: drop logos/icons/svg/placeholder art.
    const acceptable = images.filter(function(imgName) {
      const lower = imgName.toLowerCase();
      return !(lower.includes("logo") || lower.includes("icon") ||
               lower.includes("symbol") || lower.includes("button") ||
               lower.endsWith(".svg") || lower.includes("placeholder"));
    });

    // Option 2: float filenames that match the subject's name to the front; keep
    // everything else in its original order so we still return SOME image when
    // nothing matches (preserving the old "first acceptable image" behavior).
    let ordered = acceptable;
    const target = normalizeForMatch(nameForMatch);
    if (target) {
      const matches = acceptable.filter(function(n) { return normalizeForMatch(n).includes(target); });
      if (matches.length > 0) {
        const rest = acceptable.filter(function(n) { return matches.indexOf(n) === -1; });
        ordered = matches.concat(rest);
      }
    }

    for (const imgName of ordered) {
      const imgUrl = `https://${wikiName}.fandom.com/api.php?action=query&titles=File:${encodeURIComponent(imgName)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      try {
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const pages = imgData?.query?.pages;
          if (pages) {
            const page = Object.values(pages)[0];
            const u = page?.imageinfo?.[0]?.url;
            if (u) return u;
          }
        }
      } catch (e) { continue; }
    }

    // HTML fallback: prefer an <img> whose filename matches the subject's name,
    // otherwise the first image in the parsed markup (old behavior).
    const html = data?.parse?.text?.["*"];
    if (html) {
      const urls = [];
      const re = /<img[^>]+src="(https?:\/\/[^"]+\.(?:png|jpg|jpeg|webp|gif))"/ig;
      let m;
      while ((m = re.exec(html)) !== null) urls.push(m[1]);
      if (urls.length > 0) {
        let pick = urls[0];
        if (target) {
          const hit = urls.find(function(u) {
            const file = u.split("/").pop() || "";
            return normalizeForMatch(file).includes(target);
          });
          if (hit) pick = hit;
        }
        return cleanImageUrl(pick);
      }
    }
    return null;
  } catch (e) { return null; }
}

async function searchFandomPages(wikiName, query, limit = 8) {
  try {
    const url = `https://${wikiName}.fandom.com/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${limit}&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.[1] || [];
  } catch (e) { return []; }
}

async function fetchFromFandom(wikiName, query, nameForMatch) {
  // Match candidate filenames against the character name (falls back to the page
  // query if a caller does not pass one).
  const matchName = nameForMatch || query;
  const suffix = FANDOM_PAGE_SUFFIX[wikiName];
  if (suffix) {
    const img = await fetchFandomPageImage(wikiName, query + suffix, matchName);
    if (img) return img;
  }
  const direct = await fetchFandomPageImage(wikiName, query, matchName);
  if (direct) return direct;
  const titles = await searchFandomPages(wikiName, query, 8);
  for (const title of titles) {
    if (/^list of /i.test(title)) continue;
    const img = await fetchFandomPageImage(wikiName, title, matchName);
    if (img) return img;
  }
  return null;
}

async function getWikipediaImageDetails(title) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (res.ok) {
      const data = await res.json();
      const img = data.thumbnail?.source || data.originalimage?.source;
      if (img) return {
        url: img,
        title: data.title || title,
        summary: data.extract || "",
        description: data.description || ""
      };
    }
  } catch (e) {}
  return null;
}

function looksLikeRealPerson(details) {
  if (!details) return false;
  const desc = (details.description || "").toLowerCase();
  const summary = (details.summary || "").toLowerCase();

  if (desc.includes("fictional") || desc.includes("character")) return false;
  if (desc.includes("anime") || desc.includes("manga") || desc.includes("video game")) return false;

  const realDescSignals = [
    "politician", "president", "prime minister", "minister", "senator", "governor",
    "singer", "musician", "rapper", "actor", "actress", "athlete", "boxer", "wrestler",
    "businessman", "businesswoman", "entrepreneur", "ceo", "scientist", "academic",
    "journalist", "author", "writer", "director", "producer", "footballer",
    "basketball player", "baseball player", "tennis player", "racing driver",
    "youtuber", "streamer", "comedian", "philosopher", "physicist", "chemist",
  ];
  for (const sig of realDescSignals) {
    if (desc.includes(sig)) return true;
  }

  if (/\b\d{4}\b/.test(desc) || /born\s+\d{4}/.test(summary)) return true;

  const realSummarySignals = [
    "is a politician", "was a politician", "is a singer", "was a singer",
    "is a former", "was a former", "served as", "is the prime minister",
    "is the president of", "won the nobel", "is a japanese", "is an american",
  ];
  for (const sig of realSummarySignals) {
    if (summary.includes(sig)) return true;
  }

  return false;
}

// Check if a Wikipedia title is essentially the same as user's query (ignoring case/punctuation)
function isExactMatch(userQuery, wikiTitle) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return norm(userQuery) === norm(wikiTitle);
}

async function fetchFromWikipedia(query, biasFictional = false) {
  // Try the direct lookup first. If Wikipedia returns a page with the EXACT
  // same title as what the user typed, TRUST IT — even if it's a real person.
  // (Mike Tyson → returns "Mike Tyson" page → trust it as real Mike Tyson)
  const direct = await getWikipediaImageDetails(query);
  if (direct && isExactMatch(query, direct.title)) {
    return direct.url;
  }

  // If we got a direct result but the title doesn't match what we asked (e.g.
  // "Yasuo" redirected to "Yasuo Fukuda"), only accept if not flagged as real person
  // when biasing fictional. Otherwise accept it.
  if (direct && !biasFictional) {
    return direct.url;
  }
  if (direct && biasFictional && !looksLikeRealPerson(direct)) {
    return direct.url;
  }

  // No good direct hit. Search with fictional bias.
  if (biasFictional) {
    const searchQueries = [
      `${query} (character)`,
      `${query} fictional character`,
      `${query} video game character`,
      `${query} anime character`,
      `${query} character`,
    ];

    for (const sq of searchQueries) {
      try {
        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(sq)}&format=json&origin=*&srlimit=5`
        );
        if (!searchRes.ok) continue;
        const searchData = await searchRes.json();
        const results = searchData.query?.search || [];
        for (const item of results) {
          const details = await getWikipediaImageDetails(item.title);
          if (!details) continue;
          if (looksLikeRealPerson(details)) continue;
          return details.url;
        }
      } catch (e) {}
    }
    return null;
  }

  // No fictional bias — accept whatever search returns
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " character")}&format=json&origin=*&srlimit=3`
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const firstTitle = searchData.query?.search?.[0]?.title;
      if (firstTitle) {
        const d = await getWikipediaImageDetails(firstTitle);
        if (d) return d.url;
      }
    }
  } catch (e) {}

  return null;
}

async function fetchCharacterImage(name, universe) {
  if (!name || name.trim().length < 2) return null;
  const cleanName = name.trim();
  const cleanUniverse = (universe || "").trim().toLowerCase();

  if (cleanUniverse) {
    const wiki = FANDOM_MAP[cleanUniverse];
    if (wiki) {
      const url1 = await fetchFromFandom(wiki, cleanName, cleanName);
      if (url1) return url1;
      const url2 = await fetchFromFandom(wiki, `${cleanName} ${universe}`, cleanName);
      if (url2) return url2;
    } else {
      const guess = cleanUniverse.replace(/[^a-z0-9]/g, "");
      if (guess.length >= 3) {
        const url = await fetchFromFandom(guess, cleanName, cleanName);
        if (url) return url;
      }
    }
    const wikiPedia = await fetchFromWikipedia(`${cleanName} ${universe}`, false);
    if (wikiPedia) return wikiPedia;
  }

  return await fetchFromWikipedia(cleanName, true);
}

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
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const url = await fetchCharacterImage(name, universe);
      setImageUrl(url);
      setLoading(false);
    }, 700);
    return () => clearTimeout(timerRef.current);
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
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} style={{ display: "none" }} />
          {msg && <div className="override-msg">{msg}</div>}
        </>
      )}
      {mode === "url" && (
        <>
          <input
            className="override-url-input"
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

function AutoTextarea({ value, onChange, onKeyDown, placeholder, maxLength }) {
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

export default function BattleArena({
  initialBattle = null,
  f1, setF1, f2, setF2, u1, setU1, u2, setU2,
  override1, setOverride1, override2, setOverride2,
  claims1, setClaims1, claims2, setClaims2,
  draft1, setDraft1, draft2, setDraft2,
  battleType, setBattleType, location, setLocation, power, setPower, depth, setDepth,
  imgAdjust1, setImgAdjust1, imgAdjust2, setImgAdjust2,
  imgAdjusted1, setImgAdjusted1, imgAdjusted2, setImgAdjusted2,
}) {
  // Battle INPUTS (names, universes, feats, drafts, dropdowns, image overrides,
  // and framing) are lifted to App.jsx so they survive in-site navigation; this
  // component receives them and their setters as props. The verdict result and
  // the transient UI state below stay local and clear normally on unmount.
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialBattle?.result || null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [imgError1, setImgError1] = useState(false);
  const [imgError2, setImgError2] = useState(false);

  // When true, a verdict that arrives AFTER the user cancelled is discarded so it
  // doesn't pop onto a user who already left the clash. (The request still fired
  // and still counted against the rate limit; this is a UI escape, not a refund.)
  const cancelledRef = useRef(false);

  const img1 = useCharacterImage(f1, u1, override1);
  const img2 = useCharacterImage(f2, u2, override2);

  useEffect(() => { setImgError1(false); }, [img1.imageUrl]);
  useEffect(() => { setImgError2(false); }, [img2.imageUrl]);
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
    setError(""); setLoading(true); setResult(null);
    cancelledRef.current = false;

    // ===== REAL VERDICT (calls your Vercel backend at /api/battle) =====
    // The backend holds the API key securely and calls Anthropic for you.
    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  function shareBattle() {
    if (!result || !result.id) return;
    const url = window.location.origin + "/?b=" + result.id;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const isWinner1 = result && result.winner.toLowerCase().includes(f1.toLowerCase());
  const isDraw = result && result.winner === "Draw";
  const diffLabel = result ? verdictDiffLabel(result) : null;

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
              <span className="img-adjust-label">vertical</span>
              <input type="range" className="img-adjust-slider"
                min="0" max="100" step="1" value={adjust.y}
                onChange={e => setAdjust({ ...adjust, y: Number(e.target.value) })} />
            </div>
            <div className="img-adjust-row">
              <span className="img-adjust-label">zoom</span>
              <input type="range" className="img-adjust-slider"
                min="1" max="3" step="0.05" value={adjust.zoom}
                onChange={e => setAdjust({ ...adjust, zoom: Number(e.target.value) })} />
            </div>
            <div className="img-adjust-row">
              <span className="img-adjust-label">horizontal</span>
              <input type="range" className="img-adjust-slider"
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
            <input className="fighter-name-input" value={f1} onChange={e => setF1(e.target.value)} placeholder="Enter character name" />
            <input className="universe-input" value={u1} onChange={e => setU1(e.target.value)} placeholder="Universe / Series" />

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
            <input className="fighter-name-input" value={f2} onChange={e => setF2(e.target.value)} placeholder="Enter character name" />
            <input className="universe-input" value={u2} onChange={e => setU2(e.target.value)} placeholder="Universe / Series" />

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
            <label className="setting-label">Battle Type</label>
            <select className="setting-select" value={battleType} onChange={e => setBattleType(e.target.value)}>
              <option>Standard Fight</option>
              <option>In-Character</option>
              <option>Out of Character</option>
              <option>Battle of Wits</option>
              <option>Speed Blitz</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label">Location</label>
            <select className="setting-select" value={location} onChange={e => setLocation(e.target.value)}>
              <option>Neutral Terrain</option>
              <option>Urban City</option>
              <option>Space</option>
              <option>Their Home Universe</option>
              <option>Random</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label">Power Level</label>
            <select className="setting-select" value={power} onChange={e => setPower(e.target.value)}>
              <option>Canon Only</option>
              <option>Composite</option>
              <option>Post-Series Peak</option>
              <option>Current</option>
            </select>
          </div>
          <div className="setting-group">
            <label className="setting-label">Depth</label>
            <select className="setting-select" value={depth} onChange={e => setDepth(e.target.value)}>
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

        {result && (
          <div className="result-panel">
            {result.demo && (
              <div className="demo-banner">
                <strong>Demo verdict.</strong> Real AI analysis isn't connected yet; the winner here is illustrative only, to show how results will look.
              </div>
            )}
            <div className="result-header">
              <span className="winner-crown">{isDraw ? "⚖" : "🏆"}</span>
              <div>
                <div className="result-title">
                  {isDraw ? "It's a Draw" : `Winner: ${result.winner}`}
                </div>
                {diffLabel && <div className="verdict-diff">{diffLabel}</div>}
                <div className="result-subtitle">
                  Analyzed {result.feats_scanned} feats · {result.sources} sources
                </div>
              </div>
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
          </div>
        )}
      </div>
    </div>
  );
}