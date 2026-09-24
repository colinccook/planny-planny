# ChatGPT plugin

Planny Planny exposes a remote Model Context Protocol (MCP) server so
ChatGPT can manage a household meal plan through conversation.

The current public-plugin architecture and isolated Claude workaround are
recorded in [DR-021](drs/dr-021-mcp-oauth-compatibility-bridge.md). OpenAI's
plugin platform changes
frequently, so use the linked official documentation during submission rather
than relying only on screenshots or field names in this guide.

## What is implemented

- A current stateless MCP Streamable HTTP endpoint:
  `https://<api-origin>/functions/v1/chatgpt-plugin/mcp`
- Supabase Auth OAuth 2.1 discovery, dynamic client registration, PKCE,
  refresh-token rotation and consent grants.
- A separate Claude resource at
  `https://<api-origin>/functions/v1/chatgpt-plugin/claude/mcp`; its temporary
  compatibility OAuth bridge cannot change the published ChatGPT resource.
- A mobile-first consent page at `/oauth/consent`.
- A separate mobile-first Claude approval page at `/oauth/authorize`.
- User-scoped Supabase access, so existing Postgres RLS policies apply to
  every tool call.
- An additional server-side access check allowing owners, members and
  honoured guests to use tools. Voting guests and public viewers cannot.
- Complete tool titles, input/output schemas, structured results and safety
  annotations.
- Connected-app grant revocation in Settings.
- Public plugin privacy, terms and support routes.
- The legacy `/sse` MCP endpoint and REST/OpenAPI Custom GPT Action routes
  remain temporarily available for existing connections.

## Architecture

```text
ChatGPT
  │ MCP Streamable HTTP + user access token
  ▼
chatgpt-plugin Edge Function
  │ user-scoped Supabase client
  ▼
Postgres RLS ──► active household data

ChatGPT
  │ OAuth authorization code + PKCE
  ▼
Supabase Auth OAuth 2.1
  │ browser consent
  ▼
Planny Planny /oauth/consent
```

Supabase Auth owns OAuth clients, codes, grants, access tokens and refresh
tokens for the published ChatGPT `/mcp` endpoint. The
`chatgpt-plugin-auth` function is not used by that endpoint; DR-021 uses it
only for the separate Claude `/claude/mcp` resource and existing legacy
Custom GPT Action compatibility.

## Local setup

### Requirements

- Node.js 24.21.0
- Supabase CLI 2.117.0 or later
- Docker

Install dependencies and start the stack:

```bash
npm install
npx supabase stop
npx supabase start
npm run dev
```

`supabase/config.toml` enables the local OAuth server, dynamic registration
and the `/oauth/consent` route. Restarting the local stack is required after
changing Auth configuration.

The authenticated MCP middleware requires asymmetric Supabase JWT signing
keys. Hosted projects should use ES256 or RS256. If a local project still
issues legacy HS256 tokens, OAuth discovery can be tested locally but
authenticated `/mcp` calls require a local asymmetric signing-key
configuration.

## Inspect the MCP server

Start the Edge Function:

```bash
npx supabase functions serve chatgpt-plugin
```

An unauthenticated initialize request should return `401` and advertise the
protected-resource metadata URL:

```bash
curl -i -X POST \
  http://127.0.0.1:54321/functions/v1/chatgpt-plugin/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2026-07-28",
      "capabilities": {},
      "clientInfo": { "name": "curl", "version": "1" }
    }
  }'
```

Fetch the advertised metadata:

```bash
curl \
  http://127.0.0.1:54321/functions/v1/chatgpt-plugin/mcp/oauth-protected-resource
```

It should identify:

- resource:
  `http://127.0.0.1:54321/functions/v1/chatgpt-plugin/mcp`
- authorization server:
  `http://127.0.0.1:54321/auth/v1`

For a full OAuth session, run:

```bash
npx -y @modelcontextprotocol/inspector
```

Choose **Streamable HTTP**, enter the MCP URL, sign in, approve the consent
screen, inspect every tool and exercise representative reads and writes.

## Connect from the Claude app

The same tools are exposed through a separate Claude MCP resource. This keeps
Claude's temporary OAuth workaround from changing ChatGPT's published
resource URL, native Supabase issuer or existing grants:

