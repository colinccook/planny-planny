-- ============================================================
-- Todo items
--
-- Lightweight to-do entries pinned to a day. Two flavours:
--   • household-level (user_id IS NULL) — visible to every
--     member of the household.
--   • private (user_id = auth.uid())     — only visible to the
--     user who owns the reminder.
--
-- Behaviour:
--   • An incomplete todo "rolls forward" — the UI treats it as
--     belonging to *today* until completed (no DB rewrite).
--   • Once completed, completed_on is set to the day it was
--     ticked off and the row stays pinned to that day, crossed
--     out.
--   • Tapping a todo can delete it permanently.
--
-- Editor access (owner / member / honoured_guest) gates
-- household-level todos. Anyone signed in can create their own
-- private reminder, but the simpler editor rule keeps things in
-- step with `canManageTodos` in src/lib/permissions.ts and the
-- product decision in the issue.
-- ============================================================

create table public.todo_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  title text not null,
  completed_on date,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint todo_items_title_not_blank check (length(trim(title)) > 0),
  constraint todo_items_completed_pair check (
    (completed_on is null and completed_at is null)
    or (completed_on is not null and completed_at is not null)
  )
);

create index todo_items_household_date_idx
  on public.todo_items (household_id, date);

create index todo_items_household_completed_on_idx
  on public.todo_items (household_id, completed_on);

create index todo_items_household_user_idx
  on public.todo_items (household_id, user_id);

alter table public.todo_items enable row level security;

-- Members see household todos and their own private reminders.
create policy "Members can view todo items"
  on public.todo_items for select
  using (
    public.user_household_role(household_id) is not null
    and (user_id is null or user_id = auth.uid())
  );

-- Editors (owner / member / honoured guest) can add todos for
-- the household, or private todos for themselves. Voting guests
-- and public viewers cannot create reminders.
create policy "Editors can add todo items"
  on public.todo_items for insert
  with check (
    public.can_edit_meals(household_id)
    and (user_id is null or user_id = auth.uid())
    and (created_by is null or created_by = auth.uid())
  );

-- Editors can update household-level todos (e.g. tick them
-- off). Private todos can only be updated by their owner.
create policy "Editors can update todo items"
  on public.todo_items for update
  using (
    public.can_edit_meals(household_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy "Editors can delete todo items"
  on public.todo_items for delete
  using (
    public.can_edit_meals(household_id)
    and (user_id is null or user_id = auth.uid())
  );

-- Realtime so other connected clients see todos appear, get
-- crossed off, or get deleted in real time.
alter publication supabase_realtime add table public.todo_items;
