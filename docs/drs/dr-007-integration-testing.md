# DR-007: Integration testing

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** integration-testing

## Context

The riskiest behaviour in this app lives at the seams: RLS policies, Auth,
Realtime fan-out, and multi-role permissions. Mocking those away would
test the mocks, not the product.

## Decision

**Playwright + playwright-bdd (Gherkin) driving the real React app against
a real local Supabase container** — the default, preferred place to test
any user-facing feature. Features live in `tests/integration/features/`,
steps in `tests/integration/steps/`; CI never mocks Supabase, and applies
every migration from scratch on each run.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Real app + local Supabase container** | Tests the exact stack shipped to prod, including RLS and websockets; disposable and deterministic | Slower than mocks; needs Docker | ✅ Chosen |
| **Mock the Supabase client** | Fast | Tests our guesses about Supabase, not Supabase; RLS untested | ❌ Rejected |
| **Hosted Supabase test project** | No containers in CI | Shared state across runs; credentials in CI; flaky and non-deterministic | ❌ Rejected |
| **Cypress / WebdriverIO** | Mature | Playwright gives first-class mobile emulation, parallelism, traces and a single-binary setup that matches CI; playwright-bdd keeps Gherkin thin | ❌ Rejected |

## Consequences

- A green integration suite is high-confidence evidence the feature works
  in production.
- The suite's guarantees, harness rules and CI wiring are documented in
  [`docs/walkthrough/bdd-testing.md`](../walkthrough/bdd-testing.md).
