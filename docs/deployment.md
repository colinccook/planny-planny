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
   `VITE_SUPABASE_ANON_KEY`, and `APP_URL` (the exact public frontend base,
   including `/planny-planny/` on GitHub Pages). Set `PLUGIN_PUBLIC_URL` when
   MCP endpoints use a controlled proxy, and set `PLUGIN_AUTH_URL` only when
   Supabase Auth is exposed at a non-default public URL.
4. Supabase Dashboard → **Authentication → URL Configuration**: set Site
   URL to `https://<username>.github.io/planny-planny/` and add
   `https://<username>.github.io/planny-planny/**` to Redirect URLs.
5. Supabase Dashboard → **Authentication → OAuth Server**: enable OAuth
   2.1, set the authorization path to `/oauth/consent`, and enable dynamic
   client registration for MCP clients.
6. Supabase Dashboard → **Authentication → Signing Keys**: use an asymmetric
   ES256 or RS256 key. The authenticated MCP middleware does not accept legacy
   HS256 user tokens.
7. Push to `main` (or run the "Test & Deploy" workflow manually).

## ChatGPT plugin production domain

Public OpenAI plugin submission requires proof of control over the MCP
hostname, or an allowed parent hostname, using
`/.well-known/openai-apps-challenge`. The default
`<project-ref>.supabase.co` origin cannot prove control of the
`supabase.co` parent domain.

Before submission, configure either:

- a Supabase custom API domain plus a controlled parent website that can serve
  the verification token; or
- a controlled reverse proxy/edge-worker hostname that forwards the submitted
  `/chatgpt-plugin/mcp` and `/chatgpt-plugin/mcp/oauth-protected-resource`
  paths to the deployed function and serves the root challenge itself.

The published ChatGPT resource remains on those paths and native Supabase
OAuth. If the same proxy is also used for Claude, it must additionally forward
`/chatgpt-plugin/claude/mcp`, its protected-resource metadata path, and
`/chatgpt-plugin-auth/*`.

Set `PLUGIN_PUBLIC_URL` to the public URL prefix immediately before
`/chatgpt-plugin`: use `https://<ref>.supabase.co/functions/v1` for direct
Supabase hosting or, for example, `https://mcp.example.com` for a root-level
proxy. This keeps the MCP resource identifier stable and aligned with the URL
submitted to OpenAI. OAuth discovery is intentionally advertised from
`PLUGIN_AUTH_URL`, which defaults to `https://<ref>.supabase.co/auth/v1`; the
proxy does not need to forward `/auth/v1`. `APP_URL` tells the Claude
compatibility authorization server where to host browser approval. See
[ChatGPT plugin](chatgpt-plugin.md) for the complete checklist.
