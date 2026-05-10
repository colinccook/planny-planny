-- ============================================================
-- Public stats — the cached "Successfully helped families plan
-- X meals" counter shown on the unauthenticated welcome screen.
--
-- Why a cached row instead of a live count?
--   The login page is the first thing every visitor sees, and
--   we want the headline number visible *before* the user even
--   has a session. Running `count(*)` on meal_outcomes for every
--   visitor would (a) require granting anon SELECT on the whole
--   table and (b) hammer the database. Caching a single integer
--   refreshed once per day is plenty fresh for a "we have helped
--   X families" headline and costs essentially nothing to read.
--
-- Read path: get_public_stat(key) — SECURITY DEFINER so the anon
--   role can call it without needing direct table access. The
--   function lazily refreshes any stat older than 24h, so:
--     - the very first visitor of the day triggers a refresh,
--     - all subsequent visitors get the cached value cheaply,
--     - the optional pg_cron job below keeps it fresh even
--       during long quiet periods (and on local dev where
--       there's no cron at all the lazy path still works).
-- ============================================================

create table public.public_stats (
  key text primary key,
  value bigint not null default 0,
  refreshed_at timestamptz not null default now()
);

alter table public.public_stats enable row level security;

-- Anon read access. This is the *only* table in the schema where
-- the anonymous role gets a SELECT policy — we go through the
-- get_public_stat() RPC for ergonomics and forward-compat (so we
-- can add per-stat gating later without re-issuing grants).
grant select on public.public_stats to anon;
grant select on public.public_stats to authenticated;

create policy "Anyone can read public stats"
  on public.public_stats for select
  to anon, authenticated
  using (true);

-- No write policies — only the SECURITY DEFINER refresh function
-- mutates this table.

-- Seed the one row we currently care about so the lazy read path
-- always finds a key to update.
insert into public.public_stats (key, value, refreshed_at)
values ('successful_meals_total', 0, now() - interval '2 days')
on conflict (key) do nothing;

-- ── Refresh function ────────────────────────────────────────
-- Recomputes one stat from source-of-truth tables and stores it.
-- Runs as SECURITY DEFINER so it can read meal_outcomes
-- regardless of who triggered it (including anon).
create or replace function public.refresh_public_stat(p_key text)
returns bigint as $$
declare
  v_count bigint;
begin
  if p_key = 'successful_meals_total' then
    select count(*)::bigint into v_count
    from public.meal_outcomes
    where status = 'as_planned';
  else
    raise exception 'Unknown public stat key: %', p_key;
  end if;

  insert into public.public_stats (key, value, refreshed_at)
  values (p_key, v_count, now())
  on conflict (key) do update
    set value = excluded.value,
        refreshed_at = excluded.refreshed_at;

  return v_count;
end;
$$ language plpgsql security definer;

revoke all on function public.refresh_public_stat(text) from public;
grant execute on function public.refresh_public_stat(text) to anon, authenticated;

-- ── Public read RPC ─────────────────────────────────────────
-- Returns the cached value, lazily refreshing it if older than
-- one day. Safe to call from anon — never reveals individual
-- household data, only the global aggregate.
create or replace function public.get_public_stat(p_key text)
returns bigint as $$
declare
  v_row public.public_stats%rowtype;
begin
  select * into v_row
  from public.public_stats
  where key = p_key;

  if not found then
    -- Lazy seed if the row doesn't exist yet.
    return public.refresh_public_stat(p_key);
  end if;

  if v_row.refreshed_at < now() - interval '1 day' then
    return public.refresh_public_stat(p_key);
  end if;

  return v_row.value;
end;
$$ language plpgsql security definer stable;

revoke all on function public.get_public_stat(text) from public;
grant execute on function public.get_public_stat(text) to anon, authenticated;

-- ── Daily cron refresh (best-effort) ────────────────────────
-- pg_cron is enabled on hosted Supabase by default. On local
-- dev / CI the extension may not be available; we wrap the
-- scheduling in a DO block so the migration still applies in
-- environments that lack it. The lazy refresh in
-- get_public_stat() keeps the value fresh either way.
do $$
begin
  if exists (
    select 1 from pg_available_extensions where name = 'pg_cron'
  ) then
    create extension if not exists pg_cron;

    -- Schedule (or re-schedule) the daily refresh at 03:17 UTC,
    -- a quiet hour with no overlap with our other scheduled jobs.
    perform cron.unschedule('refresh-public-stats')
      where exists (
        select 1 from cron.job where jobname = 'refresh-public-stats'
      );
    perform cron.schedule(
      'refresh-public-stats',
      '17 3 * * *',
      $cron$ select public.refresh_public_stat('successful_meals_total'); $cron$
    );
  end if;
exception
  when others then
    -- pg_cron extension exists but we lack permission to schedule
    -- (common on shared local dev instances). The lazy path in
    -- get_public_stat() still keeps the value fresh; swallow.
    raise notice 'Skipping pg_cron schedule for refresh-public-stats: %', sqlerrm;
end;
$$;
