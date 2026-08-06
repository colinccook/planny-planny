-- ============================================================
-- Restore base table grants for API roles
--
-- Supabase changed its default behaviour so that tables created by
-- the `postgres` role (as the CLI/migrations do) are no longer
-- automatically exposed to `anon`, `authenticated`, or `service_role`
-- via the default ACL — only DELETE/TRUNCATE/REFERENCES/TRIGGER were
-- inherited, not SELECT/INSERT/UPDATE. RLS policies never even get
-- evaluated without the underlying table-level grant, so every table
-- created before this change stopped being reachable via PostgREST
-- and the JS client (surfacing as "permission denied for table ...").
--
-- This migration re-grants the base privileges every existing table
-- relies on (RLS policies still gate individual rows/columns exactly
-- as before) and sets default privileges so tables created by further
-- `postgres`-run migrations keep working without needing this again.
-- ============================================================

grant select, insert, update, delete
  on public.day_placeholders,
     public.day_contexts,
     public.households,
     public.household_members,
     public.household_invites,
     public.meal_plans,
     public.ingredients,
     public.meal_plan_ingredients,
     public.meal_ideas,
     public.reactions,
     public.todo_items,
     public.meal_outcomes,
     public.profiles
  to authenticated, service_role;

-- `anon` only needs read access to the tables that back public share
-- links (and invite lookups, which run before the visitor signs in).
-- RLS still restricts these to rows where `public_share_token` is set
-- (or, for invites, the row matching the token).
grant select on public.households to anon;
grant select on public.meal_plans to anon;
grant select on public.meal_ideas to anon;
grant select on public.reactions to anon;
grant select on public.meal_outcomes to anon;
grant select on public.household_invites to anon;

-- Keep future `postgres`-owned tables working the same way without a
-- repeat of this migration.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
