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

// Derive the client IP exactly as the original in-memory limiter did: first
// entry of x-forwarded-for, then x-real-ip, then a stable fallback.
export function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length) return String(xff[0]).trim();
  return req.headers["x-real-ip"] || "unknown";
}

// Battle endpoint: check the minute cap first so the returned scope matches the
// old limiter's "minute" vs "hour" distinction (used for Retry-After + message).
export async function checkBattleLimit(ip) {
  try {
    const limiters = getBattleLimiters();
    const min = await limiters.battleMin.limit(ip);
    if (!min.success) return { limited: true, scope: "minute" };
    const hour = await limiters.battleHour.limit(ip);
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
    const limitPromise = getReadLimiter().limit(ip);
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
  if (isAllowlisted(ip)) return { blocked: false };
  try {
    const ttlPromise = getRedis().ttl(BLOCKED_PREFIX + ip);
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
async function recordOffenseInner(ip, weight) {
  const redis = getRedis();
  const w = (typeof weight === "number" && weight > 0) ? Math.floor(weight) : 1;
  const offensesKey = OFFENSES_PREFIX + ip;
  const count = await redis.incrby(offensesKey, w);
  await redis.expire(offensesKey, OFFENSE_WINDOW);
  if (count >= OFFENSE_THRESHOLD) {
    const level = await redis.incr(LEVEL_PREFIX + ip);
    await redis.expire(LEVEL_PREFIX + ip, LEVEL_WINDOW);
    const duration = BLOCK_DURATIONS[Math.min(level - 1, BLOCK_DURATIONS.length - 1)];
    await redis.set(BLOCKED_PREFIX + ip, "1", { ex: duration });
    await redis.del(offensesKey); // next block needs a fresh batch of offenses
  }
}

// recordOffense is called at each REAL abuse point. It is awaited at the call sites so
// the increment completes before a serverless instance can freeze, but it is bounded by
// ABUSE_TIMEOUT_MS and fully swallowed, so a slow/down Redis can never delay or break
// the response. No-op for allowlisted IPs.
export async function recordOffense(ip, weight) {
  if (isAllowlisted(ip)) return;
  try {
    const inner = recordOffenseInner(ip, weight);
    inner.catch(function() {}); // swallow a late rejection after the race resolves
    const timeoutPromise = new Promise(function(resolve) {
      setTimeout(resolve, ABUSE_TIMEOUT_MS);
    });
    await Promise.race([inner, timeoutPromise]);
  } catch (e) {
    // never break the response
  }
}
