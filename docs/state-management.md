# State Management Review

This document is a snapshot review of how state is managed in the Planny Planny
React app, where it used to hurt, and what we've done about it. It originally
recommended a series of refactors; those refactors have now landed (see the
"Update — implemented" notes inline). It still serves as a shared baseline so
future contributors don't reach for Zustand / Redux / Jotai / etc. without good
reason.

> **TL;DR** — The current stack (TanStack Query + a small set of focused React
> Contexts + Supabase Realtime) is the *right shape* for this app. We do **not**
> need a global state library. The pain points were not "we need Redux", they
> were "a handful of components and one provider had grown too much". The
> targeted refactors at the bottom of this doc addressed them with the tools we
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

Concrete inventory (post-refactor):

- **24 hooks in `src/hooks/`**, the majority being TanStack Query wrappers
  (`useMealPlans`, `useMealIdeas`, `useTodos`, `useIngredients`,
  `useDayPlaceholders`, `usePlanStreak`, plus the household-shaped trio
  `useMemberships`, `useHouseholdRealtime`, `useHousehold`).
- **6 React Contexts**: `AuthContext`, `HouseholdContext`, `OverlayContext`,
  `ToastContext`, `HeaderOverrideContext`, `CalendarDirectionContext`.
- **1 Realtime subscription manager** (`src/lib/realtime.ts`,
  `HouseholdRealtimeManager`) that turns Postgres change events into
  `invalidateAfter(...)` calls via the centralised dependency graph in
  `src/lib/queryKeys.ts`.
- **1 query-key + invalidation graph module** (`src/lib/queryKeys.ts`) used
  by every mutation `onSuccess` and the realtime manager so the dependency
  graph lives in one place.
- **Optimistic updates** for reactions (`useUpsertReaction`,
  `useDeleteReaction`) and todo tick / un-tick (`useCompleteTodo`,
  `useReopenTodo`). Other mutations remain non-optimistic by design.
- **No `useReducer` anywhere** in `src/`.
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

### 🟠 ~~H1. `useHousehold` is doing three jobs at once~~ ✅ Implemented

`src/hooks/useHousehold.tsx` used to mix the membership query, selection
state, and the realtime lifecycle. It is now a thin composition of three
single-purpose pieces:

- `useMemberships()` (`src/hooks/useMemberships.ts`) — TanStack Query for
  the user's memberships, returns `{ households, memberships, isLoading }`.
- `useHouseholdRealtime(householdId)` (`src/hooks/useHouseholdRealtime.ts`) —
  owns the `HouseholdRealtimeManager` lifecycle, has no other responsibilities.
- `HouseholdProvider` (`src/hooks/useHousehold.tsx`) — owns selection state
  and persistence to localStorage, composes the two hooks above.

`useHousehold()` is preserved as the public API, plus a new `memberships`
field. Components that only need a list of households can import
`useMemberships` directly.

### 🟠 ~~H2. Cache-invalidation graph is hand-maintained in two places~~ ✅ Implemented

The dependency graph now lives in **one** place: `src/lib/queryKeys.ts`.

- `queryKeys.mealPlans(householdId, ...)` etc. are the canonical builders;
  every mutation, every realtime channel, and every test uses them.
- `invalidateAfter(qc, table, householdId)` is the single source of truth for
  "what cached queries are stale after a row in `table` changed?". Both
  mutation `onSuccess` callbacks **and** the realtime websocket handler call
  it, so the graph cannot drift between the two.

Adding a derived query (e.g. a "weekly balance" view) is now a one-line
edit in `INVALIDATIONS`.

### 🟡 ~~M1. `DayDetailView.tsx` (716 LOC) is too big~~ ✅ Implemented

`DayDetailView` is now ~200 LOC of layout + cross-section coordination. The
per-section concerns live in their own files:

- `DayHeaderStrip` — pure presentational header badges.
- `DayEventsSection` — events list + add-event flow.
- `DayIdeasSection` — ideas list + add-idea tray + idea-detail tray, owns
  its own `useReactions` query for `meal_idea` targets.
