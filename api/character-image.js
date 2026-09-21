// api/character-image.js
// Vercel Serverless Function - resolves a character's avatar image URL from Fandom
// and Wikipedia SERVER-SIDE. Doing this off the browser removes the whole class of
// CORS/redirect failures: servers ignore CORS, follow redirects automatically (so a
// renamed wiki slug like invincible -> amazon-invincible self-heals), and a wiki 404
// is just a 404 instead of being mislabeled as a CORS error. The resolution logic is
// moved nearly verbatim from BattleArena.jsx; only the transport changed.

import { getClientIp, checkReadLimit, checkAbuseBlock, recordOffense } from "./_rateLimit.js";
import { containsBlockedContent } from "./_contentFilter.js";

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
  "the boys": "the-boys", "invincible": "amazon-invincible",
  "star wars": "starwars", "harry potter": "harrypotter",
  "lord of the rings": "lotr", "lotr": "lotr",
  "game of thrones": "gameofthrones", "got": "gameofthrones",
  "halo": "halo", "mass effect": "masseffect",
  "elden ring": "eldenring", "dark souls": "darksouls",
  "final fantasy": "finalfantasy", "kingdom hearts": "kingdomhearts",
  "pokemon": "pokemon", "pok\u00e9mon": "pokemon",
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

// ---- Outbound request budget ----
//
// Resolving one portrait can fan out badly. The image-list fallback below used to
// fetch EVERY acceptable image on a page one at a time (a busy wiki page carries
// hundreds), inside a loop over 8 search results, inside two fetchFromFandom calls,
// followed by Wikipedia's 5-query x 5-result loop. None of those fetches had a
// timeout, so a single GET could issue hundreds of sequential requests and sit there
// until Vercel's wall clock killed the function. At 60 req/min/IP that is an easy way
// to burn function-duration and starve the instance -- a self-inflicted DoS that
// needs no malice, just an unlucky character name.
//
// Three bounds now apply together:
//   1. every outbound fetch gets FETCH_TIMEOUT_MS,
//   2. the fan-out loops are capped (candidates + search titles),
//   3. a wall-clock deadline is threaded through every call, so once the budget is
//      spent the whole resolution short-circuits and returns "no image found".
// A miss is already a normal, well-handled outcome (the UI draws a silhouette), so
// giving up early is strictly better than hanging.
const FETCH_TIMEOUT_MS = 3000;       // per outbound request
const OVERALL_BUDGET_MS = 8000;      // whole-resolution wall clock, under the function limit
const MAX_IMAGE_CANDIDATES = 8;      // image-list entries probed per page (was: unbounded)
const MAX_SEARCH_TITLES = 4;         // search results followed per wiki (was: 8)

// Hosts an image URL is allowed to come from. Fandom lets anyone create a wiki, and
// the HTML-scrape fallback returns whatever <img src> it finds on the page, so without
// this a hostile wiki could hand back a URL pointing at its own server -- which this
// site would then render in an <img>, sending every viewer's browser (and IP) there.
// Constraining the RESULT closes that regardless of what the page contains.
const ALLOWED_IMAGE_HOSTS = [
  "fandom.com",
  "nocookie.net",      // static.wikia.nocookie.net -- where Fandom actually serves images
  "wikia.com",         // legacy Fandom image host, still referenced by older pages
  "wikipedia.org",
  "wikimedia.org",     // upload.wikimedia.org -- where Wikipedia serves images
];

function isAllowedImageUrl(u) {
  if (typeof u !== "string" || !u) return false;
  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return ALLOWED_IMAGE_HOSTS.some(function (base) {
    return host === base || host.endsWith("." + base);
  });
}

// A resolution context: one wall-clock deadline shared by every fetch in the request.
function newBudget() {
  return { deadline: Date.now() + OVERALL_BUDGET_MS };
}

function budgetSpent(ctx) {
  return !ctx || Date.now() >= ctx.deadline;
}

