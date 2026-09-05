# 🌍 Deployment

Merging to `main` automatically pushes database migrations to the hosted
Supabase project, deploys the Edge Functions, and publishes the frontend
to GitHub Pages — after lint, unit, BDD and Lighthouse checks pass.
Decision record: [drs/dr-014-continuous-delivery.md](drs/dr-014-continuous-delivery.md).

## First-time setup

One-off configuration of the Supabase project, GitHub secrets/variables
and Auth URLs:

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
