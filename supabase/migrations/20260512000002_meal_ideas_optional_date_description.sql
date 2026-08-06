-- ============================================================
-- ChatGPT plugin ideas: nullable date + description column
--
-- The chatgpt-plugin Edge Function (and its documented OpenAPI
-- contract in public/openapi.json) treats a meal idea as something
-- that can be proposed before it's tied to a specific day, and lets
-- the caller attach free-form notes via `description`. Neither was
-- ever added to the schema:
--
--   - `date` was `not null`, so proposing an idea without a date
--     (the plugin's own documented/tested flow) violated the
--     column constraint.
--   - `description` didn't exist at all, so selecting/inserting it
--     failed with "column does not exist".
--
-- Existing day-scheduled ideas (used by the calendar UI's
-- `useMealIdeas` date-range query) are unaffected: `date` stays the
-- same for rows that already set it, and a NULL date simply means
-- the idea hasn't been scheduled to a day yet.
-- ============================================================

alter table public.meal_ideas
  add column if not exists description text;

alter table public.meal_ideas
  alter column date drop not null;
