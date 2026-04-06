-- Add babies support to households and day_contexts

-- Household default babies count
alter table public.households
  add column default_babies integer not null default 0;

-- Day context extra babies count
alter table public.day_contexts
  add column extra_babies integer not null default 0;

-- Update the auto-create trigger to include default_babies
create or replace function public.handle_new_profile()
returns trigger as $$
declare
  household_id uuid;
begin
  insert into public.households (name, default_adults, default_children, default_babies, created_by)
  values (new.display_name || '''s Household', 1, 0, 0, new.id)
  returning id into household_id;

  insert into public.household_members (household_id, user_id, role)
  values (household_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;
