# State Management Review

This document is a snapshot review of how state is managed in the Planny Planny
React app today, where it's hurting, and whether a dedicated state-management
library would help. It is intentionally a *recommendation* document — no code
behaviour changes — so future contributors have a shared baseline before
reaching for Zustand / Redux / Jotai / etc.

> **TL;DR** — The current stack (TanStack Query + a small set of focused React
> Contexts + Supabase Realtime) is the *right shape* for this app. We do **not**
> need a global state library. The pain points are not "we need Redux", they
> are "a handful of components and one provider have grown too much". The
> targeted refactors at the bottom of this doc address them with the tools we
> already have.

---

## 1. What state we have, and where it lives

Planny Planny has four distinct kinds of state. Mixing them up is the most
common reason people reach for a state library when they don't need to.

| Kind | Examples | Where it lives today |
| --- | --- | --- |
| **Server state** (owned by Postgres, lives elsewhere) | meals, ideas, ingredients, todos, reactions, memberships | TanStack Query cache, kept fresh by Supabase Realtime |
| **Auth / session state** | current user, JWT, current household id, current role | React Context (`useAuth`, `useHousehold`) |
| **Cross-cutting UI state** | toasts, header overrides, calendar swipe direction | React Context (`useToast`, `useHeaderOverride`, `useCalendarDirection`) |
| **Local UI state** | which modal is open, form inputs, infinite-scroll page count | Component `useState` |
| **Device-local persistence** | dismissed cupboard items | `localStorage` via `useSyncExternalStore` (`useStoreCupboard`) |

Concrete inventory:

- **22 hooks in `src/hooks/`**, the majority being TanStack Query wrappers
  (`useMealPlans`, `useMealIdeas`, `useTodos`, `useIngredients`,
  `useDayPlaceholders`, `usePlanStreak`, plus query keys for `day-contexts`
  and `reactions`).
- **5 React Contexts**: `AuthContext`, `HouseholdContext`, `ToastContext`,
  `HeaderOverrideContext`, `CalendarDirectionContext`.
- **1 Realtime subscription manager** (`src/lib/realtime.ts`,
  `HouseholdRealtimeManager`) that turns Postgres change events into
  `queryClient.invalidateQueries(...)` calls.
- **No `useReducer` anywhere** in `src/`.
- **No optimistic updates** (`onMutate` / rollback) anywhere in `src/`.
- **No global state library** (no Zustand, Redux, Jotai, Recoil, Valtio).
  `package.json` only carries `@tanstack/react-query` and
  `@supabase/supabase-js` for state-ish concerns.

The data flow for any user write is:

```
component → mutation hook → Supabase REST (RLS enforced by Postgres)
                                  │
                                  ▼
                       Postgres change → Supabase Realtime
                                  │
                                  ▼
                  HouseholdRealtimeManager.invalidateQueries(...)
                                  │
                                  ▼
                       useQuery refetches → UI updates
```

For the writer's *own* household, `onSuccess` in the mutation also calls
`invalidateQueries` directly so the UI updates without waiting for the
WebSocket round-trip.

---

## 2. Is this appropriate for the app's complexity?

**Yes — for now.** A few reasons:

1. **Almost all "state" is server state.** Meals, ideas, todos, reactions,
   ingredients, memberships, day contexts — all of them are owned by the
   database. TanStack Query is purpose-built for that shape, and reaching for
   a client-side store would create two sources of truth for things Postgres
   already authoritatively owns.
2. **The real-time fan-out is naturally household-scoped.** Every query key
   starts with the household id (`['meal-plans', householdId, ...]`,
   `['ingredients', householdId]`, etc.), and the Realtime manager invalidates
   along the same axis. That is exactly what the per-household RLS model
   needs.
3. **Truly global UI state is small.** Auth, current household, toasts,
   header overrides, calendar swipe direction — that's it. A handful of
   `Context.Provider`s is well within React's comfort zone.
4. **No useReducer / no optimistic UI yet.** If the app actually needed
   complex reducers or optimistic state machines, Zustand or Jotai would
   start paying for themselves. Today we don't have that complexity.

The smell-test: a global store would push *more* state into the client (cache
duplication, manual sync) instead of letting Postgres + Realtime stay
authoritative. That is the opposite of what we want.

---

## 3. Growing pains

Even though the *architecture* is sound, several places are starting to ache.
These are the ones worth tracking. Severity is from the perspective of
"how much does this slow down adding the next feature?".

