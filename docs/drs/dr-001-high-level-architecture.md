# DR-001: High-level architecture

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** high-level-architecture

## Context

Planny Planny is a non-production prototype for healthy, baby-led/child-led
family meal planning. It needs: collaborative editing between household
members (so changes must sync between devices in real time), per-household
data isolation, per-email invites, public read-only share links, and the
cheapest possible hosting and operational story — this is a prototype, not
a company.

## Decision

**A statically hosted single-page React app talking directly to Supabase
(managed Postgres + Auth + Realtime + generated REST API). No custom
server, no API layer of our own.**

- **Frontend:** required — a mobile-first React SPA, built to static files
  and hosted on GitHub Pages (see [dr-004-frontend](dr-004-frontend.md),
  [dr-011-hosting-platform](dr-012-hosting-platform.md)).
- **Backend:** required — Supabase. The Postgres schema *is* the API
  (PostgREST); authorisation lives in Row-Level Security policies inside
  the database; sync is Realtime websockets (see
  [dr-002-backend](dr-002-backend.md)).
- **Layers point one way:** UI components → hooks → `src/lib/` services →
  Supabase. Nothing in `lib` imports a component; nothing in `hooks`
  renders UI.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **No backend** (localStorage-only SPA) | Zero ops, zero cost, trivially private | No collaboration between family members — the core feature. No sync across devices | ❌ Rejected |
| **Static API on GitHub Pages** (committed JSON files) | Free, versioned, zero infra | Read-only without a GitHub-token write path; no auth, no per-household isolation, no realtime | ❌ Rejected |
| **Custom backend** (Node/Rails/Django + hosted DB) | Full control | Weeks of auth, API, hosting and ops work for a prototype | ❌ Rejected |
| **Firebase** | Realtime built in, generous free tier | NoSQL data model fights a relational domain (households ↔ meals ↔ ingredients); proprietary lock-in | ❌ Rejected |
| **Supabase** | Real Postgres with SQL we control, RLS in the database, realtime and auth included, open source, runnable locally in Docker | Two-system mental model (Postgres + generated APIs); vendor convenience | ✅ Chosen |

## Consequences

- Security reviews focus on RLS policies, not application code — see
  [`docs/public.md`](../public.md).
- The frontend can never silently drift from the schema: types are
  generated from it (see
  [the walkthrough](../walkthrough/supabase.md)).
- Everything a new decision changes must be recorded as a new DR and
  indexed in [`docs/drs.md`](../drs.md) — DRs are never edited in place.