// Single bounded fetch: honors the per-request timeout AND the overall deadline,
// whichever is sooner. Returns parsed JSON, or null on timeout/error/spent budget --
// every caller already treats null as "nothing found", so no error paths change.
async function fetchJson(url, ctx) {
  if (budgetSpent(ctx)) return null;
  const remaining = ctx.deadline - Date.now();
  const timeout = Math.min(FETCH_TIMEOUT_MS, remaining);
  if (timeout <= 0) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // abort, network error, or malformed JSON
  }
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

// Normalize a name or filename for loose matching: lowercase, then drop anything
// that is not a letter or digit (spaces, underscores, punctuation, extension dot).
function normalizeForMatch(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Option 1: the page's representative portrait via the PageImages extension (the
// infobox image, i.e. the actual subject), not just the first image on the page.
async function fetchFandomPortrait(wikiName, pageTitle, ctx) {
  const url = `https://${wikiName}.fandom.com/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=400&format=json&origin=*`;
  const data = await fetchJson(url, ctx);
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  return page?.original?.source || page?.thumbnail?.source || null;
}

async function fetchFandomPageImage(wikiName, pageTitle, nameForMatch, ctx) {
  // Option 1: prefer the page's representative portrait (infobox image) first.
  const portrait = await fetchFandomPortrait(wikiName, pageTitle, ctx);
  if (portrait) return portrait;

  // Fallback: scan the page's full image list (PageImages absent or empty).
  try {
    const url = `https://${wikiName}.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=images|text&format=json&origin=*`;
    const data = await fetchJson(url, ctx);
    if (!data) return null;
    const images = data?.parse?.images || [];

    // Drop logos/icons/svg/placeholder art.
    const acceptable = images.filter(function(imgName) {
      const lower = imgName.toLowerCase();
      return !(lower.includes("logo") || lower.includes("icon") ||
               lower.includes("symbol") || lower.includes("button") ||
               lower.endsWith(".svg") || lower.includes("placeholder"));
    });

    // Option 2: float filenames that match the subject's name to the front; keep the
    // rest in original order so we still return SOME image when nothing matches.
    let ordered = acceptable;
    const target = normalizeForMatch(nameForMatch);
    if (target) {
      const matches = acceptable.filter(function(n) { return normalizeForMatch(n).includes(target); });
      if (matches.length > 0) {
        const rest = acceptable.filter(function(n) { return matches.indexOf(n) === -1; });
        ordered = matches.concat(rest);
      }
    }

    // Probe only the best few candidates. The ordering above already floats
    // name-matching filenames to the front, so the cap costs almost nothing in hit
    // rate while turning an unbounded per-page fan-out into at most a handful of
    // requests. The budget check exits the loop the moment the deadline passes.
    for (const imgName of ordered.slice(0, MAX_IMAGE_CANDIDATES)) {
      if (budgetSpent(ctx)) return null;
      const imgUrl = `https://${wikiName}.fandom.com/api.php?action=query&titles=File:${encodeURIComponent(imgName)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const imgData = await fetchJson(imgUrl, ctx);
      const pages = imgData?.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        const u = page?.imageinfo?.[0]?.url;
        if (u) return u;
      }
    }

    // HTML fallback: prefer an <img> whose filename matches the subject's name,
    // otherwise the first image in the parsed markup.
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

async function searchFandomPages(wikiName, query, limit, ctx) {
  const url = `https://${wikiName}.fandom.com/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${limit}&format=json&origin=*`;
  const data = await fetchJson(url, ctx);
  return data?.[1] || [];
}

async function fetchFromFandom(wikiName, query, nameForMatch, ctx) {
  const matchName = nameForMatch || query;
  const suffix = FANDOM_PAGE_SUFFIX[wikiName];
  if (suffix) {
    const img = await fetchFandomPageImage(wikiName, query + suffix, matchName, ctx);
    if (img) return img;
  }
  const direct = await fetchFandomPageImage(wikiName, query, matchName, ctx);
  if (direct) return direct;
  const titles = await searchFandomPages(wikiName, query, MAX_SEARCH_TITLES, ctx);
  for (const title of titles.slice(0, MAX_SEARCH_TITLES)) {
    if (budgetSpent(ctx)) return null;
    if (/^list of /i.test(title)) continue;
    const img = await fetchFandomPageImage(wikiName, title, matchName, ctx);
    if (img) return img;
  }
  return null;
}

async function getWikipediaImageDetails(title, ctx) {
  const data = await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    ctx
  );
  if (!data) return null;
  const img = data.thumbnail?.source || data.originalimage?.source;
  if (img) return {
    url: img,
    title: data.title || title,
    summary: data.extract || "",
    description: data.description || ""
  };
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

// True when a Wikipedia result is clearly a WORK (a series/film/franchise) rather
// than the character itself - avoids handing back a comic cover or a season poster.
function looksLikeWork(details, subjectName) {
  if (!details) return false;
  const desc = (details.description || "").toLowerCase();
  const workSignals = [
    "comic book series", "comics series", "comic series", "comic book limited series",
    "manga series", "anime series", "anime television series",
    "television series", "tv series", "animated series", "animated television series",
    "web series", "miniseries", "television season", "season of",
    "film series", "media franchise", "video game series",
    "novel series", "book series",
  ];
  for (const sig of workSignals) {
    if (desc.includes(sig)) return true;
  }
  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = norm(details.title);
  const n = norm(subjectName);
  if (n && t.indexOf(n) === -1) return true;
  return false;
}

async function fetchFromWikipedia(query, biasFictional, subjectName, ctx) {
  if (subjectName === undefined) subjectName = query;
  // Direct lookup first. An EXACT title match is trusted even for a real person
  // (Mike Tyson -> "Mike Tyson" page -> trust it).
  const direct = await getWikipediaImageDetails(query, ctx);
  if (direct && isExactMatch(query, direct.title)) {
    return direct.url;
  }

  // A non-exact direct hit is only trusted when it is NOT a series/franchise work
  // whose title fails to name the subject. Real-person filtering still applies.
  if (direct && !looksLikeWork(direct, subjectName)) {
    if (!biasFictional) return direct.url;
    if (!looksLikeRealPerson(direct)) return direct.url;
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
      if (budgetSpent(ctx)) return null;
      const searchData = await fetchJson(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(sq)}&format=json&origin=*&srlimit=5`,
        ctx
      );
      if (!searchData) continue;
      const results = searchData.query?.search || [];
      for (const item of results) {
        if (budgetSpent(ctx)) return null;
        const details = await getWikipediaImageDetails(item.title, ctx);
        if (!details) continue;
        if (looksLikeRealPerson(details)) continue;
        if (looksLikeWork(details, subjectName)) continue;
        return details.url;
      }
    }
    return null;
  }

  // No fictional bias - accept a loose search hit only if it actually names the
  // subject, so a "{series} season N" poster can never stand in for the character.
  const searchData = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " character")}&format=json&origin=*&srlimit=3`,
    ctx
  );
  const firstTitle = searchData?.query?.search?.[0]?.title;
  if (firstTitle) {
    const d = await getWikipediaImageDetails(firstTitle, ctx);
    if (d && !looksLikeWork(d, subjectName)) return d.url;
  }

  return null;
}

async function fetchCharacterImage(name, universe, ctx) {
  if (!name || name.trim().length < 2) return null;
  const cleanName = name.trim();
  const cleanUniverse = (universe || "").trim().toLowerCase();

  if (cleanUniverse) {
    const wiki = FANDOM_MAP[cleanUniverse];
    if (wiki) {
      const url1 = await fetchFromFandom(wiki, cleanName, cleanName, ctx);
      if (url1) return url1;
      const url2 = await fetchFromFandom(wiki, `${cleanName} ${universe}`, cleanName, ctx);
      if (url2) return url2;
    } else {
      // An unmapped universe becomes a GUESSED subdomain: https://<guess>.fandom.com.
      // The strip below keeps it to a bare label, so it cannot escape fandom.com into
      // another host or a path -- but Fandom lets anyone create a wiki, so the page
      // this reaches may well be attacker-authored. That is why the RESULT is host-
      // checked by isAllowedImageUrl before it is ever returned to a browser.
      const guess = cleanUniverse.replace(/[^a-z0-9]/g, "");
      if (guess.length >= 3) {
        const url = await fetchFromFandom(guess, cleanName, cleanName, ctx);
        if (url) return url;
      }
    }
    // Universe Wikipedia attempt; work-rejection means a non-matching series/season
    // hit returns null here and we fall through to the name-only floor below.
    const wikiPedia = await fetchFromWikipedia(`${cleanName} ${universe}`, false, cleanName, ctx);
    if (wikiPedia) return wikiPedia;
  }

  // Name-only floor: the guaranteed fallback. A universe lookup only returns above
  // when it found something confident, so it can only improve on this, never worsen.
  return await fetchFromWikipedia(cleanName, true, cleanName, ctx);
}

export default async function handler(req, res) {
  const ip = getClientIp(req);

  if (req.method !== "GET") {
    await recordOffense(ip, 2); // wrong method on a GET-only endpoint = a probe
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Escalating abuse block (before the rate limit and any wiki fetch). Fails open.
  const ab = await checkAbuseBlock(ip);
  if (ab.blocked) {
    res.setHeader("Retry-After", String(ab.retryAfter));
    return res.status(429).json({ error: "Temporarily blocked due to repeated abuse. Try again later." });
  }

  // Rate limit (shared read-path limiter, Redis-backed; fails open).
  const rl = await checkReadLimit(ip);
  if (rl.limited) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
  }

  // Validate/sanitize inputs (assume direct curl access).
  const rawName = typeof req.query.name === "string" ? req.query.name.trim() : "";
  const rawUniverse = typeof req.query.universe === "string" ? req.query.universe.trim() : "";
  if (!rawName || rawName.length < 2 || rawName.length > 80) {
    return res.status(400).json({ error: "Invalid name." });
  }
  if (rawUniverse.length > 80) {
    return res.status(400).json({ error: "Invalid universe." });
  }

  // Defense in depth: never fire a real wiki search for a slur/blocked name or
  // universe. Reuses the same in-memory filter (and CUSTOM_ALLOWED whitelist) as
  // api/battle.js, so this is a microsecond check with no network cost and cannot
  // false-positive a legitimate character. A hit silhouettes (url: null), exactly
  // like a not-found; clean input proceeds unchanged.
  if (containsBlockedContent([rawName, rawUniverse])) {
    res.setHeader("Cache-Control", "public, s-maxage=30");
    return res.status(200).json({ url: null });
  }

  try {
    const resolved = await fetchCharacterImage(rawName, rawUniverse, newBudget());

    // Host-check the RESULT before handing it to a browser. Everything above walks
    // third-party wikis, and the HTML-scrape fallback in particular returns whatever
    // <img src> a page happens to carry -- on a wiki anyone can create. Without this,
    // a crafted wiki could point every viewer's browser (and IP) at its own server.
    // A rejected URL degrades to the same silhouette as a miss.
    const url = isAllowedImageUrl(resolved) ? resolved : null;
    if (resolved && !url) {
      console.warn("character-image: rejected off-allowlist image host");
    }

    // Edge-cache results: long for a confident hit, short for a miss so a transient
    // wiki failure does not get cached for a week. Keyed by the full query string.
    if (url) {
      res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");
    } else {
      res.setHeader("Cache-Control", "public, s-maxage=30");
    }
    return res.status(200).json({ url: url || null });
  } catch (err) {
    console.error("character-image error:", err && err.message);
    return res.status(200).json({ url: null });
  }
}
