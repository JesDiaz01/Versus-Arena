-- sql/delete-battle.sql
-- Transactional erase for a single battle, used by api/delete-battle.js.
--
-- Run this once in the Supabase SQL editor. It is idempotent (create or replace), so
-- re-running it is safe.
--
-- WHY A FUNCTION INSTEAD OF THREE DELETES:
-- The API previously deleted the saved_battles links and then the battles row as two
-- separate calls. That is not atomic -- if the battle delete failed (for example because
-- another table still referenced it), the links were already gone, so the user lost their
-- history entry while the battle and its public share link survived. A plpgsql function
-- body runs inside a single transaction, so this either fully succeeds or fully rolls
-- back, and a half-erased state becomes impossible.
--
-- ORDER MATTERS, even inside a transaction: foreign keys are checked per statement by
-- default, so everything referencing the battle has to be cleared before the battle row
-- itself is removed.
--
-- DISAGREEMENTS ARE PRESERVED, NOT DELETED: feedback rows point at a battle via
-- battle_id, which already accepts null (a verdict that failed to save has no share id).
-- Nulling the reference releases the foreign key while keeping the feedback itself for
-- analysis, rather than throwing away user-submitted data along with the battle.

create or replace function public.delete_battle_cascade(p_battle_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Release any feedback referencing this battle, keeping the feedback itself.
  update public.disagreements
     set battle_id = null
   where battle_id = p_battle_id;

  -- Remove every user's history link to this battle (the content is going away, so a
  -- link would dangle otherwise).
  delete from public.saved_battles
   where battle_id = p_battle_id;

  -- Finally the battle itself: the stored inputs, the verdict, the share link target,
  -- and the read-through cache entry all disappear with this row. A missing row is a
  -- harmless no-op, so a repeated request stays safe.
  delete from public.battles
   where id = p_battle_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- LOCK THE FUNCTION DOWN. This is not optional.
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and Supabase
-- exposes public-schema functions over PostgREST at /rest/v1/rpc/<name> to the `anon`
-- role. The anon key ships in the browser bundle by design. Combined with SECURITY
-- DEFINER (which bypasses RLS), the default grant means ANYONE who reads the anon key
-- out of the JS could call:
--
--   POST /rest/v1/rpc/delete_battle_cascade  {"p_battle_id": "<any id>"}
--
-- and permanently erase any battle on the site -- no token, no account, no ownership.
-- Battle ids are not secret; every public share link contains one. That completely
-- bypasses the ownership gate and the authored-verdict guard in api/delete-battle.js,
-- which are the only things that were ever enforcing this.
--
-- RLS on the tables does NOT save you here: SECURITY DEFINER runs as the definer and
-- bypasses it. The grant is the control.
--
-- Only the service role (used exclusively by the /api functions, never in the browser)
-- has any business calling this. The explicit re-grant matters: revoking from PUBLIC
-- can also strip service_role, which would break the API.
revoke all on function public.delete_battle_cascade(text) from public, anon, authenticated;
grant execute on function public.delete_battle_cascade(text) to service_role;
