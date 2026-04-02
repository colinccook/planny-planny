-- ============================================================
-- PROFILES
-- ============================================================
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- HOUSEHOLDS
-- ============================================================
-- Members can view households they belong to
create policy "Members can view their households"
  on public.households for select
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = households.id
      and household_members.user_id = auth.uid()
    )
  );

-- Public share: anyone can view if public_share_token is set (checked via RPC or anon access)
create policy "Public can view shared households"
  on public.households for select
  using (public_share_token is not null);

-- Owner/member can update household
create policy "Owner or member can update household"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = households.id
      and household_members.user_id = auth.uid()
      and household_members.role in ('owner', 'member')
    )
  );

-- Authenticated users can create households
create policy "Authenticated users can create households"
  on public.households for insert
  with check (auth.uid() is not null);

-- ============================================================
-- HOUSEHOLD MEMBERS
-- ============================================================
-- Users can see memberships for any household they belong to.
-- Using a security definer function to avoid infinite recursion.
create or replace function public.is_household_member(p_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id
    and user_id = auth.uid()
  )
$$ language sql security definer stable;

create policy "Members can view co-members"
  on public.household_members for select
  using (public.is_household_member(household_id));

create policy "Owner can manage members"
  on public.household_members for insert
  with check (
    exists (
      select 1 from public.household_members as my_membership
      where my_membership.household_id = household_members.household_id
      and my_membership.user_id = auth.uid()
      and my_membership.role = 'owner'
    )
    or user_id = auth.uid() -- Allow users to add themselves (for invite joins)
  );

create policy "Owner can remove members"
  on public.household_members for delete
  using (
    exists (
      select 1 from public.household_members as my_membership
      where my_membership.household_id = household_members.household_id
      and my_membership.user_id = auth.uid()
      and my_membership.role = 'owner'
    )
    or user_id = auth.uid() -- Users can remove themselves
  );

-- ============================================================
-- HOUSEHOLD INVITES
-- ============================================================
create policy "Members can view invites for their households"
  on public.household_invites for select
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = household_invites.household_id
      and household_members.user_id = auth.uid()
    )
  );

-- Anyone can view an invite by token (for joining)
create policy "Anyone can view invite by token"
  on public.household_invites for select
  using (true);

create policy "Owner or member can create invites"
  on public.household_invites for insert
  with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = household_invites.household_id
      and household_members.user_id = auth.uid()
      and household_members.role in ('owner', 'member')
    )
  );

create policy "Owner or member can delete invites"
  on public.household_invites for delete
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = household_invites.household_id
      and household_members.user_id = auth.uid()
      and household_members.role in ('owner', 'member')
    )
  );

-- ============================================================
-- Helper function: check household membership role
-- ============================================================
create or replace function public.user_household_role(p_household_id uuid)
returns text as $$
  select role from public.household_members
  where household_id = p_household_id
  and user_id = auth.uid()
$$ language sql security definer stable;

-- ============================================================
-- DAY PLACEHOLDERS
-- ============================================================
create policy "Members can view day placeholders"
  on public.day_placeholders for select
  using (public.user_household_role(household_id) is not null);

create policy "Owner or member can manage day placeholders"
  on public.day_placeholders for all
  using (public.user_household_role(household_id) in ('owner', 'member'));

-- ============================================================
-- DAY CONTEXTS
-- ============================================================
create policy "Members can view day contexts"
  on public.day_contexts for select
  using (public.user_household_role(household_id) is not null);

create policy "Owner or member can manage day contexts"
  on public.day_contexts for all
  using (public.user_household_role(household_id) in ('owner', 'member'));

-- ============================================================
-- MEAL PLANS
-- ============================================================
create policy "Members can view meal plans"
  on public.meal_plans for select
  using (public.user_household_role(household_id) is not null);

create policy "Public can view shared meal plans"
  on public.meal_plans for select
  using (
    exists (
      select 1 from public.households
      where households.id = meal_plans.household_id
      and households.public_share_token is not null
    )
  );

create policy "Owner or member can manage meal plans"
  on public.meal_plans for all
  using (public.user_household_role(household_id) in ('owner', 'member'));

-- ============================================================
-- INGREDIENTS
-- ============================================================
create policy "Members can view ingredients"
  on public.ingredients for select
  using (public.user_household_role(household_id) is not null);

create policy "Owner or member can manage ingredients"
  on public.ingredients for all
  using (public.user_household_role(household_id) in ('owner', 'member'));

-- ============================================================
-- MEAL PLAN INGREDIENTS
-- ============================================================
create policy "Members can view meal plan ingredients"
  on public.meal_plan_ingredients for select
  using (
    exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_ingredients.meal_plan_id
      and public.user_household_role(meal_plans.household_id) is not null
    )
  );

create policy "Owner or member can manage meal plan ingredients"
  on public.meal_plan_ingredients for all
  using (
    exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_ingredients.meal_plan_id
      and public.user_household_role(meal_plans.household_id) in ('owner', 'member')
    )
  );
