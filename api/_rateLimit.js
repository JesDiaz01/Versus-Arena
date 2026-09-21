// api/_rateLimit.js
// Durable, shared IP rate limiting backed by Upstash Redis, used by both API
// endpoints so the counters persist across all Vercel serverless instances.
//
// Credentials are read from the environment by Redis.fromEnv(), which expects
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. They are never hardcoded
// and never logged. Every limiter check FAILS OPEN: if Redis is unreachable the
// request is allowed through, so a cache outage can never take the site down.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazily created and memoized so a warm instance reuses one client/limiter set.
let redis = null;
function getRedis() {
  if (!redis) redis = Redis.fromEnv();
  return redis;
}

// ---- Escalating temporary-block tuning (repeat-offender protection) ----
// Offenses accrue per IP on REAL abuse signals and decay (offenses key TTL). Once they
// cross OFFENSE_THRESHOLD the IP gets a TEMPORARY block whose duration escalates with
// how many times it has been blocked. Every key is TTL'd, so blocks auto-expire and the
// escalation level itself resets - there are NO permanent lockouts (an IP can be a
// shared NAT). All Redis ops fail OPEN, exactly like the limiters below.
const OFFENSE_THRESHOLD = 5;                 // offenses within the window before the first block
const BLOCK_DURATIONS = [900, 3600, 86400];  // escalating block seconds: 15min -> 1hr -> 24hr (capped)
const OFFENSE_WINDOW = 3600;                 // offenses decay after 1h with no new offense
const LEVEL_WINDOW = 604800;                 // escalation level resets after 7 clean days
const ABUSE_TIMEOUT_MS = 600;                // fail-open timeout for any abuse Redis op

const OFFENSES_PREFIX = "abuse:offenses:";
const BLOCKED_PREFIX = "abuse:blocked:";
const LEVEL_PREFIX = "abuse:level:";

// IPs that are NEVER blocked or counted (e.g. your own IP while testing). Comma-
// separated in the ABUSE_ALLOWLIST env var; parsed once and memoized.
let allowlist = null;
function isAllowlisted(ip) {
  if (allowlist === null) {
    allowlist = new Set(
      String(process.env.ABUSE_ALLOWLIST || "")
        .split(",")
        .map(function(s) { return s.trim(); })
        .filter(function(s) { return s.length > 0; })
    );
  }
  return allowlist.has(ip);
}

let battleMin = null;
let battleHour = null;
let readLimiter = null;

function getBattleLimiters() {
  if (!battleMin) {
    const r = getRedis();
    // Same intent as the old in-memory limiter: 5 per minute AND 30 per hour.
    battleMin = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "rl:battle:min",
    });
    battleHour = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(30, "3600 s"),
      prefix: "rl:battle:hour",
    });
  }
  return { battleMin, battleHour };
}

function getReadLimiter() {
  if (!readLimiter) {
    // Cheap Supabase read (no model cost) but still abusable: 60 per minute.
    readLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      prefix: "rl:getbattle",
    });
  }
  return readLimiter;
}

// Normalize a header that may arrive as a string or as an array of values.
function headerValue(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length) return String(v[0]);
  return "";
}

