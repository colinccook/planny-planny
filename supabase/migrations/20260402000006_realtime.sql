-- Enable Realtime on all data tables for WebSocket subscriptions
alter publication supabase_realtime add table public.meal_plans;
alter publication supabase_realtime add table public.meal_plan_ingredients;
alter publication supabase_realtime add table public.day_contexts;
alter publication supabase_realtime add table public.ingredients;
alter publication supabase_realtime add table public.day_placeholders;
alter publication supabase_realtime add table public.households;
alter publication supabase_realtime add table public.household_members;