- `DayMealsSection` — meals list + AI prompt tray + copy-meal tray, owns
  its own `useReactions` query for `meal_plan` targets.

`thumbsByIdeaId` (the only piece of derived data shared between the meals
and ideas sections) lives in `src/components/calendar/dayIdeas.ts` so each
section can import it without depending on the other. TanStack Query's
cache dedupes the duplicate `useReactions(meal_idea, ideaIds)` call that
the parent issues alongside the section.

### 🟡 ~~M2. Modal / tray open state is scattered~~ ✅ Implemented (cheap option)

We took the cheap option from the original recommendation: a single
`useOverlay(id)` hook backed by `OverlayProvider`
(`src/components/ui/OverlayProvider.tsx`). Only one overlay can ever be
open at a time — opening a second one closes the first.

`DayDetailView`'s four trays (add idea, idea detail, AI prompt, copy meal)
all route through it. We did **not** add Zustand: the heavier option from
the original doc remains deferred unless we end up with stacked overlays
or animated transitions between overlays.

### 🟡 M3. Form state is hand-rolled `useState`

`MealPlanForm`, `AddIngredientForm`, login/register, etc. each manage 3–6
`useState`s for fields plus ad-hoc validation. We don't yet feel this pain
hard, but the next form with cross-field validation will.

### 🟡 ~~M4. No optimistic updates~~ ✅ Implemented (for high-frequency mutations)

Reactions (`useUpsertReaction`, `useDeleteReaction`) and todo
tick / un-tick (`useCompleteTodo`, `useReopenTodo`) now use TanStack
Query's `onMutate` / `onError` rollback pattern.

The cache is updated optimistically by walking every matching
`['reactions', householdId, targetType, ...]` (or `['todo-items',
householdId, ...]`) entry, snapshotting the previous value, and
applying the edit. On error we restore the snapshot; on settle we
invalidate so the optimistic placeholder is swapped for the real
server row (with a server-issued id and joined profile).

Heavier mutations (`useCopyMealPlan`, `useSetMealIngredients`,
meal create/update/delete) remain non-optimistic — the user already
expects a brief save spinner for those.

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

## 5. Recommended next steps

Status as of the most recent state-management refactor PR:

1. **Split `useHousehold` (H1).** ✅ **Done.** See H1 above.
2. **Centralise the cache-invalidation graph (H2).** ✅ **Done.** See H2
   above. Lives in `src/lib/queryKeys.ts`.
3. **Break up `DayDetailView` (M1).** ✅ **Done.** See M1 above.
4. **Adopt optimistic updates for the high-frequency mutations (M4).**
   ✅ **Done** for reactions and todo tick/un-tick. Other mutations remain
   non-optimistic by design.
5. **Decide the overlay-stack story (M2).** ✅ **Done** with the cheap
   option (`useOverlay` + `OverlayProvider`). Zustand was not adopted.
6. **(Future) Pick a form library when needed (M3).**
   Don't migrate existing forms. The next time we build a form with
   cross-field validation (e.g. invite-and-set-role, household settings
   with conflicting toggles), reach for React Hook Form.

None of the above adds a global state library. Each one shipped behind
its own diff inside one PR.

---

## 6. Decision log

| Decision | Outcome |
| --- | --- |
| Adopt Redux / RTK Query | ❌ Rejected — overlaps with TanStack Query |
| Adopt Zustand for app-wide state | ❌ Rejected — duplicates server cache |
| Adopt Zustand narrowly (overlay stack) | ❌ Not needed — `useOverlay` Context covers it |
| Adopt Jotai / Recoil | ❌ Rejected — no atom-shaped pain |
| Adopt a form library | 🟢 Deferred — pick React Hook Form when the next complex form lands |
| Split `useHousehold` (H1) | ✅ Implemented |
| Centralise query-key + invalidation graph (H2) | ✅ Implemented |
| Break up `DayDetailView` (M1) | ✅ Implemented |
| Add overlay coordination (M2, cheap option) | ✅ Implemented |
| Add optimistic updates for reactions / todos (M4) | ✅ Implemented |

If you make one of these calls differently, please update this document in
the same PR so the next person knows why.
