// api/my-battles.js
// Vercel Serverless Function - returns the signed-in user's saved battle history.
// Service-role, server-side only (same pattern as get-battle.js): the key never
// reaches the browser, and battles stays fully RLS-locked to the browser -- the
// verdict data is read here on the server and returned in one call.
//
// SECURITY: the user is identified ONLY by db.auth.getUser(token), which verifies
// the JWT signature against the project secret. The user_id filter is derived from
// that verified identity -- a user_id is NEVER accepted from the query or body, so
// one user can never request another user's history.

import { createClient } from "@supabase/supabase-js";
import { getClientIp, checkReadLimit } from "./_rateLimit.js";

// One page of history. Smaller than the old flat 100-row pull: each row carries the
// battle's full battle_data + result JSON, so a big page was hundreds of KB for a list
// that only renders four fields. The client asks for more via ?offset=.
const PAGE_SIZE = 25;

// Bound how deep pagination can go, so a crafted offset can never ask the DB to skip an
// unbounded number of rows.
const MAX_OFFSET = 5000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Rate limit (shared, Redis-backed; fails open), same as get-battle.js ---
  const rl = await checkReadLimit(getClientIp(req));
  if (rl.limited) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
  }

  // --- Require a bearer token ---
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ error: "Sign in to view your battles." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server not configured." });
  }

  try {
    const db = createClient(supabaseUrl, supabaseKey);

    // JWT signature verification happens HERE. An invalid/expired token yields no
    // user -> 401. The verified user.id is the ONLY source of the ownership filter.
    const { data: userData, error: authError } = await db.auth.getUser(token);
    const user = userData && userData.user;
    if (authError || !user || !user.id) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    // Page offset from the query string; anything non-numeric or negative reads as 0.
    const parsedOffset = parseInt(req.query.offset, 10);
    const offset = Number.isFinite(parsedOffset) && parsedOffset > 0
      ? Math.min(parsedOffset, MAX_OFFSET)
      : 0;

    // Pull this user's saved links (newest first), joined to the battle rows. The
    // user_id filter comes from the verified identity above, not from the request.
    // Fetch ONE extra row beyond the page so we can tell the client whether more exist
    // without running a second count query.
    const { data, error } = await db
      .from("saved_battles")
      .select("battle_id, created_at, battles ( id, battle_data, result )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE);

    if (error) {
      console.error("my-battles query error:", error);
      return res.status(500).json({ error: "Could not load your battles. Try again in a moment." });
    }

    // The extra row fetched above only answers "is there another page?" -- it is never
    // returned. nextOffset counts ROWS CONSUMED (not battles emitted), so links whose
    // battle row is missing and get filtered out below still advance the cursor and
    // cannot cause the same rows to be served twice.
    const rows = data || [];
    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    // Return only what the list view needs to render + re-open each battle.
    const battles = page
      .map(function (row) {
        const b = row.battles || {};
        const bd = b.battle_data || {};
        const result = b.result || {};
        // Skip a link whose battle row is missing (e.g. a purged battle).
        if (!b.id) return null;
        return {
          id: b.id,
          f1: bd.f1 || "",
          f2: bd.f2 || "",
          winner: result.winner || "",
          created_at: row.created_at,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ battles, hasMore, nextOffset: offset + page.length });
  } catch (err) {
    console.error("my-battles error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
