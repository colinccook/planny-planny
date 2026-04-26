# Skeleton Strategy

This document is the answer to a recurring question:

> Should every component that has a loadable state own its own skeleton
> appearance and animate itself from "loading" → "loaded", or should
> skeletons live as separate, configurable components?

Planny Planny picks a **middle path**: a small library of **shared
skeleton building blocks** that each page composes into a layout-matched
`XSkeleton` placeholder, with **`AnimatePresence` handling the
loading → ready transition at the page level**. This doc explains why,
and what to do when you add a new loadable view.

If you only read one section, read [The pattern](#the-pattern).

---

## TL;DR

- **Building blocks are shared** — `src/components/ui/Skeleton.tsx`
  exports primitives (`SkeletonBlock`, `SkeletonCard`) and a few
  layout-specific shapes (`SkeletonDayRow`, `SkeletonMealCard`,
  `SkeletonSettingsCard`, `SkeletonFormField`).
- **Composition lives next to the page** — every page that loads data
  defines a small `XSkeleton()` function in the same file that arranges
  the blocks to mirror its loaded layout (see `CalendarPage`,
  `DayDetailPage`, `MealFormPage`, `SettingsPage`).
- **Transitions are uniform** — `<AnimatePresence mode="wait">` swaps
  the skeleton and the content with a short fade, so every page feels
  the same.
- **Real components stay lean** — `DayDetailView`, `MealForm`,
  `IngredientList`, etc. only render the **loaded** state. They never
  branch on `isLoading`.

---

## The pattern

```tsx
// MyPage.tsx
import { AnimatePresence, motion } from 'framer-motion'
import { SkeletonBlock, SkeletonCard } from '../components/ui/Skeleton'

function MyPageSkeleton() {
  // Mirror the loaded layout with the shared blocks.
  return (
    <div className="space-y-4 p-4" data-testid="my-page-skeleton">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
    </div>
  )
}

export default function MyPage() {
  const { data, isLoading } = useMyData()

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <MyPageSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <MyPageContent data={data} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

Three rules:

1. **Skeleton lives with the page**, not with the leaf component, so the
   leaf component has exactly one rendering path.
2. **Match the layout, not the values.** The skeleton should occupy
   roughly the same vertical space and shape as the loaded content so
   the page does not jump when data arrives.
3. **One transition style** — the cross-fade above. Don't invent new
   ones per page; uniformity is part of the perceived polish.

---

## Why not "every component owns its skeleton"?

The issue suggested that, e.g., a meal-card component could pretend to
have 1–2 fake meals while loading, then animate itself into the real
state. It's a tempting idea, but in practice it has costs we don't want
to pay:

- **Component bloat.** Each component would need to know about three
  states (skeleton, animating-in, ready), thread an `isLoading` prop,
  and own enter/exit animation logic. Most of our components have no
  business knowing they're loading — they just render the data they're
  given.
- **Two sources of truth for layout.** A "self-skeletonising" component
  has to keep its skeleton markup in sync with its real markup forever.
  When we tweak spacing or add a row, we have to change two places. The
  shared-blocks pattern makes the skeleton an explicit, separate
  artefact next to the page so the drift is at least visible.
- **Inconsistent feel.** If every component animates itself in
  individually, you get a popcorn effect: ten little pieces fading in
  at slightly different times. A single page-level cross-fade is
  calmer and reads as one transition.
- **Harder testing.** Components that branch on `isLoading` need tests
  for both branches. Keeping the skeleton at page level means leaf
  components stay pure functions of their props.

So the answer to "is that bloat a good thing or a bad thing?" — for
this codebase, it's a bad thing, and we deliberately avoid it.

---

## Why not "one fully-configurable skeleton component"?

The other extreme — a single `<Skeleton kind="meal-card" />` mega-component
driven by a `kind` prop — also doesn't pull its weight. It would have
to grow a new branch every time a layout changes, and the call-site
becomes a magic string instead of explicit JSX. The current set of
small named exports (`SkeletonMealCard`, `SkeletonDayRow`, …) gives the
same reuse with a much friendlier API.

When we genuinely need a generic shape, we use the primitives:
`SkeletonBlock` for "a pulsing rectangle of size X" and `SkeletonCard`
for "a card with N lines".

---

## "Skeleton vs animating-in vs ready" — where do those live?

The issue asked whether we can split components by lifecycle phase
(skeleton / animating in / loaded). We do, but the split is **not at
the leaf-component boundary** — it's at the page boundary:

| Phase           | Lives in                                         |
| --------------- | ------------------------------------------------ |
| Skeleton        | `XSkeleton()` function inside the page file      |
| Animating in    | `<motion.div>` wrappers around skeleton/content  |
| Loaded / ready  | The real feature components (`DayDetailView`, …) |

That keeps each piece focused: building blocks are dumb shapes,
`XSkeleton` is dumb layout, `motion.div` is dumb animation, and the
feature components are pure UI for loaded data.

---

## Adding a new loadable view — checklist

1. Build the loaded view first as a normal component that takes its
   data via props. **Do not** branch on `isLoading` inside it.
2. In the page file, write an `XSkeleton()` that uses the shared blocks
   to roughly match the loaded layout (same rough heights, same number
   of cards).
3. Wrap both in `<AnimatePresence mode="wait">` with the standard
   skeleton/content `motion.div` pair (copy from `SettingsPage` or
   `DayDetailPage`).
4. If none of the existing blocks match the shape you need, **first**
   try composing `SkeletonBlock` / `SkeletonCard`. Only add a new
   named export to `src/components/ui/Skeleton.tsx` if the shape is
   reused on more than one page.
5. Add a `data-testid="x-skeleton"` to the skeleton wrapper so tests
   can assert "we showed a skeleton then swapped to content" without
   coupling to Tailwind classes.

---

## Where to look in the code

- Building blocks: [`src/components/ui/Skeleton.tsx`](../src/components/ui/Skeleton.tsx)
- Example page-level skeletons:
  [`src/pages/CalendarPage.tsx`](../src/pages/CalendarPage.tsx),
  [`src/pages/DayDetailPage.tsx`](../src/pages/DayDetailPage.tsx),
  [`src/pages/MealFormPage.tsx`](../src/pages/MealFormPage.tsx),
  [`src/pages/SettingsPage.tsx`](../src/pages/SettingsPage.tsx)
