# DR-006: Unit testing

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** unit-testing

## Context

Pure logic — date math, the AI prompt builder, permission predicates,
optimistic-cache rollback — needs fast, precise tests that run anywhere
in milliseconds.

## Decision

**Vitest + React Testing Library**, with test files beside the code
(`src/lib/dates.ts` → `src/lib/dates.test.ts`). Runs as `npm test`
(`vitest run`); a dedicated PR workflow
(`.github/workflows/pr-tests.yml`) executes it on every pull request
into `main`.

Conventions:

- Unit tests are for **pure logic only** — anything user-facing defaults
  to integration BDD instead.
- **Test names describe observable behaviour, never implementation**, so a
  refactor never forces a rename: `it('rolls back the cache when the
  server rejects')`, not `it('calls restoreSnapshot in onError')`.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Vitest** | Same transform pipeline as Vite; zero extra config; fast watch mode; Jest-compatible API | Younger than Jest | ✅ Chosen |
| **Jest** | The incumbent; huge ecosystem | Duplicates Vite's transform config; slower; ESM friction | ❌ Rejected |
| **Node's built-in test runner** | No dependency | No jsdom, weaker assertion/mocking ergonomics for React hooks | ❌ Rejected |

## Consequences

- `npm test` stays under a few seconds, so it can gate every PR cheaply
  while the heavier suites run on `main`.
- Walkthrough: [`docs/walkthrough/testing.md`](../walkthrough/testing.md).
