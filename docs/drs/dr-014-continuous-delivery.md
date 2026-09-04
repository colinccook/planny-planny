# DR-014: Continuous delivery

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** continuous-delivery

## Context

Once `main` is green, getting it live should require no human action and
no local tooling.

## Decision

**Every green push to `main` deploys automatically** via the
`ci-deploy.yml` chain, in order:

1. **`migrate`** — `supabase link` + `supabase db push` apply new
   migrations to the hosted project; the `PLUGIN_PUBLIC_URL` secret is
   set; the two Edge Functions (`chatgpt-plugin`, `chatgpt-plugin-auth`)
   are deployed.
2. **`build`** — the frontend is built with the production Supabase URL
   and anon key baked in (`VITE_*` variables), and `dist/index.html` is
   copied to `dist/404.html` for SPA routing.
3. **`deploy`** — the static bundle is published to **GitHub Pages**.

Database before frontend, so the UI never ships against a schema that
isn't live yet.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **GitHub Pages + Supabase auto-deploy on green main** | Zero-touch; reuses CI identity and secrets; static hosting is free | Deploy straight to production (acceptable for a prototype, with the full test chain gating) | ✅ Chosen |
| **Manual releases / tags** | Human checkpoint before prod | Prototypes stall on manual steps; the pipeline already gates quality | ❌ Rejected |
| **Netlify/Vercel deploy previews** | Per-PR preview URLs | Another platform; GitHub Pages is already paid for (free) and sufficient | ❌ Rejected |
| **Staging environment first** | Safer rollouts | Doubles the Supabase projects and secrets to maintain for zero-prototype traffic | ❌ Rejected |

## Consequences

- First-time setup (Supabase project, tokens, GitHub secrets/variables,
  Auth URL config) is documented in
  [README.md — Deployment](../../README.md#-deployment).
