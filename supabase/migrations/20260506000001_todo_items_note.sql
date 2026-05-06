-- ============================================================
-- Todo items — optional note
--
-- Tapping a todo now opens a full-screen "Todo" view where you
-- can edit the title, change the day it's pinned to, attach an
-- optional note (e.g. "remember the receipt"), and delete it.
-- The note is purely informational and may be left null.
-- ============================================================

alter table public.todo_items
  add column if not exists note text;
