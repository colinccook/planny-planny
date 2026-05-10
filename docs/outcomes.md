# Outcomes — the headline metric

> "Did Planny Planny help?"

Outcomes answer the single question this app exists to answer:
**did the meal we planned actually get cooked and eaten?** Every other
feature — the calendar, ideas, reactions, AI prompts, todos — is in
service of producing meals that *actually happen*. Outcomes are how we
know whether we're succeeding, both per-household and globally.

## What an outcome is

For every meal in the calendar, an editor can record one of two states:

| Status            | Meaning                                            | Card visual                          |
|-------------------|----------------------------------------------------|--------------------------------------|
| `as_planned`      | The meal happened. 🌱                               | Emerald-100 background, 🌱 prefix    |
| `did_not_happen`  | It didn't — and a reason is mandatory.              | Neutral grey, reason on a sub-line   |

The reason for a miss is one of:

- We didn't do food shopping
- We went out for a meal instead
- We had an unexpected event
- We didn't fancy what we'd planned
- Other (free-text note required)

Outcomes are stored one-per-meal in the `meal_outcomes` table; the
schema, RLS policies and CHECK constraints live in
[`supabase/migrations/20260510000001_meal_outcomes.sql`](../supabase/migrations/20260510000001_meal_outcomes.sql).

## Where outcomes show up

1. **On every past or current meal card.** Editors see a small "How
   did it go?" pill below the card. Tapping it opens the outcome tray.
   Future meals never get the pill — even editors can't pre-record.
2. **As a "Yesterday" ghost row** at the top of the forward calendar
   view. The row only appears when at least one yesterday meal still
   has no outcome; once they're all answered, the row vanishes
   naturally on the next render. The row is visually faded with a
   dashed top border so it doesn't compete with the upcoming days.
3. **As celebratory styling on the meal card itself.** A successful
   outcome paints the card emerald and adds the 🌱 prefix; a one-shot
   `flourish` keyframe animates the change so it feels rewarding rather
   than mechanical. Reduced-motion users get the styling without the
   animation.
4. **As a chime** — recording an "as planned" outcome plays the warm
   `done` sound (the same sound you get when ticking a todo).
5. **On the unauthenticated welcome screen** as the headline metric:
   *"Successfully helped families plan N meals"*. The number is read
   from the `get_public_stat('successful_meals_total')` SECURITY
   DEFINER RPC, which is anon-callable and cached daily. When the
   number is zero (fresh database) we hide the headline rather than
   render a discouraging "0 meals".

## Permissions

Recording an outcome is gated by the `canRecordOutcomes` predicate in
[`src/lib/permissions.ts`](../src/lib/permissions.ts), aliased today to
`canEditMeals`. Both DB-level RLS (`can_record_outcomes()` SQL helper)
and the React UI use this single source of truth.

| Role             | Record outcomes |
|------------------|-----------------|
| Owner            | ✅              |
| Member           | ✅              |
| Honoured Guest   | ✅              |
| Voting Guest     | ❌              |
| Public           | ❌              |

The matrix is also enforced as a BDD scenario per role at
[`tests/component/features/permissions/role-capability-matrix.feature`](../tests/component/features/permissions/role-capability-matrix.feature).

## Why a dedicated table (not a column on `meal_plans`)?

- Keeps the audit trail (`recorded_by`, `created_at`) cleanly separated
  from the meal row.
- Lets us drop / re-record an outcome without touching the meal.
- Mirrors how `meal_plan_reactions` is modelled, so the realtime &
  caching plumbing (`HOUSEHOLD_FILTERED_TABLES`,
  `INVALIDATIONS.meal_outcomes`) is identical.
- If we later want outcomes on todos or events, we can either add
  sibling tables or refactor to a polymorphic `outcomes` table. The
  current design starts meal-only on purpose to keep RLS sane and the
  UI focused.

## The cached headline counter

`public_stats` is a one-row-per-key cache table — currently just
`successful_meals_total`. It exists because we want the welcome-screen
number visible *before* the user even has a session, and we don't want
to grant `anon` SELECT on the whole `meal_outcomes` table to do it.

Two refresh mechanisms live alongside each other:

- **`pg_cron`** runs `refresh_public_stat('successful_meals_total')` at
  03:17 UTC every day in environments where the extension is
  available. The migration's `DO` block is a no-op on local dev where
  pg_cron isn't installed, so applying the migration is always safe.
- **Lazy refresh on read** — `get_public_stat(key)` checks
  `refreshed_at` and recomputes if it's older than 24 hours. This
  guarantees the very first visitor of the day still sees a fresh
  number even if cron hasn't run yet, and means local dev works
  without cron at all.

The realtime invalidation graph (`INVALIDATIONS.meal_outcomes` in
[`src/lib/queryKeys.ts`](../src/lib/queryKeys.ts)) also bumps the
`publicStat('successful_meals_total')` query key whenever an outcome
changes, so a recently-signed-out visitor sees the count update
within one refetch interval.
