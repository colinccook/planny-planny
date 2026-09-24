# DR-021: MCP OAuth compatibility bridge

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** #ChatGptPlugin
- **Supersedes:** [dr-017-chatgpt-plugin](dr-017-chatgpt-plugin.md)

## Context

DR-017 selected Supabase Auth's OAuth 2.1 server for the current MCP endpoint
so Supabase would own dynamic clients, authorization codes, consent grants and
token rotation.

Claude custom connectors use a public PKCE client and send both the OAuth
`resource` parameter and the `offline_access` scope. The hosted Supabase OAuth
server currently fails that combination before consent can complete. Each of
those inputs is independently affected by the upstream beta defect tracked in
[supabase/auth#2820](https://github.com/supabase/auth/issues/2820). The
production logs show discovery, dynamic client registration and the initial
authorization redirect succeeding, followed by the consent-detail request
failing.

Waiting for the hosted beta to change would leave the documented
`@ClaudeIntegration` unusable. Replacing Supabase identity or the MCP
middleware would be disproportionate: the access tokens, JWT verification,
RLS policies and household role checks already work.

## Decision

Temporarily expose a Claude-specific MCP resource with a Planny Planny OAuth
compatibility server while keeping the published ChatGPT `/mcp` resource and
its native Supabase OAuth issuer unchanged.

- ChatGPT continues to use `/chatgpt-plugin/mcp`, native Supabase OAuth,
  existing grants and its current plugin-submission URL.
- Claude uses `/chatgpt-plugin/claude/mcp`, which advertises the existing
  `chatgpt-plugin-auth` Edge Function as its authorization server.
- Dynamic clients remain public clients and must use PKCE S256.
- OAuth clients and redirect URIs are validated before any browser redirect or
  authorization code is issued.
- The SPA completes authorization on a dedicated route using the user's
  existing Supabase session. On approval, the user confirms their password
  directly with Supabase through a non-persisted client, creating a separate
  native session for that connector. Only those connector tokens are sent in
  an authenticated JSON request to the Edge Function; credentials and tokens
  are never placed in a URL.
- Authorization codes remain single-use and short-lived. OAuth client, code
  and token persistence is accessible only to the service role.
- The token endpoint returns the user's native Supabase session tokens, so the
  official MCP middleware, Postgres RLS and the existing server-side household
  capability check remain unchanged.
- The hosted frontend URL is configured explicitly through `APP_URL`, keeping
  the browser hand-off correct for GitHub Pages and custom domains.
- Supabase Auth's native OAuth server and consent page remain the authoritative
  ChatGPT path. The compatibility server is advertised only by the
  Claude-specific resource while the upstream incompatibility remains.

Removing the Claude-specific bridge requires a later decision record after an
end-to-end Claude connection proves the hosted Supabase fix.

## Alternatives considered

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| Wait for Supabase Auth's beta server to change | No compatibility code to maintain | Claude remains unable to connect for an unknown period | Rejected |
| Remove `resource`, `offline_access` or public-client behaviour from Claude's request | Keeps native Supabase OAuth | Claude controls those protocol inputs; Planny Planny cannot rewrite them at the resource server | Not possible |
| Add a third-party OAuth broker | Mature protocol implementation | Adds another vendor, deployment, identity mapping and cost to a non-production prototype | Rejected |
| Reuse the compatibility Edge Function but collect passwords in the authorization request | Smallest code change | Credentials would cross an unnecessary custom server surface and the old query-parameter path is unsuitable for new connections | Rejected |
| Hand the browser's current Supabase session to the connector | Avoids another password prompt | Connector revocation and refresh-token rotation would interfere with the user's web session | Rejected |
| Confirm the password directly with Supabase in a non-persisted browser client and bridge that separate session | Restores Claude while preserving independent revocation, Supabase JWTs, RLS and refresh semantics | Adds one explicit password-confirmation step and temporary custom OAuth code | Chosen |

## Consequences

- Claude can use dynamic registration, PKCE and refresh tokens without
  depending on the affected native consent flow.
- ChatGPT's resource URL, authorization issuer, grants and submission work are
  isolated from the workaround.
- The compatibility authorization surface is security-sensitive and must keep
  redirect validation, client binding, PKCE checks, one-time codes and
  service-role-only persistence covered by unit and integration BDD tests.
- Deployments must set `APP_URL` to the exact public frontend base URL.
- The README, `@ClaudeIntegration` documentation and hosted deployment guide
  describe the temporary compatibility bridge rather than claiming that
  Claude currently uses native Supabase OAuth.
- The old password grant remains only for existing Custom GPT Action
  compatibility and is not advertised or used by the current MCP flow.
