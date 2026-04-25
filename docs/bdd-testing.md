# BDD Testing — How It Works and Why You Can Trust It

Planny Planny uses **[playwright-bdd](https://vitalets.github.io/playwright-bdd/)**
on top of Playwright to drive its end-to-end test suite. Specs are written as
Gherkin `.feature` files in [`tests/features/`](../tests/features), and the steps
that drive them live in [`tests/steps/`](../tests/steps).

This document explains exactly what those tests do, where they run, what they
test against, and the trade-offs behind the patterns you'll find in the suite.
If you've ever opened a step file and wondered _"why is there a giant blob of
HTML in here?"_ — this is the document for you.

---

## TL;DR

| Question | Answer |
|---|---|
| What runs the tests? | `npx playwright test` (via `npm run test:e2e`), with feature files compiled to Playwright tests by `bddgen`. |
| What browser? | Chromium, in mobile emulation (390×844, touch enabled). One project; we are mobile-first. |
| Where does the **app** run? | The real Vite dev server (`npm run dev`) on `http://localhost:5173`, started automatically by Playwright's `webServer`. The actual React 19 + TypeScript bundle is loaded into the browser. |
| Where does the **backend** run? | A real local **Supabase container stack** (Postgres + Auth + Realtime + Storage + Kong), started by the Supabase CLI (`supabase start`) before tests run. CI applies the full `supabase/migrations/` history with `supabase db reset`. |
| So is it real e2e? | Yes for the majority of journeys (auth, calendar, household, invites, ingredients, permissions). A subset of feature-level UI behaviours are still tested against in-step HTML harnesses — see [HTML harness tests](#2-html-harness-tests-page-setcontent) below for what they are and why. |

---

## Test architecture

### The whole stack, top to bottom

```
┌──────────────────────────────────────────────────────────────────┐
│  .feature files (Gherkin)              tests/features/**/*.feature
│      ▲                                                            │
│      │  bddgen compiles features → Playwright test files          │
│      ▼                                                            │
│  step definitions (TypeScript)         tests/steps/**/*.ts        │
│      ▲                                                            │
│      │  drives                                                    │
│      ▼                                                            │
│  Playwright + Chromium (mobile viewport, touch emulation)         │
│      ▲                                                            │
│      │  HTTP / WebSocket                                          │
│      ▼                                                            │
│  Vite dev server  →  React 19 app  ──── REST + Realtime ────►  Supabase  │
│                                                                  (Postgres,│
│                                                                   Auth,   │
│                                                                   Realtime,│
│                                                                   RLS)    │
└──────────────────────────────────────────────────────────────────┘
```

### Configuration

- **Test runner config:** [`playwright.config.ts`](../playwright.config.ts)
  - `defineBddConfig({ features: 'tests/features/**/*.feature', steps: 'tests/steps/**/*.ts' })`
    wires Gherkin features to TypeScript step definitions.
  - `webServer` runs `npm run dev` and waits for `http://localhost:5173` —
    Playwright will reuse a running dev server locally and start a fresh one
    in CI.
  - `viewport: 390×844`, `isMobile: true`, `hasTouch: true` — the suite is
    mobile-first by default. If a step depends on hover or pointer behaviour,
    it explicitly uses `page.mouse` (touch is the default).
  - `retries: 1` in CI, `0` locally. `screenshot: 'only-on-failure'` and
    `trace: 'on-first-retry'` give you a video-quality post-mortem when CI
    goes red.

- **CI workflow:** [`.github/workflows/ci-deploy.yml`](../.github/workflows/ci-deploy.yml)
  spins up a real Supabase stack and runs the full suite against it:
  1. `supabase start` — starts the full Supabase Docker stack.
  2. `supabase db reset` (with up to 3 retries) — applies every migration in
     `supabase/migrations/` plus `supabase/seed.sql`.
  3. `npx playwright install --with-deps chromium`.
  4. `npx bddgen` — compiles `.feature` files into Playwright test files.
  5. `npx playwright test` — runs them, with `VITE_SUPABASE_URL` /
     `VITE_SUPABASE_ANON_KEY` pointed at the local stack.
  6. On failure, the full HTML report is uploaded as the
     `playwright-report` artifact for 7 days.

You can reproduce CI locally with the same commands (after `npm install`,
`npx supabase start`, `npx supabase db reset`).

---

## The two kinds of tests in the suite

The step files in `tests/steps/` fall into two distinct patterns. **Both** are
valid, but they test very different things and you should be deliberate about
which one you reach for when adding new tests.

### 1. Real-app end-to-end tests (preferred)

These steps drive the **actual React app** running in the dev server, talking
to a **real Supabase container**. They are full-stack, full-fidelity tests
that exercise:

- the real React component tree
- the real React Router routes
- the real Supabase JS client
- real Auth (sign-up, sign-in, session cookies)
- real REST writes hitting real RLS policies in Postgres
- real Realtime subscriptions over WebSockets

**Where to find them:** any step file whose Given/When verbs use `page.goto(...)`
and the app's real selectors. Examples:

- [`tests/steps/auth.steps.ts`](../tests/steps/auth.steps.ts) — registration & login
- [`tests/steps/calendar.steps.ts`](../tests/steps/calendar.steps.ts) — protected-route guard
- [`tests/steps/day-detail.steps.ts`](../tests/steps/day-detail.steps.ts) — day view rendering
- [`tests/steps/household.steps.ts`](../tests/steps/household.steps.ts) — household settings
- [`tests/steps/invite.steps.ts`](../tests/steps/invite.steps.ts) — per-email invite flow
- [`tests/steps/store-cupboard.steps.ts`](../tests/steps/store-cupboard.steps.ts) — store-cupboard nav

These tests are the gold standard. **Always prefer this style for new
features.** If a regression here passes, you have very high confidence the
feature works in production.

### 2. HTML harness tests (`page.setContent`)

A subset of step files mount a **hand-written HTML/JS fixture** into the
page using `page.setContent(HTML)` instead of navigating to the live app.
The harness reproduces a single component's DOM structure, classes, ARIA
attributes and interaction behaviour, and the BDD steps then exercise it
exactly as they would the real component.

You can spot them with:

```bash
grep -l "page.setContent" tests/steps/*.ts
```

At time of writing this includes:
[`reaction-button`](../tests/steps/reaction-button.steps.ts),
[`tray`](../tests/steps/tray.steps.ts),
[`headcount`](../tests/steps/headcount.steps.ts),
[`headcount-forms`](../tests/steps/headcount-forms.steps.ts),
[`day-swipe-navigation`](../tests/steps/day-swipe-navigation.steps.ts),
[`calendar-direction`](../tests/steps/calendar-direction.steps.ts),
[`calendar-scroll-memory`](../tests/steps/calendar-scroll-memory.steps.ts),
[`copy-move-meal`](../tests/steps/copy-move-meal.steps.ts),
[`delete-meal`](../tests/steps/delete-meal.steps.ts),
[`magic-wand-prompt`](../tests/steps/magic-wand-prompt.steps.ts),
[`meal-reactions`](../tests/steps/meal-reactions.steps.ts),
[`idea-reactions`](../tests/steps/idea-reactions.steps.ts).

#### Why do they exist?

Mostly historical: many of these features were specified — by Gherkin —
before the React component, the data model, or the RLS policy existed. The
harness let us pin down the **interaction contract** (what a long-press
opens, how the picker dismisses, when the count goes bold) without first
having to wire up Supabase fixtures, seeded users, and a path through the
app to reach the component.

Two pragmatic reasons they have stuck around:

1. **Speed and isolation.** A harness test boots in a few hundred
   milliseconds because it doesn't wait for Vite, React hydration, an auth
   round-trip, or a Realtime subscription. A flaky test from the harness
   tier almost always means a genuine logic bug, not a network race.
2. **Pure-UI coverage.** Some scenarios (gesture mechanics, tray
   open/close, picker keyboard behaviour) are about the DOM and pointer
   events themselves, not about how data flows in. A harness test gives a
   clean signal for "is this widget behaving the way the spec demands?"

#### What's the catch?

A harness only tests the harness. **It does not catch drift between the
hand-written fixture and the real React component.** If a developer renames
a `data-testid`, removes an ARIA label, or changes a class name in the real
component but forgets to update the harness, the harness test will keep
passing while the real UI breaks.

That is a real, honest limitation. We mitigate it by:

- Pairing every harness-tested behaviour with at least one **real-app**
  scenario that lands the user on a page where the component is rendered
  for real (e.g. day-detail tests render real meal cards with real
  reaction buttons against real meal-plan data).
- Sharing `data-testid` names between the real component and the harness
  so a global rename will fail loudly in both places.
- Treating new harness tests as a code-review smell. **The default for new
  work is a real-app test**; only add a harness if you have a specific
  reason (e.g. you're spec-ing a component before the data layer exists).

#### Direction of travel

The intent is to **migrate harness tests to real-app tests over time**, as
seeding helpers and reusable login fixtures grow. None of the harness tests
should be considered the final answer for production confidence.

---

## How we keep the suite trustworthy

A test suite is only as useful as the trust you have in its green checkmark.
These are the deliberate choices that keep it honest:

1. **Real Supabase, every run.** CI never mocks Supabase. The same Postgres
   schema, the same RLS policies, the same Auth flow, the same Realtime
   server you ship to production are what the tests run against.
2. **Migrations are exercised end-to-end.** `supabase db reset` re-applies
   every migration in `supabase/migrations/` from scratch on every CI run,
   so a broken migration breaks the test job, not production.
3. **No cross-test state leaks.** Tests that need data either create it
   inside the scenario or rely on `supabase/seed.sql`. There is no shared
   mutable fixture across scenarios.
4. **Mobile-first by default.** The Playwright project emulates an iPhone-
   sized viewport with touch enabled. Tests that need pointer/mouse events
   call `page.mouse.*` explicitly so the requirement is visible.
5. **Permissions are double-locked.**
   [`tests/features/permissions/role-capability-matrix.feature`](../tests/features/permissions/role-capability-matrix.feature)
   asserts every role × capability through the real predicates in
   [`src/lib/permissions.ts`](../src/lib/permissions.ts), and RLS is
   exercised by the real-app tests above. UI predicates and database
   policies cannot drift apart silently.
6. **Failures are debuggable.** On retry, Playwright captures a trace; on
   any failure it captures a screenshot. CI uploads the full HTML report
   as an artifact. You don't have to re-run locally to find the cause.
7. **Flakes are treated as bugs.** `retries: 1` exists for transient
   network blips against a containerised stack — it is not a license to
   merge a 50/50 test.

---

## How to add a new BDD test

The full process when adding a new feature:

1. **Write the Gherkin** in `tests/features/<area>/<thing>.feature`. Gherkin
   should describe user-visible behaviour, not implementation. Reuse
   existing Given steps where you can — they're the seam between scenarios.
2. **Wire up steps** in `tests/steps/<thing>.steps.ts`:
   - For new features, **prefer a real-app test**: `await page.goto('/...')`,
     log in via the existing auth steps if needed, drive the real UI with
     `page.getByRole`, `page.getByTestId`, etc.
   - If you genuinely need a harness (e.g. a brand-new pure-UI gesture
     before the data layer exists), follow the pattern in
     [`reaction-button.steps.ts`](../tests/steps/reaction-button.steps.ts)
     and **add a follow-up real-app scenario** that covers the same
     behaviour against the real component.
3. **If the feature touches data**, add a `supabase/migrations/*.sql`
   migration so CI's `db reset` exercises it.
4. **If the feature touches permissions**, add a row per role to
   [`role-capability-matrix.feature`](../tests/features/permissions/role-capability-matrix.feature)
   and a predicate in [`src/lib/permissions.ts`](../src/lib/permissions.ts) —
   see [`docs/permissions.md`](permissions.md) for the full process.
5. **Run it locally:**
   ```bash
   npx supabase start            # once per machine
   npx supabase db reset         # whenever migrations change
   npm run test:e2e              # full suite
   npm run test:e2e:ui           # interactive Playwright UI mode
   ```
6. **CI is the source of truth.** Watch the PR's `test` job; if it's red,
   download the `playwright-report` artifact for traces and screenshots.

---

## Cheat-sheet: which tool for which job?

| You want to test… | Use |
|---|---|
| A user journey (sign up → create meal → it appears for a household member in realtime) | **Real-app BDD** (`page.goto`) against local Supabase |
| Whether RLS lets/blocks a role | **Real-app BDD** as the affected role; back it up with the role-capability matrix |
| A pure utility/predicate (`canEditMeals`, date math, prompt builder) | **Vitest unit test** |
| A pure-UI gesture you're spec-ing _before_ the data wiring exists | **HTML harness BDD**, with a planned follow-up real-app scenario |
| Visual regressions / screenshots for the README | Playwright with `page.screenshot()`, manually curated |

---

## FAQ

**"Aren't BDD tests just slow unit tests?"** They can be, if you write them
that way. Treat each scenario as a user-observable acceptance criterion, not
a function-level assertion, and they earn their cost.

**"Why not Cypress / WebdriverIO?"** Playwright gives us first-class mobile
emulation, parallelism, traces, and a single-binary setup that already
matches our CI. `playwright-bdd` keeps the Gherkin layer thin without
dragging in a second test runner.

**"Why not run against a hosted Supabase project?"** Hosted projects share
state across runs and require credentials in CI. The local container is
disposable, deterministic, and free.

**"Should I add a new harness test?"** Almost always: **no**. Default to a
real-app test. Reach for a harness only when you need to specify a UI
contract for a component that doesn't exist yet, and plan to back it up
with a real-app scenario as soon as the component is wired up.
