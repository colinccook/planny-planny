# Public (unauthenticated) database access

> What can a visitor with no Supabase session reach, and what stops
> them turning it into a denial-of-service or data leak?

Supabase exposes the Postgres database to the browser through PostgREST,
authorised by a per-request JWT. When no JWT is sent the request runs
under the `anon` role. This document enumerates **everything the `anon`
role can reach**, why it is safe to expose, and what countermeasures
(RLS, caching, indexes) are in place.

If you add a new public-facing endpoint or relax an existing policy,
**update this file in the same PR.**

## Summary

| Surface                                  | Who can call    | Cost per call               | Countermeasures                    |
|------------------------------------------|-----------------|-----------------------------|------------------------------------|
| `get_public_stat(key)` RPC               | `anon`, `authd` | O(1) — single row read      | SECURITY DEFINER, 24h cache, search_path pinned |
| `refresh_public_stat(key)` RPC           | `service_role`, `postgres` only | O(N) full count    | **Not callable by anon.** Daily pg_cron + lazy via `get_public_stat` |
| `public_stats` table SELECT              | `anon`, `authd` | O(1) — primary-key lookup   | Single-row table, no PII, RLS open by design |
| `households` SELECT (shared row)         | `anon`          | O(1) — unique-index lookup  | RLS gated on `public_share_token is not null` |
| `meal_plans` SELECT (shared household)   | `anon`          | bounded read window         | RLS gated on parent household share; client filters by date + `limit(14)` |
| `meal_ideas` SELECT (shared household)   | `anon`          | bounded — small per-household | RLS gated on parent household share; uses `meal_ideas_household_date_idx` |
| `reactions` SELECT (shared household)    | `anon`          | bounded — small per-household | RLS gated on parent household share; uses `reactions_household_target_idx` |
| `meal_outcomes` SELECT (shared household)| `anon`          | bounded — one row per meal  | RLS gated on parent household share; uses `meal_outcomes_meal_plan_id_idx` |

Everything else (writes, profile reads, household membership lists,
ingredients, todos, day contexts, invites, user preferences) requires
an authenticated session and is gated by per-household RLS policies.

## 1. The welcome-screen headline counter

**Code:** [`supabase/migrations/20260510000002_public_stats.sql`](../supabase/migrations/20260510000002_public_stats.sql),
[`src/hooks/usePublicStat.ts`](../src/hooks/usePublicStat.ts),
[`src/components/auth/SuccessfulMealsHeadline.tsx`](../src/components/auth/SuccessfulMealsHeadline.tsx)

The login page shows *"Successfully helped families plan **N** meals"*
before the visitor has a session. We never want a visitor to be able
to (a) read individual outcomes, or (b) trigger a recompute on every
page load.

### Read path: `get_public_stat(key)` RPC

- **Granted to:** `anon`, `authenticated`
- **What it returns:** a single `bigint` — the cached aggregate.
- **Cost:** one primary-key SELECT on `public_stats` (one row, one
  integer column). The lazy refresh branch only fires when the cached
  value is older than 24h, so at most **one** anon visitor per day
  triggers a recompute; everyone else hits the cache.
- **Hardening:**
  - `SECURITY DEFINER` so anon doesn't need direct table grants on
    `meal_outcomes`.
  - `set search_path = public, pg_temp` to defeat search-path
    hijacking.
  - Marked `VOLATILE` (writes through the lazy-refresh branch); the
    planner won't memoise it across statements.

### Refresh path: `refresh_public_stat(key)` RPC

- **Granted to:** `service_role`, `postgres` — **not** `anon` or
  `authenticated`.
- **Why locked down:** it runs `count(*)` over `meal_outcomes`. If anon
  could call it, a hostile client could spam the endpoint and force a
  full table scan on every request, defeating the cache and bringing
  the database down.
