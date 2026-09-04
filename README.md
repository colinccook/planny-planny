# 🍽️ Planny Planny

> ⚠️ **This is a prototype.** It's a personal, non-production experiment —
> expect rough edges, breaking changes, and no promises.

**Planny Planny is a healthy family meal planner that is baby-led /
child-led: you fit plans around the nutritional needs of the child.**

Meal planning is hard and easily neglected — it's too easy to skip it and
order takeaway instead. Planny Planny helps a household plan meals
collaboratively, keep the child's nutrition at the centre (track
ingredients, star the ones to use more, flag the ones to use less), adapt
to real life (visitors, events, busy weeks) — and, crucially, record
whether the plan actually happened so the household learns over time.

## ✨ Features, at the highest level

- **🌱 Outcomes — the headline metric.** Every other feature exists in
  service of one question: *did the meal we planned actually get cooked
  and eaten?* Record ✅ "as planned" or a miss with a reason; the welcome
  screen counts every meal the app has helped happen. → [docs/outcomes.md](docs/outcomes.md)
- **🗓️ Perpetual calendar.** A mobile-first scrolling calendar of meals,
  with day themes ("Oily Fish Monday"), per-day headcounts (adults,
  children, visitors) and swipe-between-days navigation.
- **🥕 Ingredient tracking.** Tag meals with ingredients, star favourites
  to encourage variety, and get warnings when an ingredient is being
  overused (hello, chicken!).
- **👨‍👩‍👧 Collaborative households.** Invite family by email; every change
  appears on everyone's screen instantly. Five access levels from Owner
  down to a read-only public share link. → [docs/permissions.md](docs/permissions.md)
- **💡 Ideas, reactions & todos.** Lightweight meal ideas per day, 👍
  reactions, and a shared todo list ("buy milk") with reminders.
- **🪄 AI meal suggestions.** A magic-wand prompt builder, and a ChatGPT
  plugin that lets you manage the plan conversationally. → [docs/chatgpt-plugin.md](docs/chatgpt-plugin.md)

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
| Understand outcomes, the headline metric | [docs/outcomes.md](docs/outcomes.md) |
| Understand the five access levels | [docs/permissions.md](docs/permissions.md) |
| Audit what anonymous (public link) visitors can reach | [docs/public.md](docs/public.md) |
| Set up the ChatGPT plugin | [docs/chatgpt-plugin.md](docs/chatgpt-plugin.md) |
| Test the Edge Functions locally | [docs/edge-functions-testing.md](docs/edge-functions-testing.md) |
| Add a loading state that matches the app's skeletons | [docs/skeleton-strategy.md](docs/skeleton-strategy.md) |

## 🌍 Deployment

Merging to `main` automatically pushes database migrations to the hosted
Supabase project, deploys the Edge Functions, and publishes the frontend
to GitHub Pages — after lint, unit, BDD and Lighthouse checks pass.
First-time setup (Supabase project, GitHub secrets and variables, Auth
URLs) is a one-off:

1. Create a project at [supabase.com](https://supabase.com) and a personal
   access token at
   [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
2. Repo → **Settings → Secrets and variables → Actions → Secrets**:
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.
3. Same page → **Variables**: `SUPABASE_PROJECT_REF`,
   `VITE_SUPABASE_URL` (`https://<ref>.supabase.co`),
   `VITE_SUPABASE_ANON_KEY`.
4. Supabase Dashboard → **Authentication → URL Configuration**: set Site
   URL to `https://<username>.github.io/planny-planny/` and add
   `https://<username>.github.io/planny-planny/**` to Redirect URLs.
5. Push to `main` (or run the "Test & Deploy" workflow manually).

Decision record: [docs/drs/dr-014-continuous-delivery.md](docs/drs/dr-014-continuous-delivery.md).

## 📄 License

MIT
