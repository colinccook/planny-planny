# Planny Planny — AI Instructions

## Testing Requirements

All new functionality **must** be covered by appropriate tests:

1. **BDD Integration Tests** (preferred): Write Gherkin `.feature` files in `tests/integration/features/` with step definitions in `tests/integration/steps/`. These drive the real React app against a local Supabase container via Playwright + playwright-bdd. **Default to this style** for any user-facing feature.
2. **BDD Component Tests** (only when the data layer doesn't exist yet, or for pure logic): `.feature` files in `tests/component/features/` with step definitions in `tests/component/steps/`. These use `page.setContent` HTML harnesses (or no DOM at all, like the role-capability matrix) and never touch Supabase. If you add a component test for a UI contract, **pair it with an integration test as soon as the component is wired up**.
3. **Unit Tests**: For pure logic (utilities, computations), unit tests with Vitest are acceptable.
4. **All tests must build and pass** before a PR can be merged.
5. **README update check is required**: for any user-facing functionality change, review `README.md` and update it when needed.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS (mobile-first)
- **Backend**: Supabase (Auth, Postgres, RLS, Realtime)
- **State**: TanStack Query + Supabase Realtime (WebSocket subscriptions)
- **Routing**: React Router v7
- **BDD Tests**: Playwright + playwright-bdd (Gherkin features)
- **CI**: GitHub Actions with local Supabase instance

## Architecture

- **Realtime-first**: After authentication, all data flows through Supabase Realtime WebSocket subscriptions. Auth is the only REST-only flow.
- **Writes**: Go through Supabase REST API (for RLS enforcement), with optimistic UI updates.
- **Reads**: Initial load via REST, then Realtime subscriptions push all changes.
- **RLS**: Row-Level Security on all tables. Check policies in `supabase/migrations/`.

## Project Structure

- `src/components/` — React components organized by feature (auth, calendar, ingredients, settings, layout)
- `src/hooks/` — Custom React hooks (useAuth, useHousehold, useMealPlans, useIngredients)
- `src/lib/` — Supabase client, query helpers, Realtime subscription manager
- `src/pages/` — Page-level components
- `src/types/` — TypeScript types (database schema types)
- `supabase/migrations/` — Database migrations (ordered)
- `tests/integration/features/` — Gherkin BDD feature files for real-app + Supabase tests
- `tests/integration/steps/` — Step definitions for integration tests
- `tests/component/features/` — Gherkin BDD feature files for HTML-harness / pure-logic tests (no backend)
- `tests/component/steps/` — Step definitions for component tests
- `tests/support/` — Test fixtures and helpers shared by both suites

## Branching & Pull Requests

- **Always work in a new branch** — never commit directly to `main`. Create a descriptive feature branch (e.g., `feat/number-stepper`, `fix/swipe-dismiss`) before making changes.
- **Always branch from the latest `main`** — run `git fetch origin main` and create your branch from `origin/main` to avoid stale bases.
- **Create a Pull Request** for every change. Push the branch and open a PR against `main`.
- **Screenshots are required** for any PR that adds or changes UI functionality. Capture at mobile viewport (390×844) using Playwright or browser dev tools.
- **Always include screenshots in the PR description** when UI changes are present.
- Use the PR template at `.github/PULL_REQUEST_TEMPLATE.md`.
- Include a Screenshots section with images showing the new/changed views.
- **Verify CI passes** — after pushing, poll the PR's check runs (lint, test) until they complete. If any check fails, read the job logs, fix the issue, and push again. Do not consider the task done until all checks are green.

## Permissions / Access Levels

This app has **five access levels**: Owner, Member, Honoured Guest, Voting Guest, and Public. The full architecture — TypeScript module, React patterns, RLS layer — is documented in [`docs/permissions.md`](../docs/permissions.md). **Read it before adding any new feature.**

For every new feature request you must:

1. **Summarise the access levels** in the PR description and decide, for each of the five audiences, whether the feature is allowed.
2. **Use the predicates in `src/lib/permissions.ts`** (e.g. `canEditMeals`, `canVote`, `canInviteMembers`) — never compare role strings inline. Add a new predicate if no existing one fits.
3. **Update the explainer content** in `ACCESS_LEVELS` (in `src/lib/permissions.ts`) so the "What do these levels mean?" tray reflects the new capability.
4. **Update the BDD matrix** at `tests/component/features/permissions/role-capability-matrix.feature` with a row per role for the new capability.
5. **Update RLS** in a new `supabase/migrations/*.sql` file if the feature touches data — the predicates and the policies must agree.
6. **Add BDD scenarios** verifying the right roles can do the new thing and the wrong roles cannot.

## Conventions

- Mobile-first design: always design for small screens first, then add breakpoints for larger ones.
- Use Tailwind utility classes, avoid custom CSS.
- Use TypeScript strict mode. No `any` types.
- Supabase types are in `src/types/database.ts` — regenerate with `supabase gen types typescript`.
- Each household is isolated: ingredients, meal plans, settings are household-scoped.
- Users can belong to multiple households.

## Sound Effects

The app plays subtle, friendly UI sounds (synthesised on the fly via Web Audio in `src/lib/sounds.ts` — no audio files). Users can opt out via the "Sound effects" toggle in Settings; the preference is stored on `profiles.sound_effects_enabled` and defaults to `true`.

For every new feature, decide whether it should make a sound and, if so, **wire it in**:

1. **Pick from the existing palette** in `src/lib/sounds.ts` (`swish`, `pop`, `done`, `react`, `update`) when one fits. Add a new entry only if no existing sound captures the moment — keep it short (< 250 ms), quiet (peak gain < 0.1), and friendly (sine/triangle waves, major intervals).
2. **Sync sounds with animations** so they feel like one effect, not two (e.g. `swish` plays the moment a swipe commits, in time with the slide).
3. **Use the right entry point**:
   - In components: `const { play } = useSounds()` then `play('pop')`. The hook respects the user's opt-out automatically.
   - In non-component modules (mutation `onMutate`, etc.): `playSoundIfEnabled('done')` from `src/lib/sounds`.
4. **Realtime events**: `useHousehold` already routes Supabase `postgres_changes` payloads to the sound layer. Hook into that map (in `useHousehold.tsx`) for new tables rather than wiring sounds at every call site.
5. **Don't overdo it**: collaboration signals (new meal/idea/todo, reactions, completions) deserve a sound. Background bookkeeping (membership churn, household metadata edits, deletes) should stay silent.
6. **No BDD tests for sounds.** Sounds are an audio-only side effect and intentionally outside the BDD coverage. Pure unit tests for the sound palette and any new gating logic are welcome.

## User Preferences

Preferences that should follow a user across devices live on the `profiles` row and are read/written through `src/hooks/useUserPreferences.ts`. Anything device-local (scroll position, expanded sections, etc.) belongs in `localStorage`, not on `profiles`. The current preferences are:

- `last_household_id` — remembers which household the user was in so the app drops them straight back into it on the next sign-in (anywhere).
- `sound_effects_enabled` — see "Sound Effects" above.
