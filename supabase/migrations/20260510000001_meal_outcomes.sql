-- ============================================================
-- Meal Outcomes — the headline metric of the whole app.
--
-- "Did the meal we planned actually get cooked and eaten?"
--
-- This is the single question Planny Planny exists to answer.
-- Every other feature (planning, ideas, todos, reactions) is in
-- service of producing meals that *actually happen*. The
-- meal_outcomes table is how we know whether we're succeeding,
-- both per-household and globally.
--
-- Shape:
--   • One outcome per meal_plan (UNIQUE on meal_plan_id).
--   • status = 'as_planned'     → the meal happened. Reason
--                                 must be NULL (no need to
--                                 explain a success).
--   • status = 'did_not_happen' → it didn't. Reason is required
--                                 so we can learn *why*. The
--                                 reason 'other' additionally
--                                 requires a free-text note.
--
--   household_id is denormalised onto the row so RLS policies
--   can use the existing user_household_role() helper directly,
--   matching the pattern used by every other household-scoped
--   table (see meal_plans, day_contexts, ingredients).
-- ============================================================

create table public.meal_outcomes (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null unique
    references public.meal_plans(id) on delete cascade,
  household_id uuid not null
    references public.households(id) on delete cascade,
  status text not null check (status in ('as_planned', 'did_not_happen')),
  reason text check (
    reason in ('no_shopping', 'ate_out', 'unexpected_event', 'didnt_fancy_it', 'other')
  ),
  note text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cross-field invariants:
  --   as_planned     ⇒ no reason / no note (a success speaks for itself).
  --   did_not_happen ⇒ a reason is mandatory.
  --   reason='other' ⇒ a non-empty note is mandatory (so "other" is meaningful).
  constraint meal_outcomes_reason_consistent check (
    (status = 'as_planned' and reason is null and note is null)
    or (status = 'did_not_happen' and reason is not null)
  ),
  constraint meal_outcomes_other_requires_note check (
    reason is distinct from 'other'
    or (note is not null and length(trim(note)) > 0)
  )
);

-- Quick lookup of "all outcomes for these meal_plan ids" — the
-- pattern the React hook uses for the calendar window.
create index meal_outcomes_meal_plan_id_idx
  on public.meal_outcomes (meal_plan_id);

-- Used by the public_stats refresh aggregate (count of as_planned).
create index meal_outcomes_status_idx
  on public.meal_outcomes (status);

alter table public.meal_outcomes enable row level security;

-- ── RLS ─────────────────────────────────────────────────────
-- Read: any signed-in member of the household, OR an anonymous
--       viewer of a household that has a public share token.
-- Write: anyone who can_edit_meals (owner / member / honoured_guest).
--        Voting guests and public viewers cannot record outcomes.
create policy "Members can view meal outcomes"
  on public.meal_outcomes for select
  using (public.user_household_role(household_id) is not null);

create policy "Public can view shared meal outcomes"
  on public.meal_outcomes for select
  using (
    exists (
      select 1 from public.households
      where households.id = meal_outcomes.household_id
      and households.public_share_token is not null
    )
  );

create policy "Editors can manage meal outcomes"
  on public.meal_outcomes for all
  using (public.can_edit_meals(household_id))
  with check (public.can_edit_meals(household_id));

-- ── Realtime ────────────────────────────────────────────────
-- Mirror the meal_plans publication so optimistic updates from
-- one device appear instantly on every other device viewing the
-- same household.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meal_outcomes'
  ) then
    alter publication supabase_realtime add table public.meal_outcomes;
  end if;
end;
$$;

-- ── updated_at trigger ──────────────────────────────────────
create or replace function public.touch_meal_outcomes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger meal_outcomes_set_updated_at
  before update on public.meal_outcomes
  for each row
  execute function public.touch_meal_outcomes_updated_at();
