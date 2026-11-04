# DR-021: Custom domain

- **Status:** Active
- **Decided:** 2026-11
- **Theme:** custom-domain

## Context

Production had been served from the GitHub Pages project-site URL
`https://colinccook.github.io/planny-planny/`, which forced a
`/planny-planny/` base path ([dr-012](dr-012-hosting-platform.md)) and
made every share/invite link, Supabase Auth redirect and plugin listing
URL carry that prefix. The domain `plannyplanny.uk` has been purchased.
A memorable, owned hostname is also a prerequisite for the public ChatGPT
plugin submission, which requires proof of control of the MCP hostname or
a parent hostname ([dr-017](dr-017-chatgpt-plugin.md)).

## Decision

**Serve production from `https://www.plannyplanny.uk` using GitHub Pages'
built-in custom-domain support.** Hosting stays on GitHub Pages
(dr-012 is amended, not superseded).

- `public/CNAME` contains `www.plannyplanny.uk`, so every deploy keeps the
  custom domain configured.
- CI builds with `BASE_PATH=/` instead of `GITHUB_PAGES=true`, so the
  bundle, the PWA manifest and `buildAppUrl()` all resolve from the root.
- Supabase Auth **Site URL** and **Redirect URLs** point at
  `https://www.plannyplanny.uk/` and `https://www.plannyplanny.uk/**`.
  The OAuth 2.1 consent path (`/oauth/consent`) is relative to the Site
  URL, so MCP sign-in follows automatically.
- The MCP endpoint remains on Supabase
  (`https://<ref>.supabase.co/functions/v1/chatgpt-plugin/mcp`). A
  `mcp.plannyplanny.uk` proxy with `PLUGIN_PUBLIC_URL` is only introduced
  if and when the OpenAI hostname-ownership challenge requires it
  (see [deployment.md](../deployment.md)).

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **GitHub Pages custom domain (`www`)** | Free; one `CNAME` file + DNS record; HTTPS issued automatically; no new platform | `www` must be the canonical host (apex needs A/ALIAS records; GitHub redirects apex → www when both are configured) | ✅ Chosen |
| **Stay on `github.io/planny-planny/`** | Zero change | Ugly URLs; non-root base path; cannot prove hostname control for plugin submission | ❌ Rejected |
| **Move to Cloudflare Pages / Netlify for the domain** | Edge redirects, apex handling | Re-litigates dr-012 for a problem Pages already solves | ❌ Rejected |
| **Point the domain at the Supabase project (custom API domain)** | Single hostname for app + API | Paid add-on; still needs static hosting elsewhere | ❌ Rejected |

## Consequences

- Share and invite links are now `https://www.plannyplanny.uk/<path>`; the
  URL helpers in `src/lib/appUrl.ts` already handle a root base path.
- Local development is unchanged (`/` base, `http://127.0.0.1:5173`).
- Removing `public/CNAME` would silently drop the custom domain on the
  next deploy — treat the file as production configuration.
- Plugin listing URLs (`docs/chatgpt-plugin-submission.md`) use the new
  domain.
