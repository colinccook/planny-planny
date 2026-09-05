# Planny Planny — agent instructions

Planny Planny is a **non-production prototype**: a baby-led/child-led
healthy family meal planner. Mobile-first React 19 SPA (Vite, TypeScript
strict, Tailwind v4) on Supabase (Postgres, Auth, RLS, Realtime).

**Orient yourself first:**

- [`docs/drs.md`](../docs/drs.md) — the decision-records index. Check it
  before any architectural choice; never re-litigate a settled DR, and
  never edit one — append a new DR and update the index.
- [`docs/walkthrough/`](../docs/walkthrough/README.md) — how each
  technology works, in depth, with pointers into this codebase. Load the
  chapter you need.
- **Always use the context7 MCP server** for the latest library
  documentation before writing code against an API
  ([dr-011](../docs/drs/dr-011-recommended-mcps.md)).

## How to work

- Always work in a new branch from the latest `main`; open a PR with the
  template at `.github/PULL_REQUEST_TEMPLATE.md`. UI changes require
  mobile-viewport (390×844) screenshots in the PR description.
- Verify CI is green before considering a task done: unit tests run on
  PRs; lint, type-check, BDD and Lighthouse run on `main`
  ([dr-013](../docs/drs/dr-013-continuous-integration.md)).
- For any user-facing change, update the README's feature showcase so it
  reflects every current feature — the README is a showcase for friends,
  colleagues and potential employers
  ([dr-016](../docs/drs/dr-016-readme-as-showcase.md)).

## Engineering rules

- **Clean architecture, one-way layers:** UI components → hooks →
  `src/lib/` services → Supabase. Nothing in `lib` imports a component.
- **Readability over fancy code.**
- **TypeScript strict mode, no `any`.** Regenerate `src/types/database.ts`
  (`supabase gen types typescript`) after migration changes.
- **Migrations are append-only** — never edit an applied file in
  `supabase/migrations/`; add a new one
  ([dr-009](../docs/drs/dr-009-database-schemas.md)).
- **Writes** go through the Supabase REST API (RLS enforces access);
  **reads** are initial REST + Realtime pushes; server state lives only in
  the TanStack Query cache — no global store
  ([walkthrough](../docs/walkthrough/tanstack-query-and-realtime.md)).
- **Test names describe observable behaviour, never implementation**, so
  refactors never force renames.

## Testing requirements

All new functionality must be covered — full guide:
[`docs/walkthrough/bdd-testing.md`](../docs/walkthrough/bdd-testing.md).

1. **Default: integration BDD** — Gherkin in `tests/integration/features/`,
   steps in `tests/integration/steps/`, driving the real app against a
   local Supabase container.
2. **Component BDD** (`tests/component/`) only when the data layer doesn't
   exist yet or the logic is pure — and pair it with an integration test
   once the component is wired up.
3. **Unit tests** (Vitest) for pure logic in `src/lib/`.
4. All tests must build and pass before merge.

## Permissions

Five access levels: Owner, Member, Honoured Guest, Voting Guest, Public.
**Read [`docs/permissions.md`](../docs/permissions.md) before any new
feature.** Use predicates from `src/lib/permissions.ts` — never compare
role strings inline. New capabilities must update: the `ACCESS_LEVELS`
explainer, the BDD matrix
(`tests/component/features/permissions/role-capability-matrix.feature`),
RLS policies (new migration), and BDD scenarios proving each role can /
can't do the thing. Summarise the per-audience decision in the PR
description.

## Conventions

- Mobile-first Tailwind utilities; no custom CSS.
- Households isolate all data; users can belong to many households.
- Sound effects: palette in `src/lib/sounds.ts` via `useSounds()` /
  `playSoundIfEnabled()`; wire new collaboration moments into the
  realtime→sound map in `useHousehold.tsx`; respect the user's
  `sound_effects_enabled` preference; no BDD tests for sounds.
- Cross-device preferences live on the `profiles` row via
  `src/hooks/useUserPreferences.ts` (`last_household_id`,
  `sound_effects_enabled`); device-local state uses `localStorage`.

## Dependency updates

See `AGENTS.md`: LTS-only upgrades, lockfiles and runtime declarations
updated together, full validation before PR.
