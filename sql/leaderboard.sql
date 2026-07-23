-- sql/leaderboard.sql
-- Leaderboard schema for Versus Arena's weekly "Top Matchups" board.
--
-- Run this once in the Supabase SQL editor (or via the CLI). It is idempotent: every
-- statement uses IF NOT EXISTS / CREATE OR REPLACE, so re-running it is safe.
--
-- Data model: matchup identity is the order-independent canonical fighter-NAME pair
-- (see api/_matchup.js). Universe, battle settings, and custom feats do NOT affect
-- identity, so every way a given pair is fought rolls up into one matchup. Counts are
-- bucketed by UTC day so the app can show a rolling 7-day window; display names and a
-- representative universe per side are stored separately for portrait lookups.
--
-- Access: both tables are written and read ONLY by the service-role key from the API
-- functions (api/battle.js records; api/leaderboard.js reads). RLS is enabled with no
-- policies, which denies the anon/public key entirely; the service role bypasses RLS.

-- ---------------------------------------------------------------------------
-- Per-matchup, per-day hit counts. One row per (matchup, UTC day); incremented
-- on every battle served (fresh, cached, or authored).
-- ---------------------------------------------------------------------------
create table if not exists public.matchup_counts (
  matchup_key text    not null,
  day         date    not null,
  hits        integer not null default 0,
  primary key (matchup_key, day)
);

-- Index the day alone so the rolling-window scan (day >= today-6) is cheap.
create index if not exists matchup_counts_day_idx on public.matchup_counts (day);

alter table public.matchup_counts enable row level security;

-- ---------------------------------------------------------------------------
-- Display metadata: the latest-seen display name + universe for each side of a
-- matchup, used to render the row and resolve portraits. a_* is the side whose
-- canonical name sorts first (matches how api/_matchup.js orders a/b).
-- ---------------------------------------------------------------------------
create table if not exists public.matchup_meta (
  matchup_key text        primary key,
  a_name      text        not null,
  a_universe  text,
  b_name      text        not null,
  b_universe  text,
  updated_at  timestamptz not null default now()
);

alter table public.matchup_meta enable row level security;

-- ---------------------------------------------------------------------------
-- Atomic recorder: bump today's count and refresh the display metadata in one
-- round trip. The caller (api/battle.js) MUST pass a_*/b_* already ordered to
-- match matchup_key -- i.e. a = the alphabetically-first canonical name's side.
-- ---------------------------------------------------------------------------
create or replace function public.record_matchup(
  p_key        text,
  p_a_name     text,
  p_a_universe text,
  p_b_name     text,
  p_b_universe text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.matchup_counts (matchup_key, day, hits)
  values (p_key, (now() at time zone 'utc')::date, 1)
  on conflict (matchup_key, day)
  do update set hits = public.matchup_counts.hits + 1;

  insert into public.matchup_meta (matchup_key, a_name, a_universe, b_name, b_universe, updated_at)
  values (p_key, p_a_name, p_a_universe, p_b_name, p_b_universe, now())
  on conflict (matchup_key)
  do update set
    a_name     = excluded.a_name,
    a_universe = excluded.a_universe,
    b_name     = excluded.b_name,
    b_universe = excluded.b_universe,
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Rolling 7-day leaderboard: today plus the prior 6 UTC days, most-fought first.
-- Ties break toward the more recently active matchup. p_limit caps the rows.
-- ---------------------------------------------------------------------------
create or replace function public.leaderboard_weekly(p_limit integer default 10)
returns table (
  matchup_key text,
  hits        bigint,
  a_name      text,
  a_universe  text,
  b_name      text,
  b_universe  text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.matchup_key,
         sum(c.hits)::bigint as hits,
         m.a_name, m.a_universe, m.b_name, m.b_universe
  from public.matchup_counts c
  join public.matchup_meta   m on m.matchup_key = c.matchup_key
  where c.day >= ((now() at time zone 'utc')::date - 6)
  group by c.matchup_key, m.a_name, m.a_universe, m.b_name, m.b_universe, m.updated_at
  order by hits desc, m.updated_at desc
  limit greatest(p_limit, 0);
$$;
