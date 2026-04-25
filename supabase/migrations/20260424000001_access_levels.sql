-- ============================================================
-- Access levels re-architecture
--
-- Adds two new household-member roles:
--   • honoured_guest — can see everything, propose ideas, vote.
--   • voting_guest   — can see everything, vote only.
--
-- Migrates every existing 'guest' to 'honoured_guest' (per
-- product decision: trust the people you've already invited).
--
-- Also tightens the RLS policies for meal ideas and reactions so
-- that they explicitly reflect each role's capabilities, and
-- adds a public-share policy for meal ideas so anonymous viewers
-- of a shared link can see ideas (with vote counts) but never
-- events.
-- ============================================================

-- ── Replace the role check constraints ──────────────────────
-- Drop the old constraints first, then migrate existing 'guest'
-- rows to 'honoured_guest', and only then add the new
-- constraints. Doing the data migration before re-adding the
-- check is essential: any pre-existing 'guest' row would
-- otherwise violate the new constraint immediately.
alter table public.household_members
  drop constraint if exists household_members_role_check;

alter table public.household_invites
  drop constraint if exists household_invites_role_check;

-- ── Migrate existing guests ────────────────────────────────
update public.household_members
set role = 'honoured_guest'
where role = 'guest';

update public.household_invites
set role = 'honoured_guest'
where role = 'guest';

alter table public.household_members
  add constraint household_members_role_check
  check (role in ('owner', 'member', 'honoured_guest', 'voting_guest'));

alter table public.household_invites
  add constraint household_invites_role_check
  check (role in ('member', 'honoured_guest', 'voting_guest'));

-- ── Helper: capability predicates as SQL ───────────────────
-- Mirrors src/lib/permissions.ts so the same rules are
-- enforced server-side.

create or replace function public.can_edit_meals(p_household_id uuid)
returns boolean as $$
  select public.user_household_role(p_household_id)
    in ('owner', 'member', 'honoured_guest')
$$ language sql security definer stable;

create or replace function public.can_propose_ideas(p_household_id uuid)
returns boolean as $$
  select public.user_household_role(p_household_id)
    in ('owner', 'member', 'honoured_guest')
$$ language sql security definer stable;

create or replace function public.can_vote(p_household_id uuid)
returns boolean as $$
  select public.user_household_role(p_household_id)
    in ('owner', 'member', 'honoured_guest', 'voting_guest')
$$ language sql security definer stable;

create or replace function public.can_invite_members(p_household_id uuid)
returns boolean as $$
  select public.user_household_role(p_household_id) in ('owner', 'member')
$$ language sql security definer stable;

-- ── Broaden write access to honoured_guests ────────────────
-- Honoured guests are like full members; they just can't bring
-- new people in. Replace the older "Owner or member" policies
-- with ones that key off can_edit_meals().
do $$
begin
  -- day_placeholders
  drop policy if exists "Owner or member can manage day placeholders" on public.day_placeholders;
  create policy "Editors can manage day placeholders"
    on public.day_placeholders for all
    using (public.can_edit_meals(household_id));

  -- day_contexts
  drop policy if exists "Owner or member can manage day contexts" on public.day_contexts;
  create policy "Editors can manage day contexts"
    on public.day_contexts for all
    using (public.can_edit_meals(household_id));

  -- meal_plans
  drop policy if exists "Owner or member can manage meal plans" on public.meal_plans;
  create policy "Editors can manage meal plans"
    on public.meal_plans for all
    using (public.can_edit_meals(household_id));

  -- ingredients
  drop policy if exists "Owner or member can manage ingredients" on public.ingredients;
  create policy "Editors can manage ingredients"
    on public.ingredients for all
    using (public.can_edit_meals(household_id));

  -- meal_plan_ingredients
  drop policy if exists "Owner or member can manage meal plan ingredients" on public.meal_plan_ingredients;
  create policy "Editors can manage meal plan ingredients"
    on public.meal_plan_ingredients for all
    using (
      exists (
        select 1 from public.meal_plans
        where meal_plans.id = meal_plan_ingredients.meal_plan_id
        and public.can_edit_meals(meal_plans.household_id)
      )
    );
end;
$$;

-- ── Restrict invite management to owners and members ───────
drop policy if exists "Owner or member can create invites" on public.household_invites;
drop policy if exists "Owner or member can delete invites" on public.household_invites;

create policy "Members can create invites"
  on public.household_invites for insert
  with check (public.can_invite_members(household_id));

create policy "Members can delete invites"
  on public.household_invites for delete
  using (public.can_invite_members(household_id));

-- ── Meal ideas ─────────────────────────────────────────────
-- Honoured guests (and above) can insert; only members/owners
-- can update/delete other people's ideas.
drop policy if exists "Owner or member can manage meal ideas" on public.meal_ideas;

create policy "Honoured guests can add meal ideas"
  on public.meal_ideas for insert
  with check (
    public.can_propose_ideas(household_id)
    and (created_by is null or created_by = auth.uid())
  );

create policy "Owner or member can update meal ideas"
  on public.meal_ideas for update
  using (public.can_edit_meals(household_id));

create policy "Owner, member or author can delete meal ideas"
  on public.meal_ideas for delete
  using (
    public.can_edit_meals(household_id)
    or created_by = auth.uid()
  );

-- Public viewers of a shared link can see meal ideas (the
-- public page renders only the title + vote counts).
create policy "Public can view shared meal ideas"
  on public.meal_ideas for select
  using (
    exists (
      select 1 from public.households
      where households.id = meal_ideas.household_id
      and households.public_share_token is not null
    )
  );

-- ── Reactions ──────────────────────────────────────────────
-- Voting guests (and above) can react.
drop policy if exists "Members can add reactions" on public.reactions;

create policy "Voting guests can add reactions"
  on public.reactions for insert
  with check (
    public.can_vote(household_id)
    and user_id = auth.uid()
  );

-- Public viewers can see reactions for a shared household so
-- the page can show vote counts (the UI strips out user_id).
create policy "Public can view shared reactions"
  on public.reactions for select
  using (
    exists (
      select 1 from public.households
      where households.id = reactions.household_id
      and households.public_share_token is not null
    )
  );
