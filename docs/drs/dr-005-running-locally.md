# DR-005: Running locally

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** running-locally

## Context

A new contributor (or an AI agent) should go from `git clone` to a working
app with a real backend in minutes, without cloud accounts or shared
state.

## Decision

**Supabase CLI (Docker containers) for the backend + the Vite dev server
for the frontend.** No bespoke Docker Compose file: the CLI already
orchestrates the exact container stack (Postgres, Auth, Realtime, Storage,
Kong) that production uses.

The canonical steps live in [README.md](../../README.md#-running-locally):

```bash
npm install
npx supabase start        # full local backend in Docker; applies all migrations
cp .env.example .env      # defaults match the local instance
npx supabase db reset     # re-apply migrations (when they change)
npm run dev               # http://localhost:5173
```

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Supabase CLI + Vite** | One command boots the real stack; identical to CI and prod; migrations auto-applied | Requires Docker | ✅ Chosen |
| **Hand-written Docker Compose** | Explicit, tool-agnostic | Duplicates what the CLI maintains; drifts from the real Supabase images | ❌ Rejected |
| **Hosted dev project** | No Docker needed | Shared mutable state between developers; needs credentials; integration tests become non-deterministic | ❌ Rejected |
| **Mocks / in-memory fakes** | Fast, no Docker | Tests stop testing RLS, Auth and Realtime — the riskiest parts | ❌ Rejected |

## Consequences

- The only prerequisites are Node 24 (`.nvmrc`) and Docker.
- CI uses the identical `supabase start` path, so "works on my machine"
  and "works in CI" are the same statement.
