-- ============================================================
-- User-level preferences on profiles
--
-- Two new columns:
--
--   • last_household_id      — the household the user was in
--                              when they last used the app. Read on
--                              login so the experience picks up where
--                              they left off, even on a brand-new
--                              device. NULL means "no preference yet,
--                              fall back to the first membership".
--                              ON DELETE SET NULL keeps the user's row
--                              valid if the household goes away.
--
--   • sound_effects_enabled  — opt-out flag for the subtle UI sound
--                              effects. Default TRUE so new accounts
--                              get them; users who find them annoying
--                              can switch them off in Settings.
--
-- The existing self-update RLS policy on profiles already permits the
-- owning user to write to their own row, so no new policy is required
-- for these columns.
-- ============================================================

alter table public.profiles
  add column if not exists last_household_id uuid
    references public.households(id) on delete set null;

alter table public.profiles
  add column if not exists sound_effects_enabled boolean
    not null default true;

-- Make sure realtime publishes profile updates so the active tab can
-- mirror preference changes made from another device. Idempotent: if
-- the table is already in the publication this is a no-op.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