// Derive the client IP used to key EVERY per-IP protection: the battle limits, the
// read limiter, and the escalating abuse block.
//
// This previously read the FIRST entry of x-forwarded-for, which is client-writable.
// The chain format is "originalClient, proxy1, proxy2...", where the leftmost entry is
// whatever the caller claimed and each trusted hop APPENDS the address it actually
// observed. So if a request arrives already carrying an x-forwarded-for, reading the
// left end hands an attacker a fresh identity per request -- enough to walk past the
// 5/min and 30/hr battle caps and the abuse block at once, leaving only the global
// daily cap between them and the Anthropic bill.
//
// Preference order:
//   1. x-vercel-forwarded-for, set by Vercel's edge and overwritten on every request,
//      so a caller cannot forge it. Absent off-platform (plain `vite`), hence the
//      fallbacks below.
//   2. the LAST entry of x-forwarded-for, appended by the nearest trusted proxy, so it
//      reflects an address that proxy genuinely saw. When the platform replaces the
//      header outright there is a single entry and this is simply that entry.
//   3. x-real-ip, then a stable fallback so a key always exists.
export function getClientIp(req) {
  const vercel = headerValue(req.headers["x-vercel-forwarded-for"]).trim();
  if (vercel) {
    const parts = vercel.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  const xff = headerValue(req.headers["x-forwarded-for"]);
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  const real = headerValue(req.headers["x-real-ip"]).trim();
  return real || "unknown";
}

// ---- IPv6 bucketing: key on the /64 prefix, not the full address ----
//
// Keying every per-IP protection on the FULL address is safe for IPv4, where an
// address is a scarce resource, but it is meaningless for IPv6. A residential IPv6
// customer is routinely delegated a whole /64 -- 2^64 addresses -- and every cheap
// VPS provider hands out a /64 as standard. Rotating the low 64 bits costs nothing
// and yields a fresh identity per request, which walks straight past the 5/min and
// 30/hr battle caps AND the escalating abuse block, leaving only the global daily
// cap between an attacker and the Anthropic bill.
//
// A /64 is the smallest unit that is actually allocated to a single subscriber, so
// it is the right granularity to rate limit on: it cannot be subdivided by the
// client. The tradeoff is that everyone behind one /64 shares a bucket, which is the
// same tradeoff IPv4 NAT already imposes and which the TTL'd, never-permanent block
// design already tolerates.

// Expand an IPv6 address to exactly 8 hex groups, resolving "::" compression and any
// trailing IPv4-mapped form (::ffff:1.2.3.4). Returns null for anything unparseable,
// so the caller can fall back to the raw string rather than collapsing bad input into
// one shared bucket.
function expandIpv6(addr) {
  const a = String(addr).split("%")[0]; // drop any zone id (fe80::1%eth0)
  if (!a || a.indexOf(":") === -1) return null;

  const compressed = a.indexOf("::") !== -1;
  let head, tail;
  if (compressed) {
    const parts = a.split("::");
    if (parts.length !== 2) return null; // "::" may appear at most once
    head = parts[0] ? parts[0].split(":") : [];
    tail = parts[1] ? parts[1].split(":") : [];
  } else {
    head = a.split(":");
    tail = [];
  }

  // A trailing dotted-quad occupies the last TWO groups once expanded.
  const lastList = tail.length ? tail : head;
  const last = lastList.length ? lastList[lastList.length - 1] : "";
  if (last && last.indexOf(".") !== -1) {
    const octets = last.split(".");
    if (octets.length !== 4) return null;
    const nums = octets.map(function (o) {
      return /^\d{1,3}$/.test(o) ? parseInt(o, 10) : -1;
    });
    if (nums.some(function (n) { return n < 0 || n > 255; })) return null;
    lastList.pop();
    lastList.push((((nums[0] << 8) | nums[1]) >>> 0).toString(16));
    lastList.push((((nums[2] << 8) | nums[3]) >>> 0).toString(16));
  }

  const missing = 8 - (head.length + tail.length);
  let groups;
  if (compressed) {
    if (missing < 1) return null; // "::" must stand for at least one zero group
    groups = head.concat(new Array(missing).fill("0"), tail);
  } else {
    if (head.length !== 8) return null;
    groups = head;
  }

  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
  }
  return groups;
}

// The key EVERY per-IP protection is bucketed by. IPv4 (and the "unknown" fallback)
// passes through unchanged, so nothing about existing IPv4 behavior moves; IPv6
// collapses to its /64 prefix. An address that does not parse falls back to itself,
// which is no worse than the previous behavior.
export function rateLimitKey(ip) {
  if (!ip || ip.indexOf(":") === -1) return ip;
  const groups = expandIpv6(ip);
  if (!groups) return ip;

  const n = groups.map(function (g) { return parseInt(g, 16); });

  // IPv4-MAPPED (::ffff:a.b.c.d): a dual-stack socket reports a genuine IPv4 client
  // in this form. Its first four groups are all zero, so bucketing it as a /64 would
  // drop EVERY IPv4-mapped client into one shared bucket -- a self-inflicted outage,
  // not a protection. Unwrap it back to the IPv4 address and key on that, exactly as
  // if the header had carried the dotted form.
  if (n[0] === 0 && n[1] === 0 && n[2] === 0 && n[3] === 0 && n[4] === 0 && n[5] === 0xffff) {
    return [n[6] >> 8, n[6] & 0xff, n[7] >> 8, n[7] & 0xff].join(".");
  }

  // Canonicalize each group (strip leading zeros, lowercase) so the same /64 written
  // different ways ("2001:0db8::" vs "2001:db8::") always produces one key.
  return n.slice(0, 4).map(function (g) { return g.toString(16); }).join(":") + "::/64";
}

// Battle endpoint: check the minute cap first so the returned scope matches the
// old limiter's "minute" vs "hour" distinction (used for Retry-After + message).
export async function checkBattleLimit(ip) {
  try {
    const key = rateLimitKey(ip);
    const limiters = getBattleLimiters();
    const min = await limiters.battleMin.limit(key);
    if (!min.success) return { limited: true, scope: "minute" };
    const hour = await limiters.battleHour.limit(key);
    if (!hour.success) return { limited: true, scope: "hour" };
    return { limited: false };
  } catch (e) {
    console.warn("Rate limiter unavailable, failing open:", e && e.message);
    return { limited: false };
  }
}

