# 🍽️ Planny Planny

**A baby-led, healthy family meal planner my partner and I actually use —
and not a single line of it was written by hand.**

Planny Planny is a long-term hobby project and a working experiment in
**vibe coding**: every feature, database migration, test and document in
this repository was produced by AI agents under my direction. It will
never be mainstream, and it doesn't need to be — it's the little tool our
household plans meals with, and a demonstration that AI-authored software
can be shipped *confidently* when it's wrapped in serious engineering
discipline.

> ⚠️ **Still a prototype.** Personal, non-production, rough edges and
> breaking changes expected.

## ⚡ The flagship trick: realtime household collaboration

Open the plan on two phones. Change a meal, drop an idea, tick a todo,
react with a 👍 — and it appears on the other screen **instantly**. No
refresh, no polling. Every write goes through Supabase's REST API (with
row-level security deciding who may do what), Postgres broadcasts the
change over **Supabase Realtime**, and each device's TanStack Query cache
updates in place — with a little sound effect for the fun moments.

A whole household genuinely plans together on this: five access levels,
from Owner down to a read-only public share link, all enforced *in the
database* by RLS policies, not in the UI. → [docs/permissions.md](docs/permissions.md)

## ✨ Everything else it does

- **🗓️ Perpetual calendar.** A mobile-first, swipeable scrolling calendar
  of meals with day themes ("Oily Fish Monday") and per-day headcounts
  (adults, children, visitors).
- **🥕 Ingredient tracking.** Tag meals with ingredients, star favourites
  to encourage variety, and get overuse warnings (hello, chicken!).
- **👨‍👩‍👧 Households.** Invite family by email; users can belong to several
  households, and every household's data is fully isolated.
- **💡 Ideas, reactions & todos.** Lightweight meal ideas per day, 👍
  reactions, and a shared todo list ("buy milk") with reminders.
- **🪄 AI meal suggestions.** A magic-wand prompt builder, plus a ChatGPT
  plugin that manages the plan conversationally. → [docs/chatgpt-plugin.md](docs/chatgpt-plugin.md)
- **🌱 Outcomes.** Record whether the planned meal actually got cooked and
  eaten, so the household learns over time. → [docs/outcomes.md](docs/outcomes.md)

## 🤖 100% vibe coded — here's why that's safe

I haven't written a line of this app, and I can still change it with
confidence. That's the interesting part, and it comes down to guardrails,
not luck:

- **100+ BDD scenarios** across 40+ Gherkin feature files — Playwright +
  playwright-bdd drive the *real* app against a *real* local Supabase
  container (integration suite), plus a lighter component suite with no
  backend.
- **Unit tests (Vitest)** beside every piece of pure logic in `src/lib/`
  and `src/hooks/`, with test names that describe behaviour, never
  implementation — refactors don't force renames.
- **CI gates everything:** unit tests on every PR; lint, type-check, both
  BDD suites and Lighthouse on every push to `main`. A red pipeline blocks
  deploy. → [dr-013](docs/drs/dr-013-continuous-integration.md)
- **Continuous delivery:** every green push to `main` auto-deploys
  migrations, Edge Functions and the static frontend. → [docs/deployment.md](docs/deployment.md)
- **The schema can't drift:** append-only SQL migrations, RLS on every
  table, and TypeScript types generated straight from the database.
- **TypeScript strict mode, no `any`** — the compiler is a reviewer too.
- **Decisions are written down:** every architectural choice is an
  append-only decision record with alternatives and trade-offs, indexed in
  [docs/drs.md](docs/drs.md), so neither humans nor agents re-litigate
  settled questions.

## 🧰 Technology stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19 + Vite + TypeScript (strict) + Tailwind v4 | Mainstream, agent-friendly, statically buildable, mobile-first → [dr-004](docs/drs/dr-004-frontend.md) |
| Server state | TanStack Query (no global store) | Server state lives in one cache; Realtime pushes patch it in place |
| Backend | Supabase (Postgres, Auth, PostgREST, Realtime, Edge Functions) | Real SQL with database-enforced security; the identical stack runs locally in Docker → [dr-002](docs/drs/dr-002-backend.md) |
| Architecture | Static SPA talking directly to Supabase | Realtime collaboration and RLS-enforced isolation with **no custom server to operate** → [dr-001](docs/drs/dr-001-high-level-architecture.md) |
| Hosting & CI/CD | GitHub Pages + GitHub Actions | Free, and already where the code lives → [dr-012](docs/drs/dr-012-hosting-platform.md) |
| Testing | Vitest + Playwright + playwright-bdd + Lighthouse | Behaviour-first pyramid → [dr-006](docs/drs/dr-006-unit-testing.md), [dr-007](docs/drs/dr-007-integration-testing.md) |

## 🚀 Running locally

**Prerequisites:** [Node.js](https://nodejs.org/) v24 LTS (see `.nvmrc`)
and [Docker](https://www.docker.com/) (the Supabase CLI uses it for the
local backend).

```bash
npm install               # install dependencies
npx supabase start        # boot the local backend (Postgres, Auth, Realtime) in Docker
cp .env.example .env      # env vars; the defaults match the local instance
npm run dev               # start the app → http://localhost:5173
```

`supabase start` applies every migration in `supabase/migrations/` on
first boot. When migrations change, re-apply them with
`npx supabase db reset`.

Run the tests:

```bash
npm test                  # unit tests (Vitest)
npm run test:component    # component BDD (no backend needed)
npm run test:integration  # integration BDD (needs `supabase start`)
npm run test:e2e          # both BDD suites
```

## 📖 Documentation

| You want to… | Read |
| --- | --- |
| Learn how the stack works (TypeScript, React, Postgres/Supabase, …) — in depth, with pointers into this codebase | **[docs/walkthrough/](docs/walkthrough/README.md)** |
| Know *why* anything is the way it is | **[docs/drs.md](docs/drs.md)** — the decision-records index |
| Work on the repo as an AI agent | [.github/copilot-instructions.md](.github/copilot-instructions.md) |
| Understand outcomes | [docs/outcomes.md](docs/outcomes.md) |
| Understand the five access levels | [docs/permissions.md](docs/permissions.md) |
| Audit what anonymous (public link) visitors can reach | [docs/public.md](docs/public.md) |
| Set up the ChatGPT plugin | [docs/chatgpt-plugin.md](docs/chatgpt-plugin.md) |
| Deploy your own instance | [docs/deployment.md](docs/deployment.md) |
| Test the Edge Functions locally | [docs/edge-functions-testing.md](docs/edge-functions-testing.md) |
| Add a loading state that matches the app's skeletons | [docs/skeleton-strategy.md](docs/skeleton-strategy.md) |

## 📄 License

MIT
