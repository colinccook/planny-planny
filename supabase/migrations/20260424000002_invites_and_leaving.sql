-- ============================================================
-- Per-email invites + leaving households
--
-- Two product changes:
--
-- 1. Invite links are now per-email. The owner enters the
--    recipient's email when generating an invite. The link only
--    works for someone signing in with that email, and is
--    deleted automatically the moment the matching account
--    accepts it (single-use).
--
-- 2. Members can leave a household — but if they're the *only*
--    owner, they must promote someone else first. Enforced via
--    a trigger so the rule applies even to direct DB writes.
-- ============================================================

-- ── Per-email invites ──────────────────────────────────────
alter table public.household_invites
  add column if not exists email text;

create index if not exists household_invites_email_idx
  on public.household_invites (lower(email));

-- When a member is inserted whose user account uses an email
-- with a pending invite for this household, drop the invite.
-- Keeps invite links one-shot and stops them lingering.
create or replace function public.consume_matching_invite()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  member_email text;
begin
  select email into member_email
  from auth.users
  where id = new.user_id;

  if member_email is null then
    return new;
  end if;

  delete from public.household_invites
  where household_id = new.household_id
    and email is not null
    and lower(email) = lower(member_email);

  return new;
end;
$$;

drop trigger if exists consume_invite_on_join on public.household_members;

create trigger consume_invite_on_join
  after insert on public.household_members
  for each row
  execute function public.consume_matching_invite();

-- ── Last-owner safeguard ───────────────────────────────────
-- Block deletion of a household_members row when it would
-- leave a household with no owners.
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
as $$
declare
  remaining_owners integer;
begin
  if old.role <> 'owner' then
    return old;
  end if;

  select count(*) into remaining_owners
  from public.household_members
  where household_id = old.household_id
    and role = 'owner'
    and user_id <> old.user_id;

  if remaining_owners = 0 then
    raise exception 'Cannot remove the last owner of a household'
      using errcode = 'P0001';
  end if;

  return old;
end;
$$;

drop trigger if exists protect_last_owner on public.household_members;

create trigger protect_last_owner
  before delete on public.household_members
  for each row
  execute function public.prevent_last_owner_removal();

-- Same guard for role changes (owner → something else).
create or replace function public.prevent_last_owner_demotion()
returns trigger
language plpgsql
as $$
declare
  remaining_owners integer;
begin
  if old.role <> 'owner' or new.role = 'owner' then
    return new;
  end if;

  select count(*) into remaining_owners
  from public.household_members
  where household_id = old.household_id
    and role = 'owner'
    and user_id <> old.user_id;

  if remaining_owners = 0 then
    raise exception 'Cannot demote the last owner of a household'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_last_owner_on_update on public.household_members;

create trigger protect_last_owner_on_update
  before update on public.household_members
  for each row
  execute function public.prevent_last_owner_demotion();

-- ── RLS: allow owners to update other members' roles ───────
create policy "Owner can update members"
  on public.household_members for update
  using (
    exists (
      select 1 from public.household_members as my_membership
      where my_membership.household_id = household_members.household_id
        and my_membership.user_id = auth.uid()
        and my_membership.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.household_members as my_membership
      where my_membership.household_id = household_members.household_id
        and my_membership.user_id = auth.uid()
        and my_membership.role = 'owner'
    )
  );
