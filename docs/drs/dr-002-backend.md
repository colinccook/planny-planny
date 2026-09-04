# DR-002: Backend

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** backend
- **Builds on:** [dr-001-high-level-architecture](dr-001-high-level-architecture.md)

## Context

The prototype needs a backend that provides: real-time collaboration,
relational data (households, members, meals, ingredients), strong
per-household authorisation, email-based auth, and a zero-cost,
zero-ops-hosted option. Typical choices for this kind of project: a static
API on GitHub Pages, Supabase, or no backend at all.

## Decision

**Supabase** — managed Postgres, Auth, PostgREST (generated REST), Realtime
(websockets), RLS, plus Deno Edge Functions for the few things that need
server-side secrets (the ChatGPT plugin OAuth flow).

Data-flow rules:

- **Writes** go through the REST API so RLS is enforced.
- **Reads** are an initial REST load, then Realtime pushes all changes.
- **Auth** is the only REST-only flow (the token must exist before the
  websocket connects).

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **No backend** | Simplest possible; nothing to secure | No multi-user collaboration — kills the product idea | ❌ Rejected |
| **Static API on GitHub Pages** | Free; deploys with the frontend | Read-only; no auth or RLS; invites/outcomes/reactions impossible | ❌ Rejected |
| **Supabase** | Real Postgres; RLS enforced in the database; realtime out of the box; runs locally in Docker for dev and CI; free tier | Managed-service dependency; the `anon` key is public by design so RLS must be right | ✅ Chosen |
| **Firebase** | Realtime and auth out of the box | NoSQL model fits relations badly; proprietary; weak story for SQL-style constraints | ❌ Rejected |
| **Custom API (Node/Express + Postgres)** | Total flexibility | We would hand-build auth, authorisation, realtime and hosting — months of non-prototype work | ❌ Rejected |

## Consequences

- The database schema is the API contract; see
  [dr-008-database-schemas](dr-009-database-schemas.md).
- All authorisation logic is duplicated deliberately: predicates in
  `src/lib/permissions.ts` for the UI, RLS policies in
  `supabase/migrations/` for enforcement — kept in lockstep by the
  role-capability BDD matrix.
- Local and CI environments run the *same* stack in Docker, so tests are
  high-fidelity (see [dr-005-running-locally](dr-005-running-locally.md)).
