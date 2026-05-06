# Code Walkthrough — for new TypeScript / Supabase developers

Welcome 👋 — this is a guided tour through Planny Planny's source code, written
for someone who's never used **TypeScript** or **Supabase** before. By the end
you should be able to open any file in `src/` and follow what it's doing.

You don't need to read this front-to-back. Skim the table of contents, dive
into whatever you need, and come back later for the rest.

## Table of contents

1. [What this app actually is](#1-what-this-app-actually-is)
2. [TypeScript in 90 seconds](#2-typescript-in-90-seconds)
3. [The shape of the repository](#3-the-shape-of-the-repository)
4. [How a request flows: write, then read](#4-how-a-request-flows-write-then-read)
5. [Supabase: what each "S" gives us](#5-supabase-what-each-s-gives-us)
6. [TanStack Query: the server-state cache](#6-tanstack-query-the-server-state-cache)
7. [The four kinds of state in this app](#7-the-four-kinds-of-state-in-this-app)
8. [The `queryKeys` module: one place for the dependency graph](#8-the-querykeys-module-one-place-for-the-dependency-graph)
9. [Realtime: how the websocket keeps every tab in sync](#9-realtime-how-the-websocket-keeps-every-tab-in-sync)
10. [Optimistic updates: making the UI feel instant](#10-optimistic-updates-making-the-ui-feel-instant)
11. [Permissions: the five roles and the predicate pattern](#11-permissions-the-five-roles-and-the-predicate-pattern)
12. [Routing and the App shell](#12-routing-and-the-app-shell)
13. [Trays, modals and the `useOverlay` hook](#13-trays-modals-and-the-useoverlay-hook)
14. [Testing: BDD, components, units](#14-testing-bdd-components-units)
15. [Common tasks: where to start](#15-common-tasks-where-to-start)
16. [Glossary](#16-glossary)

---

## 1. What this app actually is

Planny Planny is a **mobile-first web app** for collaborative meal planning
inside a household. A "household" is the unit of sharing: meals, ideas,
ingredients and todos all belong to a household, and household members can
edit them. A user can belong to several households (e.g. their family and a
shared flat).

The app has three main screens:

- **Calendar** — a long, scrolling list of days; tap one to see the detail.
- **Day detail** — meals, ideas, todos and events for a single day.
- **Settings** — manage households, members, ingredients, store cupboard.

Every change one person makes shows up on every other member's screen
within a second, without anyone refreshing. That's the realtime part.

---

## 2. TypeScript in 90 seconds

If you know JavaScript, TypeScript is "JavaScript + type annotations".
The compiler checks them; the browser never sees them.

```ts
// A function with typed parameters and a typed return value.
function greet(name: string): string {
  return `Hello, ${name}`
}

// A type alias — a name for a shape.
type Meal = {
  id: string
  title: string
  description: string | null   // can be a string OR null
}

// An interface — like a type alias, but extendable.
interface Household {
  id: string
  default_adults: number
}

// A union — value can be one of several literal options.
type Role = 'owner' | 'member' | 'honoured_guest' | 'voting_guest' | 'public'

// Generics — a placeholder filled in by the caller.
function first<T>(items: T[]): T | undefined {
  return items[0]
}
const meal: Meal | undefined = first<Meal>([])
```

Things you'll see a lot in this codebase:

- **`Database['public']['Tables']['meal_plans']['Row']`** — TypeScript reads
  the auto-generated database schema in `src/types/database.ts` and gives us
  the exact shape of a row. If the schema changes and you forget to
  regenerate, the build will fail until you do.
- **`as const`** and **`satisfies`** — pin literal types so unions narrow.
- **`?:`** — optional property (`profile?: string` means it might be missing).
- **`!` after an expression** — a non-null assertion, "trust me, this isn't
  null". Used sparingly; prefer a real check.
- **`unknown`** — like `any` but you must narrow it before using it.

The repo is configured with TypeScript **strict mode**, and the project
convention is **no `any`**.

---

## 3. The shape of the repository

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
    dates.ts           Date helpers
    todos.ts           Todo grouping logic
  pages/         One file per top-level route
  types/         TypeScript types (notably `database.ts`)
supabase/
  migrations/    SQL migrations applied to the database
tests/
  integration/   Playwright BDD against the real app + a local Supabase
  component/     Playwright BDD against HTML harnesses or pure logic
  support/       Fixtures and helpers shared by both suites
docs/
  state-management.md   Why we don't use Redux/Zustand
  walkthrough.md        ← you are here
  permissions.md        The five-role architecture
```

A quick rule of thumb:

- **Pure logic** with no React → put it in `src/lib/` and unit-test with
  Vitest.
- **Shared React hooks or contexts** → `src/hooks/`.
- **Reusable presentational widgets** → `src/components/ui/`.
- **Anything page-level** → `src/pages/`.

---

## 4. How a request flows: write, then read

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

1. **Writes always go to Supabase REST.** That's how Row-Level Security (RLS)
   gets enforced — Postgres checks that *this user* is allowed to write that
   row.
2. **Reads happen twice over time.** First load is REST, then the realtime
   websocket pushes invalidations and the same `useQuery` hook refetches.

The user who issued the write doesn't have to wait for the websocket — the
mutation's `onSuccess` calls the same invalidation, so their UI updates
immediately. The websocket is for *everyone else*.

---

## 5. Supabase: what each "S" gives us

[Supabase](https://supabase.com/) is an open-source backend you can think of
as "Postgres + a few services bolted on". You'll meet four of those services
in this codebase:

### 5a. Postgres (the database)

The schema is defined by SQL migrations in `supabase/migrations/`, applied
in order by filename. To change the database you write a new migration file;
you never edit an old one. The migrations also define **RLS policies** —
SQL rules that say "this user can read row X iff …". RLS runs in the
database, so even a malicious client who fudges a request can't bypass it.

### 5b. Auth

`supabase.auth.signUp({...})`, `signInWithPassword({...})`, etc. Wrapped in
`hooks/useAuth.tsx`. The auth call returns a JWT that's automatically sent
on every subsequent REST and Realtime call, and Postgres reads
`auth.uid()` from it inside RLS policies.

### 5c. PostgREST (the REST API)

When you call `supabase.from('meal_plans').select(...)`, the JS client builds
a URL and Postgres serves the result. **You don't write API routes** — the
schema *is* the API. The `select` syntax also supports joins:

```ts
supabase.from('meal_plans')
  .select('*, meal_plan_ingredients(*, ingredients(*))')
```

means "give me every column of `meal_plans`, plus, for each, every column of
its joined `meal_plan_ingredients` rows, plus the `ingredient` row each of
those points at". This is the equivalent of a SQL join, expressed as a
nested select.

### 5d. Realtime

A websocket that broadcasts Postgres `INSERT`/`UPDATE`/`DELETE` events.
The client subscribes to the events it cares about (filtered by household
id where possible) and wires them into TanStack Query invalidations. See
[§9](#9-realtime-how-the-websocket-keeps-every-tab-in-sync).

---

## 6. TanStack Query: the server-state cache

[TanStack Query](https://tanstack.com/query) (formerly React Query) is a
library that wraps `fetch`-style functions and caches their results in
memory, keyed on a `queryKey`. You write declarative hooks and the library
handles loading, error, refetch and caching.

A minimal example from this codebase:

```ts
// src/hooks/useMealPlans.ts (simplified)
export function useMealPlans(householdId: string | undefined, start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.mealPlans(householdId, start, end),
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, meal_plan_ingredients(*, ingredients(*))')
        .eq('household_id', householdId)
        .gte('date', start)
        .lte('date', end)
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}
```

What this gives you for free:

- **Caching** — calling `useMealPlans` from two components only fires one HTTP
  request; both components subscribe to the same cache entry.
- **Loading + error** — `result.isLoading`, `result.error`, `result.data`.
- **Invalidation** — call `queryClient.invalidateQueries({ queryKey })` and
  the matching cache entries refetch automatically.
- **Background refetch on window focus** — handled out of the box.

Mutations (writes) live in `useMutation`. They typically:

1. Run a `mutationFn` that talks to Supabase REST.
2. On success (`onSuccess`), call `invalidateAfter(...)` so any affected
   cache entries refetch.
3. Optionally, run `onMutate` to update the cache *optimistically* before
   the server responds (see [§10](#10-optimistic-updates-making-the-ui-feel-instant)).

---

## 7. The four kinds of state in this app

When something on screen changes, ask yourself **where does the truth live?**
There are four answers:

| Kind | Examples | Lives in |
| --- | --- | --- |
| **Server state** | meals, ideas, todos, reactions, ingredients, memberships | TanStack Query cache, kept fresh by realtime |
| **Auth / session state** | current user, JWT, current household id | React Context (`useAuth`, `useHousehold`) |
| **Cross-cutting UI state** | toasts, header overrides, "which tray is open" | React Context (`useToast`, `useHeaderOverride`, `useOverlay`) |
| **Local UI state** | form inputs, scroll positions | Component `useState` |

Why this matters: server state is owned by Postgres and synced over realtime,
so we **never** copy it into a global store like Redux/Zustand — that would
create two competing sources of truth. The whole architecture leans on
TanStack Query being the only client-side cache for server data.

For the long version, read [`docs/state-management.md`](state-management.md).

---

## 8. The `queryKeys` module: one place for the dependency graph

`src/lib/queryKeys.ts` is the single most important file to understand if
you're adding a new query. It does two things:

### 8a. Canonical key builders

```ts
queryKeys.mealPlans('hh-1', '2026-01-01', '2026-01-07')
// → ['meal-plans', 'hh-1', '2026-01-01', '2026-01-07']

queryKeys.reactions('hh-1', 'meal_idea', ['idea-1', 'idea-2'])
// → ['reactions', 'hh-1', 'meal_idea', 'idea-1', 'idea-2']
```

The first segment is the cache "namespace"; the second is always the
household id (so realtime can fan out invalidations along the same axis as
RLS).

### 8b. The invalidation graph

When a row in `meal_plans` changes, three caches may now be stale:

- `['meal-plans', householdId, ...]` — obviously
- `['plan-streak', householdId, ...]` — derived from meal plans

That dependency graph used to live in two places (every mutation **and**
the realtime manager). Now it lives in one — a function called
`invalidateAfter(qc, table, householdId)`:

```ts
invalidateAfter(queryClient, 'meal_plans', 'hh-1')
// invalidates ['meal-plans', 'hh-1'] and ['plan-streak', 'hh-1']
```

Every mutation calls it on success; the realtime manager calls it on every
websocket event. To add a new derived query, you only have to update the
`INVALIDATIONS` map in `queryKeys.ts` and every consumer benefits.

---

## 9. Realtime: how the websocket keeps every tab in sync

`src/lib/realtime.ts` exports `HouseholdRealtimeManager`. There is exactly
one of these alive at a time, owned by the `useHouseholdRealtime` hook
mounted inside `HouseholdProvider`.

When the active household changes, the manager:

1. **Unsubscribes** from the old household's channels.
2. **Subscribes** to one channel per table, filtered by `household_id`.
3. **Wires** each channel's `postgres_changes` event to
   `invalidateAfter(qc, table, householdId)`.

A few tables are special:

- `households` — filtered by primary key, `UPDATE` only.
- `meal_plan_ingredients` — has no `household_id` column, so we subscribe
  to all changes and rely on the invalidation graph to scope cache writes.

You can usually ignore this file when adding features; if you add a new
household-scoped table, register it in `HOUSEHOLD_FILTERED_TABLES` in
`queryKeys.ts` and add an entry to `INVALIDATIONS`.

---

## 10. Optimistic updates: making the UI feel instant

For most mutations we wait for the server before updating the UI — a tiny
spinner is fine. But for the very high-frequency ones (a thumbs-up tap, a
todo tick) we update the cache *immediately*, send the request in the
background, and roll back if the server rejects.

The pattern (in `useUpsertReaction` / `useDeleteReaction` /
`useCompleteTodo` / `useReopenTodo`) is:

```ts
useMutation({
  mutationFn: callServer,

  // 1. Before the request goes out, snapshot the cache and apply our guess.
  onMutate: (args) => {
    qc.cancelQueries({ queryKey: queryKeys.todoItems(hh) })
    const snapshot = takeSnapshot()
    qc.setQueriesData(..., (old) => applyEdit(old, args))
    return { snapshot }
  },

  // 2. If the server rejects, restore the snapshot.
  onError: (_err, _args, ctx) => restore(ctx?.snapshot),

  // 3. Win or lose, re-sync with the server so we have the real row.
  onSettled: (_, __, args) => invalidateAfter(qc, 'todo_items', args.householdId),
})
```

A subtle but important detail: **snapshot before you mutate**. Otherwise
the snapshot will already contain the optimistic value and the rollback
will be a no-op. (We had this bug for about ten minutes during the
refactor — it's an easy mistake to make and is why both the reactions and
todos tests have a "rolls back if the server rejects" case.)

---

## 11. Permissions: the five roles and the predicate pattern

Every household has five audiences:

| Role | Can do |
| --- | --- |
| **Owner** | Everything, plus delete the household and invite people |
| **Member** | Edit meals, vote, propose ideas, invite people |
| **Honoured Guest** | Edit meals, vote, propose ideas. Can't invite or change the household |
| **Voting Guest** | Vote on ideas only. Can't edit anything |
| **Public** | Read-only via a share link |

The hard rule: **never compare role strings inline**. Always use a predicate
from `src/lib/permissions.ts`:

```ts
import { canEditMeals, canVote, canInviteMembers } from '../lib/permissions'

if (canEditMeals(currentRole)) { ... }
```

If no existing predicate fits the new feature, add one. The predicates are
tested exhaustively in `permissions.test.ts` and mirrored in the BDD
matrix at `tests/component/features/permissions/role-capability-matrix.feature`,
plus enforced in the database via the RLS policies in `supabase/migrations/`.

For the architecture and the conventions for adding features that touch
permissions, read [`docs/permissions.md`](permissions.md).

---

## 12. Routing and the App shell

`src/App.tsx` wires up React Router and the four global Providers, in this
order:

```
QueryClientProvider             ← TanStack Query cache
  ToastProvider                 ← global toast notifications
    AuthProvider                ← who is logged in?
      HouseholdProvider         ← which household am I looking at?
        OverlayProvider         ← which tray/modal is open?
          AppShell + <Routes>
```

Each provider is the one that owns its slice of state. Components further
down the tree consume them via the matching `useFoo()` hook.

---

## 13. Trays, modals and the `useOverlay` hook

A "tray" in this app is a sheet that slides up from the bottom of the
screen — see `src/components/ui/Tray.tsx`. The day detail screen has
several (add idea, idea detail, AI prompt, copy meal) and we want exactly
one of them visible at a time.

`useOverlay(id)` (`src/components/ui/OverlayProvider.tsx`) is a tiny hook
that gives you the same ergonomics as `useState<boolean>` but routes the
state through a shared store, so opening overlay B closes overlay A:

```ts
const addIdea = useOverlay('day-detail:2026-04-20:add-idea')
return (
  <>
    <button onClick={() => addIdea.open()}>+ Add idea</button>
    <Tray isOpen={addIdea.isOpen} onClose={addIdea.close}>…</Tray>
  </>
)
```

Use a stable namespacing convention like `"day-detail:<date>:<purpose>"`
so two independent components don't clash.

---

## 14. Testing: BDD, components, units

The project has three layers of automated tests, in increasing weight:

- **Unit tests** (Vitest, `*.test.ts(x)`) — pure logic in `src/lib/` and
  the simpler hooks. Run with `npm test`.
- **Component BDD** (`tests/component/`) — Playwright with
  [`playwright-bdd`](https://github.com/vitalets/playwright-bdd) running
  Gherkin `.feature` files against HTML harnesses (`page.setContent`).
  No backend.
- **Integration BDD** (`tests/integration/`) — same engine but driving
  the **real** React app against a **local Supabase container**. This is
  the default place to add tests for any user-facing feature.

Conventions when adding a feature:

1. Default to **integration BDD**. Write a `.feature` file, add step
   definitions, watch it fail, then make it pass.
2. **Component BDD** is for things where the data layer doesn't exist yet
   (e.g. a new UI primitive) or pure logic that has no DOM (e.g. the
   role-capability matrix).
3. **Unit tests** are for pure helpers in `src/lib/` and for behaviours
   that are awkward to assert through the DOM (e.g. cache rollback after
   an optimistic mutation rejects).

Run unit tests during development with `npm test` (watch with
`npm test -- --watch`). The BDD suites have their own commands listed in
`package.json` and require Docker for the local Supabase instance.

---

## 15. Common tasks: where to start

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

---

## 16. Glossary

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
- **Overlay** — anything that floats above the page content (tray, modal,
  full-screen view). Coordinated globally by `useOverlay`.
- **Audience / Role** — the access level a user has in a household. See
  [`docs/permissions.md`](permissions.md).
- **BDD** (Behaviour-Driven Development) — describing a feature in
  Gherkin (`Given/When/Then`) and binding the steps to real test code.
