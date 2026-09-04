# Decision records (DRs)

Every important decision about this project is a decision record. One
record per theme, living in [`drs/`](drs/). **DRs are never edited** — when
a decision changes, append a new DR (next number in the sequence) and
update this table to point at the replacement. This table is the
authoritative index of the *latest applicable* DR for every theme, and is
the first place agents should look before making an architectural choice.

## Current decisions

| Theme | Latest DR | What was chosen, and why |
| --- | --- | --- |
| high-level-architecture | [dr-001](drs/dr-001-high-level-architecture.md) | A statically hosted React SPA talking directly to Supabase — realtime collaboration and RLS-enforced isolation with no custom server to build or operate. |
| backend | [dr-002](drs/dr-002-backend.md) | Supabase (managed Postgres, Auth, PostgREST, Realtime, Edge Functions) — real SQL with database-enforced security, and the identical stack runs locally in Docker. |
| frontend | [dr-004](drs/dr-004-frontend.md) | React 19 + Vite + TypeScript (strict) + Tailwind v4 + TanStack Query + React Router v7 — a mainstream, agent-friendly, statically buildable mobile-first stack with no global state library. |
| running-locally | [dr-005](drs/dr-005-running-locally.md) | Supabase CLI (Docker) for the backend and `npm run dev` for the frontend — one command boots the real stack, identical to CI and production. |
| unit-testing | [dr-006](drs/dr-006-unit-testing.md) | Vitest beside the code for pure logic only, with behaviour-describing test names that survive refactors; runs on every PR. |
| integration-testing | [dr-007](drs/dr-007-integration-testing.md) | Playwright + playwright-bdd driving the real app against a real local Supabase container — the default test style for any user-facing feature. |
| end-to-end-testing | [dr-008](drs/dr-008-end-to-end-testing.md) | The integration suite doubles as e2e, plus a lighter component BDD suite (HTML harnesses, no backend) strictly for pre-data-layer UI contracts. |
| database-schemas | [dr-009](drs/dr-009-database-schemas.md) | Append-only SQL migrations in `supabase/migrations/` with RLS on every table and generated TypeScript types — the schema is the API contract and can't drift. |
| agentic-skills | [dr-010](drs/dr-010-agentic-skills.md) | Agent instructions stay short and index-shaped, linking to walkthroughs and this DR table instead of duplicating them. |
| recommend-mcps | [dr-011](drs/dr-011-recommended-mcps.md) | Always use the context7 MCP server for the latest library documentation before writing code against an API. |
| hosting-platform | [dr-012](drs/dr-012-hosting-platform.md) | GitHub for everything — repo, Pages for the static frontend, Actions for CI/CD — because it's free and already where the code lives. |
| continuous-integration | [dr-013](drs/dr-013-continuous-integration.md) | GitHub Actions gates `main`: unit tests on every PR; lint, component + integration BDD and Lighthouse on every push — a red pipeline blocks deploy. |
| continuous-delivery | [dr-014](drs/dr-014-continuous-delivery.md) | Every green push to `main` auto-deploys: Supabase migrations and Edge Functions first, then the static frontend to GitHub Pages. |
| readme-and-agent-instructions | [dr-015](drs/dr-015-readme-and-agent-instructions.md) | Four doc layers with one audience each: README (what/why/run), walkthroughs (how the tech works), DRs (why it's like this), agent instructions (the rules). |

## Rules

1. **Never edit a DR.** Append `drs/dr-NNN-<theme>.md` with the next free
   number, mark the old one superseded by editing *only its status line*
   to `Superseded by dr-NNN`, and update this table.
2. Every DR records the **context**, the **decision**, the **alternatives
   considered with pros and cons**, and the **consequences**.
3. If a theme isn't listed here, no decision has been recorded for it —
   write the DR before building on an assumption.
