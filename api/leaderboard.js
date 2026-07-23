// api/leaderboard.js
// Vercel Serverless Function - returns the weekly "Top Matchups" leaderboard: the
// most-fought matchups over the rolling last 7 UTC days. Service-role, server-side only
// (same pattern as get-battle.js / my-battles.js): the matchup_counts / matchup_meta
// tables are RLS-locked from the browser, so the aggregate is read here and returned in
// one call. The heavy lifting (group + sum + join) lives in the leaderboard_weekly SQL
// function; this handler just shapes the rows for the frontend.

import { createClient } from "@supabase/supabase-js";
import { getClientIp, checkReadLimit } from "./_rateLimit.js";

const MAX_ROWS = 10;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Rate limit (shared, Redis-backed; fails open), same as the other read paths ---
  const rl = await checkReadLimit(getClientIp(req));
  if (rl.limited) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server not configured." });
  }

  try {
    const db = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await db.rpc("leaderboard_weekly", { p_limit: MAX_ROWS });

    if (error) {
      console.error("leaderboard rpc error:", error);
      return res.status(500).json({ error: "Could not load the leaderboard. Try again in a moment." });
    }

    // Shape each row into the two sides the frontend renders. Names/universes are already
    // capped at the API boundary when recorded, so no re-sanitizing is needed here.
    const matchups = (data || []).map(function (row) {
      return {
        a: { name: row.a_name || "", universe: row.a_universe || "" },
        b: { name: row.b_name || "", universe: row.b_universe || "" },
        count: Number(row.hits) || 0,
      };
    });

    // Short edge cache: the board is identical for everyone, so let Vercel serve it from
    // the edge, but keep the window tight (60s fresh, 120s stale-while-revalidate) so a
    // freshly fought matchup climbs the board within about a minute rather than lagging
    // several minutes behind -- important while the site is new and low-traffic.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({ matchups });
  } catch (err) {
    console.error("leaderboard error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
