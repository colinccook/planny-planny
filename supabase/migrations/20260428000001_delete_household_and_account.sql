-- ============================================================
-- Household deletion (owner only) + account self-deletion
--
-- Two product changes:
--
-- 1. Owners can permanently delete a household. The cascade
--    already propagates to every related table (members,
--    invites, meal plans, day placeholders, todo items, etc.).
--    This migration only adds the missing RLS delete policy.
--
-- 2. Any authenticated user can delete their own account via
--    the `delete_current_user()` function. Households where the
--    user is the sole owner are deleted first (cascade handles
--    all child rows). The user row in auth.users is then
--    deleted, which cascades to the profiles table and removes
--    any remaining household_members rows.
-- ============================================================

-- ── 1. RLS: owners may delete their household ──────────────
create policy "Owner can delete household"
  on public.households for delete
  using (
    exists (
      select 1 from public.household_members
      where household_id = households.id
        and user_id      = auth.uid()
        and role         = 'owner'
    )
  );

-- ── 2. Account self-deletion ───────────────────────────────
-- Delete the currently signed-in user. Households where this
-- user is the *sole* owner are deleted first so the
-- `prevent_last_owner_removal` trigger on household_members
-- does not block the cascade coming from auth.users deletion.
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Delete households where the calling user is the only owner.
  -- The ON DELETE CASCADE on all child tables (meal_plans,
  -- day_placeholders, household_members, household_invites, etc.)
  -- cleans up all related data automatically.
  delete from public.households
  where id in (
    select m.household_id
    from   public.household_members m
    where  m.user_id = auth.uid()
      and  m.role    = 'owner'
      and  (
        select count(*)
        from   public.household_members o
        where  o.household_id = m.household_id
          and  o.role         = 'owner'
      ) = 1
  );

  -- Remove the user from auth; cascades to profiles, then to
  -- any remaining household_members rows (households the user
  -- shared with other owners).
  delete from auth.users where id = auth.uid();
end;
$$;

-- Grant execute to signed-in users so the client can call it
-- via supabase.rpc('delete_current_user').
grant execute on function public.delete_current_user() to authenticated;
