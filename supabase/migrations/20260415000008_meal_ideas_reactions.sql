-- Meal ideas for specific days
create table public.meal_ideas (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  date date not null,
  title text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index meal_ideas_household_date_idx
  on public.meal_ideas (household_id, date, created_at);

alter table public.meal_ideas enable row level security;

-- Flexible reaction model for ideas now, reusable for other entities later
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  emoji text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint reactions_emoji_not_blank check (length(trim(emoji)) > 0),
  constraint reactions_target_type_not_blank check (length(trim(target_type)) > 0),
  unique (household_id, target_type, target_id, emoji, user_id)
);

create index reactions_household_target_idx
  on public.reactions (household_id, target_type, target_id, created_at);

alter table public.reactions enable row level security;

-- Allow viewing co-member profiles (needed for reaction member lists)
drop policy if exists "Members can view co-member profiles" on public.profiles;

create policy "Members can view co-member profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.household_members as mine
      join public.household_members as theirs
        on theirs.household_id = mine.household_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

-- Meal ideas policies
create policy "Members can view meal ideas"
  on public.meal_ideas for select
  using (public.user_household_role(household_id) is not null);

create policy "Owner or member can manage meal ideas"
  on public.meal_ideas for all
  using (public.user_household_role(household_id) in ('owner', 'member'));

-- Reactions policies
create policy "Members can view reactions"
  on public.reactions for select
  using (public.user_household_role(household_id) is not null);

create policy "Members can add reactions"
  on public.reactions for insert
  with check (
    public.user_household_role(household_id) is not null
    and user_id = auth.uid()
  );

create policy "Users can remove their own reactions"
  on public.reactions for delete
  using (
    public.user_household_role(household_id) is not null
    and user_id = auth.uid()
  );

-- Cleanup polymorphic reactions when meal ideas are deleted
create or replace function public.delete_meal_idea_reactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.reactions
  using deleted_meal_ideas
  where reactions.target_type = 'meal_idea'
    and reactions.target_id = deleted_meal_ideas.id;
  return null;
end;
$$;

create trigger cleanup_meal_idea_reactions
  after delete on public.meal_ideas
  referencing old table as deleted_meal_ideas
  for each statement
  execute function public.delete_meal_idea_reactions();

-- Realtime
alter publication supabase_realtime add table public.meal_ideas;
alter publication supabase_realtime add table public.reactions;
