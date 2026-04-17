-- Cleanup polymorphic reactions when meal plans are deleted
create or replace function public.delete_meal_plan_reactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.reactions
  where target_type = 'meal_plan'
    and target_id = old.id;
  return old;
end;
$$;

create trigger cleanup_meal_plan_reactions
  after delete on public.meal_plans
  for each row
  execute function public.delete_meal_plan_reactions();
