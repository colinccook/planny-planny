# React

The UI is [React 19](https://react.dev/): the whole app is a tree of
components — functions that take props and return markup. When state
changes, React re-renders the affected components.

## The pieces we use

- **Components** — e.g. `src/components/calendar/MealCard.tsx` renders one
  meal. Reusable presentational primitives (Tray, ReactionButton,
  NumberStepper, Skeleton blocks) live in `src/components/ui/`.
- **Hooks** — functions starting with `use` that add state or behaviour to
  a component. Our shared data hooks live in `src/hooks/`
  (`useAuth`, `useHousehold`, `useMealPlans`, `useMealIdeas`, `useTodos`,
  `useIngredients`, …) and mostly wrap TanStack Query.
- **Context** — a way to provide a value to a whole subtree without passing
  props through every level. Auth, household selection, toasts, header
  overrides, calendar swipe direction and overlay state are each a small
  focused context — there is intentionally no global state library
  (see [TanStack Query & Realtime](tanstack-query-and-realtime.md)).
- **Local state** — plain `useState` inside a component for form inputs,
  scroll positions, and other things only that component cares about.

## Trays, modals and the `useOverlay` hook

A "tray" is a sheet that slides up from the bottom of the screen — see
`src/components/ui/Tray.tsx`. The day detail screen has several (add idea,
idea detail, AI prompt, copy meal) and exactly one of them should be
visible at a time.

`useOverlay(id)` (`src/components/ui/OverlayProvider.tsx`) gives you the
same ergonomics as `useState<boolean>` but routes the state through a
shared store, so opening overlay B closes overlay A:

```tsx
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

## Where things live

- **Pure logic** with no React → `src/lib/`, unit-tested with Vitest.
- **Shared hooks or contexts** → `src/hooks/`.
- **Reusable presentational widgets** → `src/components/ui/`.
- **Feature components** → `src/components/<feature>/`.
- **Page-level components** → `src/pages/`.

Next: [Vite](vite.md)
