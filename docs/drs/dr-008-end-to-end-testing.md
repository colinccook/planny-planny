# DR-008: End-to-end testing

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** end-to-end-testing

## Context

We still need a thin layer that proves whole journeys work for real — and
a place to specify UI contracts *before* the data layer exists.

## Decision

**The integration BDD suite *is* the end-to-end suite** — it drives real
Chromium (mobile viewport 390×844, touch) through the real app, real Auth,
real REST writes through real RLS, and real Realtime subscriptions.

Alongside it, a deliberately lighter **component BDD suite**
(`tests/component/`): the same Playwright + playwright-bdd engine against
in-step HTML harnesses (`page.setContent`) or pure logic (the
role-capability matrix), with no backend. Rules:

- Component tests are for UI contracts spec'd before the data layer
  exists, or pure logic with no DOM.
- Every harness-tested behaviour must be paired with an integration
  scenario as soon as the component is wired up; harnesses are a waypoint,
  not a destination.
- The two suites run as separate Playwright projects and separate CI jobs,
  so a broken harness fails in seconds without paying the Supabase boot
  cost.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Integration suite doubles as e2e + a harness suite for early specs** | One engine to learn; full-stack fidelity where it counts; fast contract tests where it doesn't | Harnesses can drift from real components (mitigated by pairing rule) | ✅ Chosen |
| **Separate heavyweight e2e stack** (staging env, seeded cloud project) | Closest possible to prod | Enormous cost and flake for a prototype; duplicates the integration suite | ❌ Rejected |
| **Storybook-driven component tests** | Nice visual docs | Adds a second component toolchain; our harnesses are already executable specs | ❌ Rejected |
| **No harnesses, integration only** | One suite, no drift risk | Can't spec UI contracts before the backend exists; slows early design | ❌ Rejected |

## Consequences

- Full rationale, limitations and "which tool for which job" cheat-sheet:
  [`docs/walkthrough/bdd-testing.md`](../walkthrough/bdd-testing.md).
