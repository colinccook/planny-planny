# Error Boundaries

This document is the answer to a recurring question:

> Where do error boundaries live in this app, and what do I have to do
> when I add a new page or a new data-fetching component?

Planny Planny uses **per-route error boundaries** wired in once at the
shell level, plus a **single shared `ErrorBoundary` component** that you
can drop in around any sub-tree you want to isolate. Almost all the time
the shell-level wiring is enough and you don't need to do anything.

If you only read one section, read [The pattern](#the-pattern).

---

## TL;DR

- **Shared component** — `src/components/ui/ErrorBoundary.tsx`. Class
  component with `getDerivedStateFromError` / `componentDidCatch`,
  renders a friendly fallback (`data-testid="error-boundary-fallback"`)
  with the error message and a **Reload page** button. Takes an
  optional `area` prop used in the fallback copy.
- **Wired in once** — `src/components/layout/AppShell.tsx` wraps the
  page content (`{children}`) in `<ErrorBoundary key={pathname} />`.
  The key makes the boundary reset whenever the route changes, so a
  fallback only sticks on the page that actually broke.
- **Unauthenticated routes are wrapped too** — in `src/App.tsx`, the
  `/login`, `/register`, `/invite/:token` and `/shared/:token` routes
  each have their own `<ErrorBoundary>` because they render outside the
  shell.
- **You usually don't add new boundaries.** The page-level boundary is
  enough for 99% of cases. Add a nested `<ErrorBoundary area="…">`
  inside a page only when you want to isolate a single card so that one
  broken widget doesn't take the rest of the page with it (see
  `SettingsPage` for the canonical example).
- **Loading states are the sibling concern** and live in
  [`skeleton-strategy.md`](./skeleton-strategy.md). Every page that
  reads data shows a skeleton while it loads; every page is wrapped in
  an error boundary in case it throws.

---

## The pattern

### Page-level (free, already wired)

```tsx
// src/components/layout/AppShell.tsx (excerpt)
<main className="flex-1 pb-safe-tab-bar">
  <ErrorBoundary key={location.pathname} area={location.pathname}>
    {children}
  </ErrorBoundary>
</main>
```

Because the boundary is keyed on `location.pathname`, React unmounts and
remounts it on every navigation. That means:

- A broken page shows its fallback only as long as the user is on it.
- Navigating away (via the tab bar or back button) clears the error.
- A broken page can't poison subsequent pages.

You get this for free for every authenticated page. **Do not** add
your own outer `<ErrorBoundary>` around a page that's already mounted
inside `AppShell` — that's just noise.

### Isolating a section inside a page

When a page has several independent cards and one broken card
shouldn't blank the rest, wrap that subtree explicitly. Use a clear
`area` so the fallback copy reads naturally:

```tsx
// SettingsPage.tsx (excerpt)
<ErrorBoundary area="Settings">
  <AnimatePresence mode="wait">
    {/* skeleton / content cross-fade */}
  </AnimatePresence>
</ErrorBoundary>
```

For a single risky widget you can scope it more tightly:

```tsx
<ErrorBoundary area="Plan streak badge">
  <PlanStreakBadge />
</ErrorBoundary>
```

Rule of thumb: **isolate only when the surrounding UI is still useful
without this piece.** If the whole page is meaningless without the
data, let the page-level boundary handle it — there's nothing to
preserve.

---

## Pairing with skeletons

Error boundaries and skeletons answer two different questions:

| Question                       | Mechanism            | Owned by                                  |
| ------------------------------ | -------------------- | ----------------------------------------- |
| "What does the user see while  | `XSkeleton()`        | The page (see `skeleton-strategy.md`)     |
| the data is loading?"          | + `<AnimatePresence>` |                                           |
| "What does the user see if the | `<ErrorBoundary>`    | The shell (per-route) and, occasionally,  |
| render throws?"                |                      | the page (to isolate one section)         |

Both must be present for every data-fetching view:

- The skeleton hides the empty state while TanStack Query is fetching.
- The boundary catches the case where the render itself blows up
  (bad data, a thrown selector, a missing prop after a migration).

Together they mean a user never sees a blank page or a stack trace.

---

## Adding a new loadable view — checklist

This is the merged checklist. Tick all four items.

1. **Loading**: write an `XSkeleton()` in the page file and cross-fade
   it with `<AnimatePresence>`. Full rules in
   [`skeleton-strategy.md`](./skeleton-strategy.md).
2. **Errors (page level)**: nothing to do — the boundary in
   `AppShell` already wraps your page. The user will see the standard
   "Something went wrong loading `<path>`" fallback if the render
   throws.
3. **Errors (isolated section, optional)**: if your page has several
   independent cards and one broken card shouldn't blank the rest,
   wrap that subtree in `<ErrorBoundary area="…">` with a friendly
   area label. Otherwise skip.
4. **Tests**: BDD scenarios for the loaded state are the default
   (see `.github/copilot-instructions.md`); the error fallback itself
   is covered by `src/components/ui/ErrorBoundary.test.tsx`, you
   don't need to retest it per page.

---

## Why a class component?

React still requires a class for `componentDidCatch` /
`getDerivedStateFromError`. There is no equivalent hook yet. We keep
the class as small as possible (state is `{ error: Error | null }`,
one render branch) and never extend it — extra behaviour goes in
wrappers, not in the class itself.

---

## Where to look in the code

- Component: [`src/components/ui/ErrorBoundary.tsx`](../src/components/ui/ErrorBoundary.tsx)
- Tests: [`src/components/ui/ErrorBoundary.test.tsx`](../src/components/ui/ErrorBoundary.test.tsx)
- Per-route wiring: [`src/components/layout/AppShell.tsx`](../src/components/layout/AppShell.tsx)
- Public/auth wiring: [`src/App.tsx`](../src/App.tsx)
- Example isolated section boundary: [`src/pages/SettingsPage.tsx`](../src/pages/SettingsPage.tsx)
- Sibling doc: [`skeleton-strategy.md`](./skeleton-strategy.md)
