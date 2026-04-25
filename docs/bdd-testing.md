# BDD Testing — How It Works and Why You Can Trust It

Planny Planny uses **[playwright-bdd](https://vitalets.github.io/playwright-bdd/)**
on top of Playwright to drive its BDD test suite. Specs are written as
Gherkin `.feature` files; the steps that drive them are TypeScript files
sitting beside them.

The suite is split into **two BDD projects with different guarantees**:

| Project | Lives in | Drives | Needs Supabase? |
|---|---|---|---|
| **integration** | `tests/integration/` | The real React app on the Vite dev server, talking to a local Supabase container | **Yes** (`supabase start`) |
| **component** | `tests/component/` | In-step HTML/JS harnesses mounted with `page.setContent`, plus one pure-logic suite that doesn't touch the DOM at all | No |

Both projects emulate a mobile viewport (390×844, touch enabled) and are
defined as separate Playwright projects in
[`playwright.config.ts`](../playwright.config.ts) so they can be run,
reported on, and gated independently.

If you've ever opened a step file and wondered _"why is there a giant blob of
HTML in here?"_ — this is the document for you.

---

## TL;DR

| Question | Answer |
|---|---|
| What runs the tests? | `npx playwright test` (via `npm run test:e2e`, `test:integration`, or `test:component`), with feature files compiled to Playwright tests by `bddgen`. |
| What browser? | Chromium, in mobile emulation (390×844, touch enabled). One viewport, both projects. We are mobile-first. |
| Where does the **app** run? | For integration tests: the real Vite dev server (`npm run dev`) on `http://localhost:5173`, started automatically by Playwright's `webServer`. The actual React 19 + TypeScript bundle is loaded into the browser. Component tests don't load the app at all — they `page.setContent(HTML)` directly. |
| Where does the **backend** run? | A real local **Supabase container stack** (Postgres + Auth + Realtime + Storage + Kong), started by the Supabase CLI (`supabase start`) before the integration suite runs. CI applies the full `supabase/migrations/` history with `supabase db reset`. The component suite never talks to it. |
| So is it real e2e? | The **integration** suite is, for the journeys it covers (auth, calendar, household, invites, ingredients, permissions). The **component** suite is deliberately not — see [Component tests](#component-tests-tests-component) below for what it tests, why, and the limitations you take on. |

---

## Test architecture

### The whole stack, top to bottom

```
┌──────────────────────────────────────────────────────────────────┐
│  .feature files (Gherkin)                                        │
│      ▲                                                           │
│      │  bddgen compiles features → Playwright test files         │
│      ▼                                                           │
│  step definitions (TypeScript)                                   │
│      ▲                                                           │
│      │  drives                                                   │
│      ▼                                                           │
│  Playwright + Chromium (mobile viewport, touch emulation)        │
│      ▲                                                           │
│      │                                                           │
│      ├── integration project:                                    │
│      │     HTTP / WebSocket                                      │
│      │     ▼                                                     │
│      │   Vite dev server → React 19 app ── REST + Realtime ──► Supabase │
│      │                                                          (Postgres,│
│      │                                                           Auth,   │
│      │                                                           Realtime│
│      │                                                           RLS)    │
│      │                                                                  │
│      └── component project:                                      │
│            page.setContent(<hand-written HTML>)                  │
│            (no dev server hit, no Supabase)                      │
└──────────────────────────────────────────────────────────────────┘
```

### Configuration

[`playwright.config.ts`](../playwright.config.ts) wires this together with:

- **Two `defineBddConfig` calls.** One scoped to
  `tests/integration/{features,steps}/**`, one scoped to
  `tests/component/{features,steps}/**`. Each generates into its own
  `.features-gen/` subdirectory so they never clash.
- **Two `projects` entries** (`integration` and `component`) using the same
  Mobile Chrome viewport. `--project=integration` and `--project=component`
  let you run them in isolation.
- **A shared `webServer`** that runs `npm run dev`. Integration tests need
  it for `page.goto`; the component suite uses it only because one harness
  (`calendar-scroll-memory`) does a single `page.goto('/login')` to obtain
  a real origin so `sessionStorage` is accessible. No component test relies
  on app behaviour beyond that.
- `viewport: 390×844`, `isMobile: true`, `hasTouch: true` — the suite is
  mobile-first by default. If a step depends on hover or pointer behaviour,
  it explicitly uses `page.mouse` (touch is the default).
- `retries: 1` in CI, `0` locally. `screenshot: 'only-on-failure'` and
  `trace: 'on-first-retry'` give you a video-quality post-mortem when CI
  goes red.

### CI

[`.github/workflows/ci-deploy.yml`](../.github/workflows/ci-deploy.yml) runs
the two suites in **separate jobs in parallel** so a broken harness fails
fast without paying the Supabase boot cost:

- **`component-tests`** job — installs deps, runs `npm run test:component`.
  No Supabase. Finishes in well under a minute. Caches the Playwright
  browser between runs.
- **`test`** job — installs deps, builds the app, starts Supabase
  (`supabase start`), applies every migration in `supabase/migrations/`
  with `supabase db reset` (with up to 3 retries), then runs
  `npm run test:integration`. On failure the full HTML report is uploaded
  as the `playwright-report` artifact for 7 days.
- **`lint`** runs alongside both. `migrate` (only on `main`) gates on all
  three.

You can reproduce CI locally:

```bash
npm run test:component                      # no Supabase needed
npx supabase start && npx supabase db reset # once, when migrations change
npm run test:integration                    # full integration suite
npm run test:e2e                            # both, end to end
```

---

## The two suites

### Integration tests (`tests/integration/`)

These steps drive the **actual React app** running in the dev server, talking
to a **real Supabase container**. They are full-stack, full-fidelity tests
that exercise:

- the real React component tree
- the real React Router routes
- the real Supabase JS client
- real Auth (sign-up, sign-in, session cookies)
- real REST writes hitting real RLS policies in Postgres
- real Realtime subscriptions over WebSockets

You can spot them by their step files: every Given/When verb uses
`page.goto(...)` and the app's real selectors. Examples:

- [`tests/integration/steps/auth.steps.ts`](../tests/integration/steps/auth.steps.ts) — registration & login
- [`tests/integration/steps/calendar.steps.ts`](../tests/integration/steps/calendar.steps.ts) — protected-route guard
- [`tests/integration/steps/day-detail.steps.ts`](../tests/integration/steps/day-detail.steps.ts) — day view rendering
- [`tests/integration/steps/household.steps.ts`](../tests/integration/steps/household.steps.ts) — household settings
- [`tests/integration/steps/invite.steps.ts`](../tests/integration/steps/invite.steps.ts) — per-email invite flow
- [`tests/integration/steps/store-cupboard-nav.steps.ts`](../tests/integration/steps/store-cupboard-nav.steps.ts) — store-cupboard nav

These tests are the gold standard. **Always prefer this style for new
features.** If a regression here passes, you have very high confidence the
feature works in production.

### Component tests (`tests/component/`)

The component suite covers two slightly different flavours of "no backend":

1. **HTML harness scenarios.** Most component step files mount a
   hand-written HTML/JS fixture into the page using `page.setContent(HTML)`
   instead of navigating to the live app. The harness reproduces a single
   component's DOM structure, classes, ARIA attributes and interaction
   behaviour, and the BDD steps then exercise it exactly as they would the
   real component.
2. **Pure-logic scenarios.** [`role-capability-matrix.feature`](../tests/component/features/permissions/role-capability-matrix.feature)
   doesn't touch the DOM at all — it asserts every role × capability
   directly through the predicates in [`src/lib/permissions.ts`](../src/lib/permissions.ts).
   It lives here because, like the harnesses, it has no backend dependency
   and runs in milliseconds. So in this codebase **"component" means "no
   backend"** rather than strictly "DOM harness".

You can spot the harness scenarios with:

```bash
grep -l "page.setContent" tests/component/steps/*.ts
```

#### Why do the harnesses exist?

Mostly historical: many of these features were specified — by Gherkin —
before the React component, the data model, or the RLS policy existed. The
harness let us pin down the **interaction contract** (what a long-press
opens, how the picker dismisses, when the count goes bold) without first
having to wire up Supabase fixtures, seeded users, and a path through the
app to reach the component.

Two pragmatic reasons they have stuck around:

1. **Speed and isolation.** A harness test boots in a few hundred
   milliseconds because it doesn't wait for Vite, React hydration, an auth
   round-trip, or a Realtime subscription. A flaky component-suite test
   almost always means a genuine logic bug, not a network race.
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

- Pairing every harness-tested behaviour with at least one **integration**
  scenario that lands the user on a page where the component is rendered
  for real (e.g. day-detail tests render real meal cards with real
  reaction buttons against real meal-plan data).
- Sharing `data-testid` names between the real component and the harness
  so a global rename will fail loudly in both places.
- Treating new harness tests as a code-review smell. **The default for new
  work is an integration test**; only add a harness if you have a specific
  reason (e.g. you're spec'ing a component before the data layer exists).

#### Direction of travel

The intent is to **migrate harness tests to integration tests over time**,
as seeding helpers and reusable login fixtures grow. None of the harness
tests should be considered the final answer for production confidence.

---

## How we keep the suite trustworthy

A test suite is only as useful as the trust you have in its green checkmark.
These are the deliberate choices that keep it honest:

1. **Real Supabase, every integration run.** CI never mocks Supabase. The
   same Postgres schema, the same RLS policies, the same Auth flow, the
   same Realtime server you ship to production are what the integration
   tests run against.
2. **Migrations are exercised end-to-end.** `supabase db reset` re-applies
   every migration in `supabase/migrations/` from scratch on every CI run,
   so a broken migration breaks the test job, not production.
3. **No cross-test state leaks.** Tests that need data either create it
   inside the scenario or rely on `supabase/seed.sql`. There is no shared
   mutable fixture across scenarios.
4. **Mobile-first by default.** The Playwright projects emulate an iPhone-
   sized viewport with touch enabled. Tests that need pointer/mouse events
   call `page.mouse.*` explicitly so the requirement is visible.
5. **Permissions are double-locked.**
   [`tests/component/features/permissions/role-capability-matrix.feature`](../tests/component/features/permissions/role-capability-matrix.feature)
   asserts every role × capability through the real predicates in
   [`src/lib/permissions.ts`](../src/lib/permissions.ts), and RLS is
   exercised by the integration tests above. UI predicates and database
   policies cannot drift apart silently.
6. **Failures are debuggable.** On retry, Playwright captures a trace; on
   any failure it captures a screenshot. CI uploads the full HTML report
   as an artifact. You don't have to re-run locally to find the cause.
7. **Flakes are treated as bugs.** `retries: 1` exists for transient
   network blips against a containerised stack — it is not a license to
   merge a 50/50 test.
8. **Suites are isolated in CI.** A broken harness can't gate the
   integration job, and a broken integration test can't gate the
   harness job. Each tells you exactly what's wrong.

---

## How to add a new BDD test

The full process when adding a new feature:

1. **Pick the suite.** Default to **integration** — write the Gherkin in
   `tests/integration/features/<area>/<thing>.feature`. Only put a test in
   `tests/component/features/...` if you're spec'ing a UI contract for a
   component that doesn't exist yet (and plan to add an integration test
   as soon as the component is wired up), or if it's pure logic with no
   backend like the role-capability matrix.
2. **Write the Gherkin.** It should describe user-visible behaviour, not
   implementation. Reuse existing Given steps where you can — they're the
   seam between scenarios.
3. **Wire up steps** in the matching `tests/<suite>/steps/<thing>.steps.ts`:
   - For integration: `await page.goto('/...')`, log in via the existing
     auth steps if needed, drive the real UI with `page.getByRole`,
     `page.getByTestId`, etc.
   - For a component harness: follow the pattern in
     [`reaction-button.steps.ts`](../tests/component/steps/reaction-button.steps.ts).
4. **If the feature touches data**, add a `supabase/migrations/*.sql`
   migration so CI's `db reset` exercises it.
5. **If the feature touches permissions**, add a row per role to
   [`role-capability-matrix.feature`](../tests/component/features/permissions/role-capability-matrix.feature)
   and a predicate in [`src/lib/permissions.ts`](../src/lib/permissions.ts) —
   see [`docs/permissions.md`](permissions.md) for the full process.
6. **Run it locally:**
   ```bash
   npm run test:component         # fast, no Supabase
   npx supabase start             # once per machine
   npx supabase db reset          # whenever migrations change
   npm run test:integration       # real-app suite
   npm run test:e2e               # both
   npm run test:e2e:ui            # interactive Playwright UI mode
   ```
7. **CI is the source of truth.** Watch the PR's `component-tests` and
   `test` jobs; if either is red, download the `playwright-report`
   artifact for traces and screenshots.

### A note on shared step phrases

A handful of generic Gherkin phrases (e.g. `Then I should see ...`) might
make sense in both suites. playwright-bdd resolves steps **per project**,
so each suite is self-contained — duplicate the small generic ones rather
than introducing a shared `steps/` directory. That keeps "is this step
real or harness?" unambiguous when you open a file.

---

## Cheat-sheet: which tool for which job?

| You want to test… | Use |
|---|---|
| A user journey (sign up → create meal → it appears for a household member in realtime) | **Integration BDD** (`page.goto`) against local Supabase |
| Whether RLS lets/blocks a role | **Integration BDD** as the affected role; back it up with the role-capability matrix |
| A pure utility/predicate (`canEditMeals`, date math, prompt builder) | **Vitest unit test** |
| A pure-UI gesture you're spec-ing _before_ the data wiring exists | **Component BDD** harness, with a planned follow-up integration scenario |
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

**"Why not run integration tests against a hosted Supabase project?"**
Hosted projects share state across runs and require credentials in CI. The
local container is disposable, deterministic, and free.

**"Should I add a new component-suite test?"** Almost always: **no**.
Default to integration. Reach for a component harness only when you need
to specify a UI contract for a component that doesn't exist yet, and plan
to back it up with an integration scenario as soon as the component is
wired up.
