# TanStack Query & Realtime — state management

> **TL;DR** — Server state is owned by Postgres and cached in
> [TanStack Query](https://tanstack.com/query), kept fresh by Supabase
> Realtime. Auth/session and cross-cutting UI state live in a handful of
> focused React Contexts. There is intentionally **no global state
> library** (Redux/Zustand/Jotai) — the reasoning and the decision log are
> at the bottom of this chapter.

## TanStack Query: the server-state cache

TanStack Query (formerly React Query) wraps `fetch`-style functions and
caches their results in memory, keyed on a `queryKey`. You write
declarative hooks and the library handles loading, error, refetch and
caching.

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

- **Caching** — calling `useMealPlans` from two components only fires one
  HTTP request; both components subscribe to the same cache entry.
- **Loading + error** — `result.isLoading`, `result.error`, `result.data`.
- **Invalidation** — call `queryClient.invalidateQueries({ queryKey })`
  and the matching cache entries refetch automatically.
- **Background refetch on window focus** — handled out of the box.

Mutations (writes) live in `useMutation`. They typically:

1. Run a `mutationFn` that talks to Supabase REST.
2. On success (`onSuccess`), call `invalidateAfter(...)` so any affected
   cache entries refetch.
3. Optionally, run `onMutate` to update the cache *optimistically* before
   the server responds (see below).

## The four kinds of state

When something on screen changes, ask **where does the truth live?**
There are four answers:

| Kind | Examples | Lives in |
| --- | --- | --- |
| **Server state** | meals, ideas, todos, reactions, ingredients, memberships | TanStack Query cache, kept fresh by realtime |
| **Auth / session state** | current user, JWT, current household id | React Context (`useAuth`, `useHousehold`) |
| **Cross-cutting UI state** | toasts, header overrides, "which tray is open" | React Context (`useToast`, `useHeaderOverride`, `useOverlay`) |
| **Local UI state** | form inputs, scroll positions | Component `useState` |

Server state is owned by Postgres and synced over realtime, so we **never**
copy it into a global store — that would create two competing sources of
truth. Device-local persistence (e.g. dismissed store-cupboard items) uses
`localStorage` via `useSyncExternalStore`.

## The `queryKeys` module: one place for the dependency graph

`src/lib/queryKeys.ts` is the single most important file to understand if
you're adding a new query. It does two things.

### Canonical key builders

```ts
queryKeys.mealPlans('hh-1', '2026-01-01', '2026-01-07')
// → ['meal-plans', 'hh-1', '2026-01-01', '2026-01-07']

queryKeys.reactions('hh-1', 'meal_idea', ['idea-1', 'idea-2'])
// → ['reactions', 'hh-1', 'meal_idea', 'idea-1', 'idea-2']
```

The first segment is the cache "namespace"; the second is always the
household id, so realtime can fan out invalidations along the same axis as
RLS.

### The invalidation graph

When a row in `meal_plans` changes, several caches may now be stale (the
meal plans themselves, plus anything derived from them like the plan
streak). That dependency graph lives in exactly one place — the
`invalidateAfter(qc, table, householdId)` function:

```ts
invalidateAfter(queryClient, 'meal_plans', 'hh-1')
// invalidates ['meal-plans', 'hh-1'] and everything derived from it
```

Every mutation calls it on success; the realtime manager calls it on every
websocket event, so the graph cannot drift between the two. To add a new
derived query you only have to update the `INVALIDATIONS` map in
`queryKeys.ts` and every consumer benefits.

## Realtime: how the WebSocket keeps every tab in sync

`src/lib/realtime.ts` exports `HouseholdRealtimeManager`. There is exactly
one alive at a time, owned by the `useHouseholdRealtime` hook mounted
inside `HouseholdProvider`.

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

## Optimistic updates: making the UI feel instant

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
the snapshot already contains the optimistic value and the rollback is a
no-op — an easy mistake, which is why both the reactions and todos tests
have a "rolls back if the server rejects" case.

Heavier mutations (`useCopyMealPlan`, `useSetMealIngredients`, meal
create/update/delete) remain non-optimistic — the user already expects a
brief save spinner for those.

## Why no global state library?

This stack was reviewed properly (the findings and refactors are recorded
in the decision log below). The short version:

1. **Almost all "state" is server state.** TanStack Query is purpose-built
   for that shape; a client-side store would create two sources of truth
   for things Postgres already authoritatively owns.
2. **The realtime fan-out is naturally household-scoped.** Every query key
   starts with the household id and the realtime manager invalidates along
   the same axis — exactly what the per-household RLS model needs.
3. **Truly global UI state is small.** Auth, current household, toasts,
   header overrides, calendar swipe direction — a handful of
   `Context.Provider`s is well within React's comfort zone.

The candidates, evaluated:

| Library | Verdict |
| --- | --- |
| Redux / RTK Query | ❌ Rejected — overlaps with TanStack Query; RTK Query would re-implement our existing cache |
| Zustand (app-wide) | ❌ Rejected — duplicates the server cache |
| Zustand (narrowly, overlay stack) | ❌ Not needed — `useOverlay` + Context covers it |
| Jotai / Recoil | ❌ Rejected — no atom-shaped pain |
| A form library (React Hook Form) | 🟢 Deferred — adopt when the next form with cross-field validation lands; don't migrate existing forms pre-emptively |

## Decision log

| Decision | Outcome |
| --- | --- |
| Adopt Redux / RTK Query | ❌ Rejected — overlaps with TanStack Query |
| Adopt Zustand for app-wide state | ❌ Rejected — duplicates server cache |
| Adopt Zustand narrowly (overlay stack) | ❌ Not needed — `useOverlay` Context covers it |
| Adopt Jotai / Recoil | ❌ Rejected — no atom-shaped pain |
| Adopt a form library | 🟢 Deferred — pick React Hook Form when the next complex form lands |
| Split `useHousehold` into `useMemberships` + `useHouseholdRealtime` + provider | ✅ Implemented |
| Centralise query-key + invalidation graph in `queryKeys.ts` | ✅ Implemented |
| Break up `DayDetailView` into per-section components | ✅ Implemented |
| Add overlay coordination (`useOverlay` + `OverlayProvider`) | ✅ Implemented |
| Add optimistic updates for reactions / todos | ✅ Implemented |

If you make one of these calls differently, update this document in the
same PR so the next person knows why.

Next: [React Router](react-router.md)
