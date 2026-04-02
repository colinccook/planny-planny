-- Day-of-week placeholders (e.g., "Oily fish Monday")
create table public.day_placeholders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  label text not null,
  unique (household_id, day_of_week)
);

alter table public.day_placeholders enable row level security;

-- Day contexts (custom events, visitor overrides)
create table public.day_contexts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  date date not null,
  event_name text,
  extra_adults integer not null default 0,
  extra_children integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.day_contexts enable row level security;

-- Meal plans
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  date date not null,
  title text not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;
