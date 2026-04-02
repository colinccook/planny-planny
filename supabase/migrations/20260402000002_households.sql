-- Households
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alias text,
  default_adults integer not null default 2,
  default_children integer not null default 0,
  public_share_token uuid unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;

-- Household members (junction)
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member', 'guest')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.household_members enable row level security;

-- Household invites
create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token uuid unique not null default gen_random_uuid(),
  role text not null default 'member' check (role in ('member', 'guest')),
  created_by uuid references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.household_invites enable row level security;

-- Trigger to auto-create personal household when profile is created
create or replace function public.handle_new_profile()
returns trigger as $$
declare
  household_id uuid;
begin
  insert into public.households (name, default_adults, default_children, created_by)
  values (new.display_name || '''s Household', 1, 0, new.id)
  returning id into household_id;

  insert into public.household_members (household_id, user_id, role)
  values (household_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();
