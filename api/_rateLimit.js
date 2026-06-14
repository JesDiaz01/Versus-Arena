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
export async function checkReadLimit(ip) {
  try {
    const r = await getReadLimiter().limit(ip);
    return { limited: !r.success };
  } catch (e) {
    console.warn("Rate limiter unavailable, failing open:", e && e.message);
    return { limited: false };
  }
}