// Read endpoint: single generous window.
//
// The Upstash check is awaited in front of the Supabase read, so a slow or cold
// Redis (whose SDK retries with exponential backoff) could otherwise block a
// shared-link open for several seconds before failing open. To keep reads fast,
// race the limiter against a short timeout: if Redis does not answer within
// READ_LIMIT_TIMEOUT_MS, fail OPEN and let the read proceed. The limiter promise
// is still allowed to settle (and is counted) on the warm path; on the slow path
// it is orphaned, so we attach a no-op catch to it so a late rejection never
// surfaces as an unhandledRejection.
const READ_LIMIT_TIMEOUT_MS = 600;

export async function checkReadLimit(ip) {
  try {
    const limitPromise = getReadLimiter().limit(rateLimitKey(ip));
    // Swallow a late rejection of the orphaned promise (after the race resolves).
    limitPromise.catch(() => {});

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(function() { resolve({ timedOut: true }); }, READ_LIMIT_TIMEOUT_MS);
    });

    const r = await Promise.race([limitPromise, timeoutPromise]);
    if (r && r.timedOut) {
      // Redis was too slow; fail open rather than delay the read.
      return { limited: false };
    }
    return { limited: !r.success };
  } catch (e) {
    console.warn("Rate limiter unavailable, failing open:", e && e.message);
    return { limited: false };
  }
}

// ---- Escalating temporary block: check + record (Upstash, fail-open) ----
//
// checkAbuseBlock runs FIRST in the battle and character-image handlers - before the
// rate limit, the daily cap, and any Anthropic call - so a blocked IP costs nothing.
// It reads the remaining TTL of abuse:blocked:<ip> in one round trip, raced against
// ABUSE_TIMEOUT_MS; any error or timeout FAILS OPEN (returns not-blocked).
export async function checkAbuseBlock(ip) {
  const key = rateLimitKey(ip);
  // Match the allowlist against BOTH forms, so an operator can list either a literal
  // address or the /64 key it buckets into and have it work either way.
  if (isAllowlisted(ip) || isAllowlisted(key)) return { blocked: false };
  try {
    const ttlPromise = getRedis().ttl(BLOCKED_PREFIX + key);
    ttlPromise.catch(function() {}); // swallow a late rejection after the race resolves
    const timeoutPromise = new Promise(function(resolve) {
      setTimeout(function() { resolve({ timedOut: true }); }, ABUSE_TIMEOUT_MS);
    });
    const r = await Promise.race([ttlPromise, timeoutPromise]);
    if (r && r.timedOut) return { blocked: false }; // Redis too slow - fail open
    // ttl returns seconds remaining; -2 (no key) / -1 (no expiry) mean not blocked.
    if (typeof r === "number" && r > 0) return { blocked: true, retryAfter: r };
    return { blocked: false };
  } catch (e) {
    return { blocked: false }; // fail open
  }
}

// The actual offense bookkeeping: bump the per-IP counter (refreshing its decay
// window) and, once it crosses the threshold, apply an escalating temporary block and
// clear the counter. Kept separate so recordOffense can bound + swallow it.
async function recordOffenseInner(key, weight) {
  const redis = getRedis();
  const w = (typeof weight === "number" && weight > 0) ? Math.floor(weight) : 1;
  const offensesKey = OFFENSES_PREFIX + key;
  const count = await redis.incrby(offensesKey, w);
  await redis.expire(offensesKey, OFFENSE_WINDOW);
  if (count >= OFFENSE_THRESHOLD) {
    const level = await redis.incr(LEVEL_PREFIX + key);
    await redis.expire(LEVEL_PREFIX + key, LEVEL_WINDOW);
    const duration = BLOCK_DURATIONS[Math.min(level - 1, BLOCK_DURATIONS.length - 1)];
    await redis.set(BLOCKED_PREFIX + key, "1", { ex: duration });
    await redis.del(offensesKey); // next block needs a fresh batch of offenses
  }
}

// recordOffense is called at each REAL abuse point. It is awaited at the call sites so
// the increment completes before a serverless instance can freeze, but it is bounded by
// ABUSE_TIMEOUT_MS and fully swallowed, so a slow/down Redis can never delay or break
// the response. No-op for allowlisted IPs.
export async function recordOffense(ip, weight) {
  const key = rateLimitKey(ip);
  if (isAllowlisted(ip) || isAllowlisted(key)) return;
  try {
    const inner = recordOffenseInner(key, weight);
    inner.catch(function() {}); // swallow a late rejection after the race resolves
    const timeoutPromise = new Promise(function(resolve) {
      setTimeout(resolve, ABUSE_TIMEOUT_MS);
    });
    await Promise.race([inner, timeoutPromise]);
  } catch (e) {
    // never break the response
  }
}
