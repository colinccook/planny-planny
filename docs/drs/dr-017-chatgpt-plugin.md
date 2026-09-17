# DR-017: Public ChatGPT plugin

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** chatgpt-plugin
- **Builds on:** [dr-001-high-level-architecture](dr-001-high-level-architecture.md),
  [dr-002-backend](dr-002-backend.md),
  [dr-009-database-schemas](dr-009-database-schemas.md)

## Context

Planny Planny already exposes its meal-planning operations through a
Supabase Edge Function for a Custom GPT Action and an early MCP connector.
OpenAI's current plugin directory accepts remote MCP servers using
streamable HTTP and OAuth 2.1. Public submission also requires accurate
tool metadata, a verifiable production domain, policy pages and reviewer
test material.

The existing MCP and OAuth protocols were implemented by hand. They duplicate
features now provided by the official MCP server package and Supabase Auth's
OAuth 2.1 server, including discovery, PKCE, dynamic client registration,
refresh-token rotation and consent grants.

## Decision

Publish Planny Planny first as a **remote MCP-only plugin**, with no custom
ChatGPT UI and no bundled skill.

- The MCP server remains a Supabase Edge Function.
- The function uses the official MCP server package's stateless streamable
  HTTP handler.
- Supabase Auth is the OAuth 2.1 authorization server. The React SPA hosts the
  consent page, while Supabase owns codes, tokens, grants, discovery and
  dynamic client registration.
- Tool calls use a user-scoped Supabase client, so existing RLS policies
  remain the final authorization boundary.
- The server also checks the household role before executing a tool, matching
  the application's `canUsePlugin` capability.
- The existing REST routes remain available for the Custom GPT Action until a
  separate deprecation decision is made.
- Public submission uses a stable MCP URL on a domain controlled by the
  publisher. The exact hosting or proxy provider is an operational choice, but
  it must support OpenAI's root well-known domain challenge.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| Keep the hand-written MCP and OAuth implementation | No migration | Easy to drift from MCP/OAuth requirements; custom credential, token and redirect handling increases security risk | Rejected |
| Publish a skills-only plugin | Simple package and review | Cannot read or update live household data | Rejected |
| Remote MCP with custom ChatGPT UI | Rich calendar experience | Adds CSP, iframe, accessibility, screenshot and UI review scope before the core tools are proven | Deferred |
| Custom Node server outside Supabase | Conventional SDK runtime | Adds another host and operational stack to a prototype | Rejected unless Edge Functions cannot satisfy the protocol |
| Supabase Edge Function + Supabase Auth OAuth server | Reuses the backend, identities, RLS, deployment and local stack; follows current Supabase MCP guidance | OAuth server is beta; public domain verification still needs a controlled origin | Chosen |

## Consequences

- `supabase/config.toml` enables the OAuth server and dynamic client
  registration, and the hosted project must mirror those settings.
- The project must use asymmetric JWT signing keys for authenticated MCP
  middleware and OpenID Connect.
- The frontend gains a public `/oauth/consent` route plus privacy, terms and
  support pages.
- Applied custom OAuth migrations remain immutable. Their tables are retired
  only through a later append-only cleanup migration after live clients have
  moved to Supabase Auth.
- Published tool names, schemas and annotations become a versioned public API.
  Changes must remain backward compatible and are subject to continuous
  review.
- A future custom UI or bundled skill requires a new decision because it
  materially expands the plugin's runtime and review surface.
