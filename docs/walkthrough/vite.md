# Vite

[Vite](https://vite.dev/) is the build tool. It does two jobs:

1. **Dev server** — `npm run dev` starts Vite on
   [http://localhost:5173](http://localhost:5173). It serves the app
   directly from source with instant hot-module reloading: edit a file and
   the browser updates without a full refresh.
2. **Production build** — `npm run build` type-checks (`tsc -b`) and then
   bundles the app into static files in `dist/`, ready to host on GitHub
   Pages.

## Configuration

`vite.config.ts` is deliberately small:

- `@vitejs/plugin-react` — compiles JSX/TSX.
- `@tailwindcss/vite` — compiles Tailwind CSS.
- A `base` path override for GitHub Pages (`/planny-planny/` in production
  via the `GITHUB_PAGES` environment variable).
- A `test` block wiring Vitest to jsdom.

## Environment variables

Vite exposes environment variables prefixed with `VITE_` to the browser
bundle. We have exactly two:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

They come from `.env` locally (copy `.env.example`) and from GitHub
repository **Variables** in CI, where they are baked into the static bundle
at build time. The anon key is designed to be public — data access is
enforced by Postgres Row-Level Security, not by hiding the key
(see [Supabase](supabase.md)).

Next: [Tailwind CSS](tailwind.md)
