# DR-022: MCP data volume and aggregation

- **Status:** Active
- **Decided:** 2026-11
- **Theme:** mcp-data-volume
- **Builds on:** [dr-017-chatgpt-plugin](dr-017-chatgpt-plugin.md)

## Context

Issue #92: asked "what haven't we eaten for a while?", Claude replied that
Planny Planny "shows 43 planned meals over the past year … but the tool
returns only those counts, not the meal names or dates". Two things caused
this:

1. The `/mcp` endpoint put the rows in `structuredContent` but its text
   block said only `list_meals returned 43 items.` Claude (and many MCP
   clients) reason over the text content, so the model only ever saw a
   count. The MCP specification says a server returning
   `structuredContent` SHOULD also return the serialised JSON in a text
   block for backwards compatibility.
2. Every read tool returned raw per-day rows. Answering a rotation or
   inspiration question over a year means the model has to group hundreds
   of rows itself, and it may silently truncate them.

Rough sizing (JSON, about four characters per token):

| Payload | Size | Tokens |
| --- | --- | --- |
| One planned-meal row (uuid, title, date, no description) | 120–200 B | 40–60 |
| One year at one meal per day (365 rows) | 50–70 KB | 15–20k |
| One year at two meals per day with descriptions | 150 KB+ | 40k+ |
| One year grouped by dish (60–150 distinct dishes) | 10–25 KB | 3–7k |
| Ingredient usage summary (100–200 ingredients) | 8–15 KB | 2–4k |

Edge Function latency and memory are not the limit; the model's context
window and attention are. Tool results also stay in the conversation, so a
large result taxes every later turn.

## Decision

1. **Text content carries the data.** Every tool result's text block is a
   one-line summary followed by `JSON.stringify(structuredContent)`.
2. **Aggregate for reasoning.** Questions about history, rotation and
   inspiration are served by `get_meal_history` (one entry per dish:
   counts, first/last planned, days since last planned, outcome counts,
   ingredients) and `get_ingredient_stats` (one entry per ingredient:
   usage count, last used, example meals, starred/warning flags). Both
   default to the past year and are bounded by distinct dishes or
   ingredients, not by days.
3. **Paginate and cap raw listings.** `list_meals` accepts `limit`
   (default 100, max 365) and returns `has_more` and `next_from`. Pages end
   on a date boundary so a client never repeats or skips a day. Existing
   defaults (`today` → six days ahead) are unchanged.
4. **Keep rows lean.** MCP shapes omit `household_id`, `created_at` and
   other fields the model cannot use; `id` stays because update and delete
   tools need it.
5. **Route the model.** The server `instructions` name which tool answers
   which kind of question.

Dish grouping is trim-, case- and whitespace-insensitive only. Near
duplicates such as "Spag bol" and "Spaghetti bolognese" are left for the
model to merge from the compact list.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| Only fix the text block | Smallest change | A year of raw rows is still 15–40k tokens; the model does all the grouping | Rejected |
| Only paginate `list_meals` | Bounded responses | Many round trips for a simple rotation question; grouping still left to the model | Partial — adopted alongside aggregation |
| Server-side aggregation tools | Compact, directly answers the questions, bounded by distinct dishes | More tool surface to maintain | Chosen |
| MCP resources or sampling | Spec-native ways to stream large data | Uneven client support in ChatGPT and Claude connectors today | Deferred |

## Consequences

- New read-only tools reuse the existing `canUsePlugin` role check; no new
  permission, RLS policy or migration is needed.
- Tool schema changes remain additive per [dr-017](dr-017-chatgpt-plugin.md).
- Aggregation helpers live in `supabase/functions/_shared/mealHistory.ts`
  as pure functions with Vitest coverage; integration BDD scenarios prove
  the tools end to end.
- Future read tools must choose, and document, which of "aggregate",
  "paginate" or "small bounded list" they are.
