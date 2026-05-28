import { useState, useEffect, useRef } from "react";

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

const CLAIM_LIMIT = 100;

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

async function fetchFandomPageImage(wikiName, pageTitle) {
  try {
    const url = `https://${wikiName}.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=images|text&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const images = data?.parse?.images || [];
    for (const imgName of images) {
      const lower = imgName.toLowerCase();
      if (lower.includes("logo") || lower.includes("icon") ||
          lower.includes("symbol") || lower.includes("button") ||
          lower.endsWith(".svg") || lower.includes("placeholder")) continue;
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
    const html = data?.parse?.text?.["*"];
    if (html) {
      const match = html.match(/<img[^>]+src="(https?:\/\/[^"]+\.(?:png|jpg|jpeg|webp|gif))"/i);
      if (match?.[1]) return match[1].split("/revision/")[0];
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

async function fetchFromFandom(wikiName, query) {
  const suffix = FANDOM_PAGE_SUFFIX[wikiName];
  if (suffix) {
    const img = await fetchFandomPageImage(wikiName, query + suffix);
    if (img) return img;
  }
  const direct = await fetchFandomPageImage(wikiName, query);
  if (direct) return direct;
  const titles = await searchFandomPages(wikiName, query, 8);
  for (const title of titles) {
    if (/^list of /i.test(title)) continue;
    const img = await fetchFandomPageImage(wikiName, title);
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
      const url1 = await fetchFromFandom(wiki, cleanName);
      if (url1) return url1;
      const url2 = await fetchFromFandom(wiki, `${cleanName} ${universe}`);
      if (url2) return url2;
    } else {
      const guess = cleanUniverse.replace(/[^a-z0-9]/g, "");
      if (guess.length >= 3) {
        const url = await fetchFromFandom(guess, cleanName);
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

function ImageOverride({ onSet, hasOverride, onClear }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef(null);

  function handleUrlSubmit() {
    if (!urlInput.trim()) return;
    onSet(urlInput.trim());
    setUrlInput("");
    setOpen(false);
    setMode(null);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image too large. Max 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      onSet(ev.target.result);
      setOpen(false);
      setMode(null);
    };
    reader.readAsDataURL(file);
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
      <button className="image-override-trigger" onClick={() => setOpen(true)}>
        Use my own image
      </button>
    );
  }

  return (
    <div className="image-override-panel">
      {!mode && (
        <>
          <button className="override-option" onClick={() => setMode("url")}>Paste URL</button>
          <button className="override-option" onClick={() => fileInputRef.current?.click()}>Upload file</button>
          <button className="override-cancel" onClick={() => setOpen(false)}>Cancel</button>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} style={{ display: "none" }} />
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

export default function BattleArena() {
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const img1 = useCharacterImage(f1, u1, override1);
  const img2 = useCharacterImage(f2, u2, override2);

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

    const claimsBlock1 = claims1.length
      ? `\nUser-submitted claims about ${f1} (NOT necessarily canon, treat as user input):\n${claims1.map((c, i) => `${i + 1}. "${c}"`).join("\n")}`
      : "";
    const claimsBlock2 = claims2.length
      ? `\nUser-submitted claims about ${f2} (NOT necessarily canon, treat as user input):\n${claims2.map((c, i) => `${i + 1}. "${c}"`).join("\n")}`
      : "";

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [{
            role: "user",
            content: `You are a fictional character battle analyst. Analyze this 1v1 fight based on known feats, powerscaling, and lore.

Fighter 1: ${f1} (${u1 || "unknown universe"})
Fighter 2: ${f2} (${u2 || "unknown universe"})
Battle Type: ${battleType}
Location: ${location}
Power Level: ${power}
Depth: ${depth}
${claimsBlock1}
${claimsBlock2}

Weigh canonical feats first. If user-submitted claims are provided, take them into account but clearly label them as user claims in your analysis.

Respond ONLY with a valid JSON object (no markdown, no backticks) with these fields:
{
  "winner": "name of winner or Draw",
  "verdict_short": "one confident sentence summary",
  "analysis": "3-5 sentences citing feats and reasoning. If user claims influenced the outcome, explicitly note that.",
  "advantages": ["up to 3 short labels like Speed Advantage or Higher Durability"],
  "user_claims_used": ["short summary of each user claim that influenced the verdict, if any"],
  "feats_scanned": number between 20 and 80,
  "sources": number between 5 and 20
}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (e) {
      setError("Something went wrong. Try again in a moment.");
    }
    setLoading(false);
  }

  function reset() {
    setF1(""); setF2(""); setU1(""); setU2("");
    setOverride1(null); setOverride2(null);
    setClaims1([]); setClaims2([]);
    setDraft1(""); setDraft2("");
    setResult(null); setError("");
  }

  const isWinner1 = result && result.winner.toLowerCase().includes(f1.toLowerCase());
  const isDraw = result && result.winner === "Draw";

  function renderAvatar(side) {
    const img = side === 1 ? img1 : img2;
    const fighter = side === 1 ? f1 : f2;
    const stateClass = result
      ? (isDraw ? "active" : ((side === 1 ? isWinner1 : !isWinner1) ? "winner" : "loser"))
      : (fighter ? "active" : "");

    return (
      <div className={`fighter-avatar ${stateClass} ${img.loading ? "loading" : ""}`}>
        {img.imageUrl ? (
          <img src={img.imageUrl} alt={fighter} className="fighter-photo" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <FighterSilhouette />
        )}
        {img.loading && <div className="avatar-spinner" />}
      </div>
    );
  }

  return (
    <div className="arena">
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

        <div className="fight-btn-wrap">
          <button className={`fight-btn ${loading ? "loading" : ""}`} onClick={simulate} disabled={loading}>
            {loading ? "Analyzing..." : "Simulate Battle"}
          </button>
        </div>

        {result && (
          <div className="result-panel">
            <div className="result-header">
              <span className="winner-crown">{isDraw ? "⚖" : "🏆"}</span>
              <div>
                <div className="result-title">
                  {isDraw ? "It's a Draw" : `Winner: ${result.winner}`}
                </div>
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
              {result.analysis}
            </p>

            {result.user_claims_used && result.user_claims_used.length > 0 && (
              <div className="claims-disclosure">
                <div className="claims-disclosure-label">User Claims Factored In</div>
                <ul className="claims-disclosure-list">
                  {result.user_claims_used.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="share-row">
              <button className="rematch-btn" onClick={reset}>New Battle</button>
              <button className="share-btn">Share Result</button>
              <button className="share-btn">Copy Link</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}