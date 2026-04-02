-- Ingredients (household-specific)
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  starred boolean not null default false,
  warning boolean not null default false,
  created_at timestamptz not null default now(),
  unique (household_id, lower(name))
);

alter table public.ingredients enable row level security;

-- Meal plan ingredients (junction)
create table public.meal_plan_ingredients (
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  primary key (meal_plan_id, ingredient_id)
);

alter table public.meal_plan_ingredients enable row level security;