1. In Claude, open **Settings → Connectors → Add custom connector**.
2. Name it **Planny Planny** and enter the MCP URL
   (`https://<api-origin>/functions/v1/chatgpt-plugin/claude/mcp`).
3. Turn on **Requires sign-in** and leave the client ID and client secret
   blank — Claude registers itself via dynamic client registration.
4. Sign in, approve the connection and confirm your password. The password
   goes directly to Supabase through a non-persisted browser client, creating
   a separate native session for Claude.

The **Add to Claude** card on the in-app Settings page shows these steps with
a copyable server URL. Claude can be revoked independently from **Connected
apps** without changing ChatGPT or signing the browser out.

The bridge exists because Claude's public PKCE request includes `resource` and
`offline_access`, which currently trigger the hosted Supabase OAuth beta
defect tracked by
[supabase/auth#2820](https://github.com/supabase/auth/issues/2820).

## Hosted Supabase setup

The following hosted settings are manual project configuration and are not
applied by database migrations:

1. In **Authentication → OAuth Server**, enable the OAuth 2.1 server.
2. Set the authorization path to `/oauth/consent`.
3. Enable dynamic client registration.
4. In **Authentication → URL Configuration**, set the Site URL to the
   deployed Planny Planny frontend and allow its `/oauth/consent` route.
5. In **Authentication → Signing Keys**, migrate the project to an asymmetric
   ES256 or RS256 key if it still uses the legacy JWT secret.
6. Deploy the frontend plus the `chatgpt-plugin` and `chatgpt-plugin-auth`
   Edge Functions.
7. Set `PLUGIN_PUBLIC_URL` to the public URL prefix immediately before
   `/chatgpt-plugin` (for direct Supabase hosting, this is
   `https://<project-ref>.supabase.co/functions/v1`; for a root-level proxy,
   it can be `https://mcp.example.com`).
8. If Supabase Auth is exposed somewhere other than the project's standard
   public `/auth/v1` endpoint, set `PLUGIN_AUTH_URL` to that complete issuer
   URL. Do not derive it from a controlled MCP-only reverse proxy.
9. Set `APP_URL` to the exact public frontend base URL and deploy
   `chatgpt-plugin-auth` for the separate Claude compatibility flow.

Do not send email addresses or passwords to an authorization endpoint in query
parameters. Current clients must use the browser-based Supabase Auth consent
flow.

## Controlled domain requirement

OpenAI's public submission verifies control of the MCP host, or an allowed
parent host, by requesting:

```text
https://<challenge-base-host>/.well-known/openai-apps-challenge
```

The endpoint must return only the current verification token.

The default `<project-ref>.supabase.co` hostname is not suitable for this
ownership check because the project does not control the `supabase.co` parent
domain. Before public submission, choose one:

1. Configure Supabase's paid custom-domain add-on, for example
   `api.example.com`, and host the challenge on the allowed parent
   `example.com`; or
2. Put a controlled reverse proxy/edge worker at a stable hostname such as
   `mcp.example.com`, proxy the submitted `/chatgpt-plugin/mcp` and metadata
   paths to the Edge Function, and serve the well-known challenge directly.

The protected-resource metadata continues to advertise the reachable Supabase
Auth issuer from `PLUGIN_AUTH_URL` (or `SUPABASE_URL` by default), so an
MCP-only proxy does not need to forward `/auth/v1`.

If Claude also connects through that proxy, additionally forward
`/chatgpt-plugin/claude/mcp`, its `/oauth-protected-resource` metadata path,
and `/chatgpt-plugin-auth/*`. These Claude-only routes are not part of the
ChatGPT plugin submission.

Changing the MCP origin after publication requires a new plugin submission,
so choose the production hostname before review.

## Connect in ChatGPT developer mode

1. Open ChatGPT **Settings → Security and login**.
2. Enable **Developer mode** if it is available for the account/workspace.
3. Open [ChatGPT Plugins](https://chatgpt.com/plugins).
4. Add a new connection using the production MCP URL.
5. Complete the Planny Planny sign-in and consent flow.
6. Review the discovered tools and their safety annotations.
7. Start a new conversation with the connection enabled.

Useful evaluation prompts:

- "What meals are planned for the next seven days?"
- "Add lentil pasta to Friday's meal plan."
- "What open todos does our household have?"
- "Record that yesterday's curry happened as planned."
- "Delete tomorrow's meal." — ChatGPT should request confirmation.
- "Send the meal plan to my colleague." — no tool should be selected because
  Planny Planny does not send messages.

Refresh the developer connection after changing tool names, descriptions,
schemas, annotations or authentication.

## Publish to the universal Plugins Directory

Use the [OpenAI plugin submission portal](https://platform.openai.com/plugins)
and choose **With MCP** with a **Universal** URL.

Before submission:

- verify the publishing individual or business in the OpenAI Platform;
- ensure the submitter has **Apps Management: Write**;
- use a project with global rather than EU-only OpenAI data residency;
- deploy a stable public HTTPS MCP endpoint on the controlled production
  origin;
- complete domain verification;
- create a fully populated reviewer account that requires no MFA, email code,
  SMS or private-network access;
- prepare a production logo and category;
- prepare a display name and short description of at most 30 characters;
- prepare a long description of at most 4,000 characters;
- list at most 20 concise capabilities;
- provide up to three starter prompts;
- provide exactly five positive and three negative test cases;
- provide a demo-recording URL showing the main workflows;
- provide the website, support, privacy and terms URLs;
- justify all three annotations for every tool.

Select **Scan Tools**, correct all blocking findings, scan again, submit for
review and explicitly publish after approval. Approval alone does not publish
the plugin.

## Tool and permission maintenance

Published tool metadata is a versioned public contract and is continuously
reviewed by OpenAI:

- keep existing names and required fields backward compatible;
- add new optional fields rather than changing existing meanings;
- do not remove or rename a live tool without a migration plan;
- keep output schemas aligned with `structuredContent`;
- mark all list/get tools read-only;
- mark deletes, moves, clears and overwrites destructive;
- keep `openWorldHint` false while tools are limited to a user's private
  Planny Planny data.

When a new application capability is exposed:

1. update the relevant predicate in `src/lib/permissions.ts`;
2. update `ACCESS_LEVELS` and `docs/permissions.md`;
3. update RLS through a new append-only migration;
4. add the tool and its schema/annotations;
5. add the REST/OpenAPI route only if Custom GPT Action parity is required;
6. add role-matrix and integration BDD scenarios;
7. update the README showcase and this guide.

## Public pages

The frontend exposes:

- `/plugin/privacy`
- `/plugin/terms`
- `/plugin/support`

Replace the GitHub Pages URLs with the final custom-domain URLs in the OpenAI
submission. Review these documents before publishing in any new country or
region.

## Legacy Custom GPT Action

`public/openapi.json` and the REST routes in `chatgpt-plugin` remain for
existing Custom GPT Action users. The `chatgpt-plugin-auth` function supports
those legacy users and DR-021's separate Claude resource, but is not used by
the published ChatGPT `/mcp` path.

To inspect or repair an existing Custom GPT Action:

1. Deploy both `chatgpt-plugin` and `chatgpt-plugin-auth`.
2. Import the repository's [`public/openapi.json`](../public/openapi.json)
   into the GPT action editor. The Edge Function does not serve the schema
   itself.
3. Keep the REST server base at
   `https://<project-ref>.supabase.co/functions/v1/chatgpt-plugin`.
4. Keep its existing legacy OAuth endpoints under
   `/functions/v1/chatgpt-plugin-auth`; do not point it at the new `/mcp`
   endpoint.
5. Smoke-test an authenticated REST request such as `GET /todos` before
   migrating the action.

The legacy password grant exists only for compatibility and must never place
credentials in an authorization URL. New connections should use `/mcp` and
the browser-based Supabase Auth flow described above.

Do not create new integrations with the password grant. Migrate existing MCP
connections from `/sse` to `/mcp` and Supabase Auth OAuth 2.1. Remove the
legacy OAuth tables and function in a later append-only migration only after
confirming no active Custom GPT Action depends on them.

## Official references

- [OpenAI Plugins](https://developers.openai.com/plugins/)
- [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [Plugin authentication](https://developers.openai.com/plugins/build/auth)
- [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Submit plugins](https://developers.openai.com/plugins/deploy/submission)
- [Plugin guidelines](https://developers.openai.com/plugins/app-guidelines)
- [Supabase: deploy MCP servers](https://supabase.com/docs/guides/ai-tools/byo-mcp)
- [Supabase MCP authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Supabase OAuth server](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
