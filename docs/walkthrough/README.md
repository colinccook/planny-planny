# Walkthrough — how the stack works

A maintained series of human-readable walkthroughs of the technologies
Planny Planny is built on, and how this codebase wires them together.
Written for someone who has never used these tools before: each chapter
stands alone, so dive into whatever you need and come back later for the
rest.

## Chapters

1. [TypeScript](typescript.md) — types, the generated database schema, strict mode
2. [React](react.md) — components, hooks, contexts, overlays
3. [Vite](vite.md) — the dev server and the build
4. [Tailwind CSS](tailwind.md) — utility-first, mobile-first styling
5. [Supabase](supabase.md) — Postgres, Auth, PostgREST, Realtime, RLS
6. [TanStack Query & Realtime](tanstack-query-and-realtime.md) — server state, caching, optimistic updates, and why there is no global store
7. [React Router](react-router.md) — routes, the provider tree, the app shell
8. [Testing with Vitest](testing.md) — unit tests for pure logic
9. [BDD Testing](bdd-testing.md) — Playwright + Gherkin: integration vs component suites
10. [Codebase tour](codebase-tour.md) — repository shape, request flow, common tasks, glossary

## Related references

- [Decision records index](../drs.md) — *why* each technology was chosen
- [Permissions / access levels](../permissions.md) — the five-role architecture
- [BDD testing in depth](bdd-testing.md) — chapter 9, the full guide
