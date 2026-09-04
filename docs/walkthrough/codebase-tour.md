# Codebase tour

A map of the repository, one request's journey through it, and where to
start for common tasks.

## What this app actually is

Planny Planny is a **mobile-first web app** for collaborative meal planning
inside a household. A "household" is the unit of sharing: meals, ideas,
ingredients and todos all belong to a household, and household members can
edit them. A user can belong to several households (e.g. their family and
a shared flat).

The app has three main screens:

- **Calendar** — a long, scrolling list of days; tap one to see the detail.
- **Day detail** — meals, ideas, todos and events for a single day.
- **Settings** — manage households, members, ingredients, store cupboard.

Every change one person makes shows up on every other member's screen
within a second, without anyone refreshing. That's the realtime part.

## The shape of the repository

```
src/
  components/    UI components, grouped by feature
    auth/        Login, register, password reset
    calendar/    Calendar grid, day detail, meal cards…
    ingredients/ Ingredient list and tags
    layout/      App shell, tab bar, header
    settings/    Household settings, member list, invites
    ui/          Reusable primitives (Tray, ReactionButton, NumberStepper)
  hooks/         Custom React hooks
    useAuth          Auth context
    useHousehold     Active household + memberships + realtime composition
    useMemberships   List of households this user belongs to
    useHouseholdRealtime  Owns the websocket subscription
    useMealPlans/Ideas/Todos/Ingredients  TanStack Query wrappers
    useStoreCupboard      LocalStorage-backed device cupboard
  lib/           Pure logic and shared services
    supabase.ts        The Supabase client singleton
    queryKeys.ts       Canonical query keys + invalidation graph
    realtime.ts        HouseholdRealtimeManager
    permissions.ts     Role predicates (canEditMeals, canVote, …)
    sounds.ts          Web Audio UI sound palette
    dates.ts           Date helpers
    todos.ts           Todo grouping logic
  pages/         One file per top-level route
  types/         TypeScript types (notably the generated `database.ts`)
supabase/
  migrations/    SQL migrations applied to the database, in filename order
  functions/     Deno Edge Functions (ChatGPT plugin OAuth)
tests/
  integration/   Playwright BDD against the real app + a local Supabase
  component/     Playwright BDD against HTML harnesses or pure logic
  support/       Fixtures and helpers shared by both suites
docs/
  walkthrough/   This series of technology walkthroughs
  drs.md         Decision-records index (why each technology was chosen)
  drs/           One file per decision record
  screenshots/   Images used by the README
```

A quick rule of thumb:

- **Pure logic** with no React → put it in `src/lib/` and unit-test with
  Vitest.
- **Shared React hooks or contexts** → `src/hooks/`.
- **Reusable presentational widgets** → `src/components/ui/`.
- **Anything page-level** → `src/pages/`.

## How a request flows: write, then read

Imagine the user adds a meal called "Pasta bake" to next Wednesday. Here's
what happens:

```
 ┌──────────────┐    1. user clicks Save
 │  MealForm    │ ───────────────────────▶
 └──────────────┘                         ┌──────────────────┐
                                          │ useCreateMealPlan │  (hooks/useMealPlans.ts)
                                          └──────────────────┘
                                                   │  2. supabase.from('meal_plans').insert(...)
                                                   ▼
                                          ┌──────────────────┐
                                          │  Supabase REST   │  → Postgres (RLS-checked)
                                          └──────────────────┘
                                                   │  3. row written
                                                   ▼
                                          ┌──────────────────┐
                                          │   Postgres       │
                                          │   change event   │
                                          └──────────────────┘
                                                   │
                          ┌────────────────────────┴────────────────────────┐
                          │                                                 │
                          ▼ 4a. mutation onSuccess                          ▼ 4b. websocket
              invalidateAfter('meal_plans', hh)               every other tab gets the event
                          │                                                 │
                          ▼                                                 ▼
              useQuery refetches → UI updates                 invalidateAfter('meal_plans', hh)
                                                                            │
                                                                            ▼
                                                              useQuery refetches → UI updates
```

Two key takeaways:

1. **Writes always go to Supabase REST.** That's how Row-Level Security
   gets enforced — Postgres checks that *this user* is allowed to write
   that row.
2. **Reads happen twice over time.** First load is REST, then the realtime
   websocket pushes invalidations and the same `useQuery` hook refetches.

The user who issued the write doesn't have to wait for the websocket — the
mutation's `onSuccess` calls the same invalidation, so their UI updates
immediately. The websocket is for *everyone else*.

## Common tasks: where to start

| Task | Start in |
| --- | --- |
| Add a column to an existing table | `supabase/migrations/<new-file>.sql` + regenerate `src/types/database.ts` |
| Add a new query | `src/hooks/useFoo.ts` using `queryKeys.foo(...)` |
| Add a new derived query | Add it to `queryKeys.ts` and to the `INVALIDATIONS` map |
| Add a new mutation | Same hook file, use `useMutation` + `invalidateAfter` |
| Add a tray to the day screen | A new section component, plus a `useOverlay('day-detail:<date>:foo')` slot |
| Add a new permission | A predicate in `src/lib/permissions.ts` + RLS in a migration + BDD matrix row |
| Wire a new realtime table | `HOUSEHOLD_FILTERED_TABLES` and `INVALIDATIONS` in `queryKeys.ts` |
| Add a new route | A page in `src/pages/`, a `<Route>` in `src/App.tsx` |

For anything that changes user-facing behaviour, also check whether
`README.md` needs an update.

## Permissions: the five roles and the predicate pattern

Every household has five audiences: **Owner** (everything), **Member**
(edit + invite), **Honoured Guest** (edit, can't invite), **Voting Guest**
(vote only), **Public** (read-only share link).

The hard rule: **never compare role strings inline**. Always use a
predicate from `src/lib/permissions.ts`:

```ts
import { canEditMeals, canVote, canInviteMembers } from '../lib/permissions'

if (canEditMeals(currentRole)) { ... }
```

If no existing predicate fits the new feature, add one. The predicates are
tested exhaustively in `permissions.test.ts` and mirrored in the BDD
matrix at `tests/component/features/permissions/role-capability-matrix.feature`,
plus enforced in the database via the RLS policies in
`supabase/migrations/`. For the architecture and the conventions for
adding features that touch permissions, read
[`docs/permissions.md`](../permissions.md).

## Glossary

- **RLS** (Row-Level Security) — Postgres-side rules that decide whether
  a particular user can read/write a particular row.
- **JWT** — the auth token Supabase issues at sign-in and includes on
  every request. Inside RLS, `auth.uid()` reads the user id from the JWT.
- **`queryKey`** — the array TanStack Query uses to identify a cached
  query. Two queries with the same key share a cache entry.
- **Optimistic update** — applying a mutation's expected effect to the
  cache immediately, before the server responds.
- **Realtime channel** — a named websocket subscription, in this app one
  per (table, household) pair.
- **Tray** — a bottom sheet UI component (see `src/components/ui/Tray.tsx`).
- **Overlay** — anything that floats above the page content (trays,
  modals); coordinated by `useOverlay`.
- **Household** — the unit of sharing and isolation for all app data.

Back to the [walkthrough index](README.md)