### 🟠 H1. `useHousehold` is doing three jobs at once

`src/hooks/useHousehold.tsx` (~117 LOC) currently mixes:

- the **TanStack Query** that fetches memberships
  (`useQuery(['my-households', user.id], ...)`),
- the **selection state** (`currentHouseholdId` + `switchHousehold`),
- the **lifecycle of `HouseholdRealtimeManager`** (subscribe on mount /
  household change, unsubscribe on the way out).

This is the single most coupled file in the app. It also means every
component that just wants the current `role` re-renders whenever the
membership query refetches.

**Why it matters:** changing how households are picked (e.g. "remember the
last selected household across reloads", or "deep link
`/households/:householdId` that pre-selects a household") today requires
touching the Realtime lifecycle code, which is unrelated.

### 🟠 H2. Cache-invalidation graph is hand-maintained in two places

Mutations call `invalidateQueries` for *every* derived cache they touch — for
example `useCopyMealPlan` invalidates `meal-plans`, `plan-streak`, **and**
`ingredient-usage-stats`. The Realtime manager **also** maps tables to query
keys (e.g. `meal_plans` → `meal-plans` + `plan-streak`,
`meal_plan_ingredients` → `meal_plan_ingredients` + `meal_plans`).

**Why it matters:** the next time we add a derived query (say, a "weekly
balance" view), we have to find every mutation and every Realtime case that
might affect it and edit them. There is no single dependency graph that
makes "what does this depend on?" answerable in one place.

### 🟡 M1. `DayDetailView.tsx` (716 LOC) is too big

It currently:

- runs **7 dependent queries** in one component (`useMealPlans`,
  `useDayContexts`, `useDayPlaceholders`, `useMealIdeas`, `useTodos`, two
  `useReactions` calls keyed on derived id arrays);
- holds **8 `useState`s** for modals, edit ids and tray content;
- derives **~10 `useMemo`s** for reaction maps and permission flags.

The reaction queries are downstream of the meal/idea queries (their keys
depend on the loaded ids), which is a small loading waterfall.

**Why it matters:** the file is hard to read, hard to test, and most edits
to it touch unrelated state. Splitting this up — *not* adding a store —
is the fix.

### 🟡 M2. Modal / tray open state is scattered

Each component invents its own `[showXxxTray, setShowXxxTray]` boolean.
There is no shared overlay stack and nothing prevents two trays from being
open at once. Animations and "press back to close" can't be coordinated
globally because the truth lives in many tiny components.

### 🟡 M3. Form state is hand-rolled `useState`

`MealPlanForm`, `AddIngredientForm`, login/register, etc. each manage 3–6
`useState`s for fields plus ad-hoc validation. We don't yet feel this pain
hard, but the next form with cross-field validation will.

### 🟡 M4. No optimistic updates

Every mutation waits for the server. Most actions are tiny so this is fine,
but on flaky mobile connections a thumbs-up takes a visible beat.
TanStack Query's `onMutate` / `onError` rollback pattern is the right tool —
we just haven't picked it up yet.

### 🟢 L1. Prop drilling on navigation handlers

`DayDetailPage → DayDetailView` passes ~9 props, several of which are bound
`navigate(...)` callbacks (`onBack`, `onAddMeal`, `onEditMeal`, `onPrevDay`,
`onNextDay`). It works, but the indirection makes the page component a thin
shell whose only job is to wire `useNavigate` to children.

---

## 4. Would a state management library help?

> **Short answer: no for global app state, possibly yes — narrowly — for two
> specific things.**

Let's evaluate the usual candidates against what's actually painful.

### Redux Toolkit
- **What it gives us:** a single global store, devtools, predictable reducers.
- **What we'd duplicate:** the entire TanStack Query cache (server state) and
  the Realtime invalidation pipeline. RTK Query would be a re-implementation
  of what we already have in TanStack Query.
- **Verdict:** ❌ Not worth it. Heavy, and overlaps with our existing server
  cache.

### Zustand
- **What it gives us:** a tiny (~1 KB) store with hooks, no provider, easy
  subscriptions.
- **Where it would help:** a single shared **overlay/tray store** for M2
  ("only one tray at a time, with a stack and back-button handling"), and
  potentially the **household selection** half of `useHousehold` (split out
  from the realtime/query parts in H1).
- **Where it would hurt:** if we used it for server data we'd be back to two
  sources of truth.
- **Verdict:** 🟡 *Optional*. Reasonable if M2 (overlay stack) gets bad
  enough to be worth a dependency. Not required.

### Jotai / Recoil (atoms)
- **What it gives us:** fine-grained reactive primitives.
- **Where it would help:** nowhere we feel pain today. We don't have many
  derived UI atoms.
- **Verdict:** ❌ Not now.

### React Hook Form / TanStack Form
- **Where it would help:** M3, the next time we build a form that has
  cross-field validation or async validation. Useful, narrow, additive.
- **Verdict:** 🟢 Adopt **when** the next non-trivial form lands, not
  pre-emptively.

### Stay with what we have, but use it better
- **Where it helps:** every other pain point. H1, H2, M1, M4, L1 are all
  refactor problems, not "we need a new tool" problems.
- **Verdict:** ✅ Default choice.

---

## 5. Recommended next steps (in priority order)

These are concrete enough to turn into issues. Each one stands alone — none
of them is a prerequisite for any of the others.

1. **Split `useHousehold` (H1).**
   Extract three pieces:
   - `useMemberships()` — pure TanStack Query hook returning
     `{ households, memberships, isLoading }`.
   - `HouseholdSelectionProvider` — owns *only* `currentHouseholdId` and
     `switchHousehold(id)`. (Persisting the selection across reloads is a
     separate, optional follow-up; the split is valuable on its own.)
   - `useHouseholdRealtime(householdId)` — owns the
     `HouseholdRealtimeManager` lifecycle, lives near the root, has no
     other responsibilities.

   Keep the existing `useHousehold()` as a thin re-export so consumers
   don't churn.

2. **Centralise the cache-invalidation graph (H2).**
   Add `src/lib/queryKeys.ts` with two things:
   - canonical `queryKeys.mealPlans(householdId, ...)` builders so query
     keys are typed and never stringly defined inline;
   - a single `invalidateAfter(table, householdId)` function used by both
     mutations and the Realtime manager, so the "what depends on what"
     graph lives in one place.

3. **Break up `DayDetailView` (M1).**
   Pull each section into its own component (`DayHeader`, `DayMealsList`,
   `DayIdeasList`, `DayTodosList`, `DayContextStrip`). Each one fetches its
   own slice and owns its own modal state. The parent shrinks to layout +
   navigation. No new dependencies needed.

4. **Adopt optimistic updates for the high-frequency mutations (M4).**
   Specifically: `useUpsertReaction` / `useDeleteReaction` (taps on the
   thumbs-up button) and `useCompleteTodo` / `useReopenTodo`. Use TanStack
   Query's `onMutate` / `onError` rollback pattern. Keep the heavier
   mutations (`useCopyMealPlan`, `useSetMealIngredients`) as-is.

5. **Decide the overlay-stack story (M2).**
   Two options, in increasing weight:
   - Cheap: a single `useOverlay()` hook backed by Context that holds
     "which overlay is currently open" as a discriminated union.
     No new dependency.
   - Heavier: introduce Zustand purely for an `overlayStore`. Do this
     **only** if we end up with 3+ stacked overlays or animated
     transitions between them.

6. **(Future) Pick a form library when needed (M3).**
   Don't migrate existing forms. The next time we build a form with
   cross-field validation (e.g. invite-and-set-role, household settings
   with conflicting toggles), reach for React Hook Form.

None of the steps above add a global state library. Each one is small
enough to ship behind its own PR.

---

## 6. Decision log

| Decision | Outcome |
| --- | --- |
| Adopt Redux / RTK Query | ❌ Rejected — overlaps with TanStack Query |
| Adopt Zustand for app-wide state | ❌ Rejected — duplicates server cache |
| Adopt Zustand narrowly (overlay stack) | 🟡 Open — only if step 5 proves the cheap option insufficient |
| Adopt Jotai / Recoil | ❌ Rejected — no atom-shaped pain |
| Adopt a form library | 🟢 Deferred — pick React Hook Form when the next complex form lands |
| Split `useHousehold` | ✅ Recommended (H1) |
| Centralise query-key + invalidation graph | ✅ Recommended (H2) |
| Break up `DayDetailView` | ✅ Recommended (M1) |
| Add optimistic updates for reactions / todos | ✅ Recommended (M4) |

If you make one of these calls differently, please update this document in
the same PR so the next person knows why.
