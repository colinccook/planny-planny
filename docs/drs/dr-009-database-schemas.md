# DR-009: Database schemas

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** database-schemas

## Context

The schema is the API contract (PostgREST) and the security boundary
(RLS). It must evolve safely across laptops, CI and production.

## Decision

**Versioned SQL migrations in `supabase/migrations/`, applied in filename
order; append-only — never edit an applied migration.** Tables are
household-scoped, every table enables RLS, constraints (foreign keys with
`on delete cascade`, `unique`, `check`) live in the database rather than
the UI, and `src/types/database.ts` is regenerated from the schema with
`supabase gen types typescript`.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Append-only SQL migrations + generated types** | Reviewable diffs; deterministic replays in CI; the frontend can't drift from the schema (build fails) | Raw SQL to write; regeneration step to remember | ✅ Chosen |
| **Dashboard / GUI schema editing** | Fast to click around | No reviewable history; environments diverge silently | ❌ Rejected |
| **ORM-managed models + migrations** (Prisma/Drizzle) | Types without a codegen step | A second schema source of truth fighting Supabase's; RLS still needs raw SQL | ❌ Rejected |
| **NoSQL document store** | Schemaless flexibility | The domain is deeply relational (households ↔ members ↔ meals ↔ ingredients); constraints would move into app code | ❌ Rejected |

## Consequences

- In-depth Postgres walkthrough with examples from these migrations:
  [`docs/walkthrough/supabase.md`](../walkthrough/supabase.md).
- The public (anonymous) surface of the schema is audited in
  [`docs/public.md`](../public.md) and must be updated with any new
  public endpoint.