- **How it gets called in production:**
  1. Daily `pg_cron` job at `03:17 UTC` (best-effort — silently skipped
     where pg_cron isn't installed, e.g. local dev / CI).
  2. The lazy branch inside `get_public_stat` itself, gated on the
     cached row being more than 24h old.
- Same `search_path` / SECURITY DEFINER hardening as above.

### Storage: `public_stats` table

- One row per metric (currently just `successful_meals_total`).
- Anon `SELECT` policy `using (true)` — by design, this table holds
  only global aggregates and contains no per-user data.
- No anon `INSERT` / `UPDATE` / `DELETE` policy. The only writer is
  `refresh_public_stat`, which runs SECURITY DEFINER.
- Primary key on `key` → constant-time reads.

## 2. Public household share links (`/public/:token`)

**Code:** [`src/pages/PublicHouseholdPage.tsx`](../src/pages/PublicHouseholdPage.tsx),
RLS in [`supabase/migrations/20260402000005_rls_policies.sql`](../supabase/migrations/20260402000005_rls_policies.sql),
[`supabase/migrations/20260424000001_access_levels.sql`](../supabase/migrations/20260424000001_access_levels.sql),
[`supabase/migrations/20260510000001_meal_outcomes.sql`](../supabase/migrations/20260510000001_meal_outcomes.sql)

A household owner can opt-in to a public share by minting a
`public_share_token` on the `households` row. Anyone holding that
token URL can view a read-only slice of that household.

### What an anon viewer can read

| Table            | Columns the page selects                                        | RLS predicate                                                |
|------------------|-----------------------------------------------------------------|--------------------------------------------------------------|
| `households`     | full row (including `name`, `default_adults`, etc.)             | `public_share_token is not null`                             |
| `meal_plans`     | `id, household_id, date, title, description`                    | parent household has `public_share_token is not null`        |
| `meal_ideas`     | `id, household_id, title, created_at` (deliberately **not** `created_by`) | parent household has `public_share_token is not null` |
| `reactions`      | `id, household_id, target_type, target_id`                      | parent household has `public_share_token is not null`        |
| `meal_outcomes`  | `id, meal_plan_id, household_id, status, reason, note`          | parent household has `public_share_token is not null`        |

### Countermeasures

- **Token unguessability.** `public_share_token` is a UUID (`uuid
  unique` in the schema → backed by a unique index). Brute-forcing the
  search space is not feasible.
- **Index on lookup column.** The `unique` constraint on
  `public_share_token` gives O(log n) lookups for the
  `households.eq('public_share_token', token)` query the page issues.
- **Bounded result sets.** The page caps `meal_plans` at the next 14
  days (`.limit(14)`); meal_ideas/reactions are naturally bounded
  per-household and indexed on `(household_id, …)`:
  - `meal_ideas_household_date_idx` on `meal_ideas (household_id, …)`
  - `reactions_household_target_idx` on `reactions (household_id, …)`
  - `meal_outcomes_meal_plan_id_idx` on `meal_outcomes (meal_plan_id)`
- **No write surface.** No anon `INSERT/UPDATE/DELETE` policies exist
  on any of these tables; the public RLS policies are `for select`
  only.
- **Column whitelisting at the client.** Even though RLS would let an
  anon viewer read additional columns from `meal_ideas` /
  `meal_plans`, the page deliberately selects a narrow subset
  (notably skipping `meal_ideas.created_by` so a share link never
  exposes who proposed an idea). If new columns are added to these
  tables that contain PII, **audit `PublicHouseholdPage.tsx`** to
  ensure the public projection still excludes them.
- **Opt-in.** A household has no `public_share_token` by default;
  enabling sharing is an explicit toggle in Settings, and disabling it
  rotates the token (so old URLs stop working).

### Known limitation

The `Public can view …` policies check
`households.public_share_token is not null`, **not** that the requester
proved knowledge of the token at the SQL layer. That check is enforced
by the client query (which always filters via the token). This is fine
because:
- Discovering a household's UUID without its share token doesn't grant
  access through any UI we ship.
- Even if a hostile client crafted a raw PostgREST request enumerating
  households by id, every shared household has *consented* to its
  contents being public.

If we ever want share tokens to be revocable in the cryptographic sense
(rather than the "rotate the token" sense we have today), we would
need to thread the token into the RLS policies themselves via a
SECURITY DEFINER function similar to `get_public_stat`.

## What is **not** anon-accessible

For completeness, the following tables have RLS that requires
membership in the relevant household — anon requests get zero rows
back:

- `profiles`, `household_members`, `household_invites`
- `ingredients`, `meal_plan_ingredients`
- `todo_items`, `day_contexts`, `day_placeholders`
- `meal_outcomes` writes (gated by `can_record_outcomes()`; see
  [`docs/permissions.md`](./permissions.md))

Auth itself (`/auth/v1/*`) is the one other unauthenticated surface,
but that's Supabase Auth's responsibility, not ours.

## Adding a new public surface

When in doubt: don't.

If you must, the checklist is:

1. **Prefer a SECURITY DEFINER RPC over a raw table grant.** It lets
   you cap the work-per-call (e.g. caching, rate-limiting,
   pre-aggregation) without coupling that policy to PostgREST URL
   shapes.
2. **Pin `set search_path`** on every SECURITY DEFINER function.
3. **Mark write paths `VOLATILE`** (the default). Don't lie to the
   planner.
4. **Bound the cost per call.** Indexes on every filtered column, and
   `.limit()` on every read. Never let an anon caller trigger an
   unbounded scan or aggregate.
5. **Don't grant `EXECUTE` of expensive functions to `anon`.** Have
   anon read a cached value and let `service_role` / `pg_cron` refresh
   it.
6. **Audit the client projection.** RLS protects rows; your client's
   `.select(...)` list protects columns. Both must agree.
7. **Update this file** with the new row in the summary table and a
   new section explaining the rationale and countermeasures.
