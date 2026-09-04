# DR-012: Hosting platform

- **Status:** Active
- **Decided:** 2026-04 (project inception)
- **Theme:** hosting-platform

## Context

The frontend is a static bundle; the backend is Supabase's hosted
platform. The code, CI and collaboration already live on GitHub.

## Decision

**GitHub for everything:** the repository, GitHub Pages for the static
frontend, GitHub Actions for CI/CD. Supabase hosts the managed backend.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **GitHub Pages** | Free; zero-config static hosting; same platform as code and CI | Static only; SPA needs the `404.html` copy trick for client-side routes | ✅ Chosen |
| **Netlify / Vercel** | Nicer previews, edge redirects | Another platform and account for a prototype; features we don't need | ❌ Rejected |
| **Cloudflare Pages / S3 + CDN** | Cheap, fast | More moving parts than the free built-in option | ❌ Rejected |
| **Self-hosting** | Full control | Ops burden; antithetical to a prototype | ❌ Rejected |

## Consequences

- SPA routing is handled by copying `dist/index.html` to `dist/404.html`
  in the deploy job.
- The base path is `/planny-planny/` in production (`GITHUB_PAGES=true`
  at build time).
