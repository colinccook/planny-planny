# DR-004: Frontend

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** frontend
- **Builds on:** [dr-001-high-level-architecture](dr-001-high-level-architecture.md)

## Context

The interface is used by tired parents on phones, mid-shop or mid-cooking.
It must be mobile-first, instant-feeling (optimistic taps, swipe gestures,
subtle sound), and buildable to static files for free hosting. The team is
a single developer plus AI agents, so mainstream, well-documented tools
matter more than novelty.

## Decision

**A statically hosted React 19 SPA: Vite + TypeScript (strict) + Tailwind
CSS v4 + TanStack Query + React Router v7 + framer-motion.**

- TypeScript strict mode, no `any`; database types generated from the
  schema (`src/types/database.ts`).
- Tailwind utility classes, mobile-first; no custom CSS.
- TanStack Query is the only client-side cache of server state — no Redux/
  Zustand/Jotai (the review and decision log live in
  [`docs/walkthrough/tanstack-query-and-realtime.md`](../walkthrough/tanstack-query-and-realtime.md)).

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **React SPA (Vite)** | Huge ecosystem and docs; easy static hosting; agents know it well; Vite is fast and minimal | Client-side only — no SEO, no server rendering (irrelevant behind a login) | ✅ Chosen |
| **Vue / Svelte** | Simpler mental models; less boilerplate | Smaller ecosystems; less agent training data; no compensating benefit for us | ❌ Rejected |
| **Next.js / Remix (SSR)** | SEO, server rendering, API routes | We have no public content to index and no server to run; SSR is pure overhead here | ❌ Rejected |
| **Plain JavaScript (no TypeScript)** | Zero compile step | A schema-driven app without generated types drifts from the database silently | ❌ Rejected |
| **CSS Modules / styled-components** | Scoped styles | More files and indirection than Tailwind utilities for a mobile-first prototype | ❌ Rejected |
| **Redux/Zustand global store** | Familiar patterns | Duplicates the TanStack Query server cache — two sources of truth | ❌ Rejected |

## Consequences

- Everything is a static asset: hosting and delivery are trivial
  ([dr-013-continuous-delivery](dr-014-continuous-delivery.md)).
- The walkthrough teaches each technology in depth:
  [`docs/walkthrough/`](../walkthrough/README.md).
