-- Add optional end_date to day_contexts so events can span multiple days.
-- When end_date is null the event applies to the single date stored in `date`.
-- When end_date is set the event appears on every day from `date` to `end_date` inclusive.
alter table public.day_contexts
  add column end_date date;

-- Enforce that end_date is on or after start date when it is provided.
alter table public.day_contexts
  add constraint day_contexts_end_date_gte_date check (end_date is null or end_date >= date);
