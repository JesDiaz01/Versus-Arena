// api/my-battles.js
// Vercel Serverless Function - returns the signed-in user's saved battle history.
// Service-role, server-side only (same pattern as get-battle.js): the key never
// reaches the browser, and battles stays fully RLS-locked to the browser -- the
// verdict data is read here on the server and returned in one call.
//
// SECURITY: the user is identified ONLY by db.auth.getUser(token), which verifies
// the JWT signature against the project secret. The user_id filter is derived from
// that verified identity -- a user_id is NEVER accepted from the query or body, so
// one user can never request another user's history. The ?page= param below only
// moves a window WITHIN that user-scoped query; it cannot widen it.

import { createClient } from "@supabase/supabase-js";
import { getClientIp, checkReadLimit } from "./_rateLimit.js";

// One page of history. Smaller than the old flat 100-row pull: each row carries the
// battle's full battle_data + result JSON, so a big page was hundreds of KB for a list
// that only renders four fields. The client asks for a page via ?page=.
//
// Deliberately fixed server-side and NOT settable by the client: a ?pageSize= param
// would be a lever for asking the DB for 10000 rows in one request.
const PAGE_SIZE = 10;

// Bound how deep pagination can go, so a crafted page number can never ask the DB to
// skip an unbounded number of rows. 500 * 10 keeps the old 5000-row offset ceiling.
const MAX_PAGE = 500;

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

    // Page number from the query string. Anything non-numeric, zero, or negative reads
    // as page 1; anything past the ceiling is clamped rather than rejected, so a crafted
    // value degrades to an empty page instead of a huge DB skip.
    const parsedPage = parseInt(req.query.page, 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 1
      ? Math.min(parsedPage, MAX_PAGE)
      : 1;
    const offset = (page - 1) * PAGE_SIZE;

    // Pull ONE page of this user's saved links (newest first), joined to the battle
    // rows. The user_id filter comes from the verified identity above, not from the
    // request, and .range() is applied AFTER it -- so the window can only ever slide
    // within this user's own rows.
    //
    // count: "exact" returns the size of the full filtered set (this user's total saved
    // battles) in the same round trip, so the client can render page buttons without a
    // second query. The count reflects the .eq() filter but NOT the .range().
    //
    // battle_id is a secondary sort key: created_at alone is not unique, and offset
    // paging over a non-deterministic order can show the same row twice or skip one.
    const { data, error, count } = await db
      .from("saved_battles")
      .select("battle_id, created_at, battles ( id, battle_data, result )", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("battle_id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("my-battles query error:", error);
      return res.status(500).json({ error: "Could not load your battles. Try again in a moment." });
    }

    // A page past the end of the set is not an error: the DB returns no rows and the
    // real total still goes back, so the client can clamp itself to a valid page.
    const rows = data || [];

    // Return only what the list view needs to render + re-open each battle.
    const battles = rows
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

    // total counts saved_battles rows, so it can run one ahead of battles.length on the
    // rare page holding a link whose battle row was purged (filtered out above). The
    // client must not assume battles.length === pageSize.
    return res.status(200).json({
      battles,
      total: typeof count === "number" ? count : battles.length,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    console.error("my-battles error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again in a moment." });
  }
}
