# Testing with Vitest (unit tests)

The project has three layers of automated tests, in increasing weight:

| Layer | Tool | Lives in | Backend? |
| --- | --- | --- | --- |
| **Unit** | Vitest + React Testing Library | `*.test.ts(x)` beside the code (e.g. `src/lib/dates.test.ts`) | No |
| **Component BDD** | Playwright + playwright-bdd | `tests/component/` | No |
| **Integration BDD** | Playwright + playwright-bdd | `tests/integration/` | Yes (local Supabase) |

This chapter covers the Vitest layer. For the two BDD layers, read
[BDD Testing](bdd-testing.md).

## When to write a unit test

Unit tests are for **pure logic**: utilities in `src/lib/` (date math, the
prompt builder, clipboard helpers, permission predicates) and behaviours
that are awkward to assert through the DOM (e.g. cache rollback after an
optimistic mutation rejects).

**Default to integration BDD for anything user-facing.** If you're
reaching for a unit test for a user-visible behaviour, pause and check
whether an integration scenario would cover it more honestly.

## Running them

```bash
npm test            # run once (this is what CI runs on PRs)
npm run test:watch  # watch mode during development
```

## Conventions

- Test files sit next to the code they test: `dates.ts` → `dates.test.ts`.
- **Test names describe observable behaviour, not implementation** — a
  good name survives a refactor. `it('rolls back the cache when the server
  rejects')` will still be right after you restructure the hook;
  `it('calls restoreSnapshot in onError')` will not.
- Pure helpers need no DOM. For hook-level tests use React Testing Library
  with jsdom (configured in `vite.config.ts`).

Next: [BDD Testing](bdd-testing.md)
