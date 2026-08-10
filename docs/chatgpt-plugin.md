# ChatGPT Plugin Setup Guide

Connect Planny Planny to ChatGPT so you can manage your household
meal plan and todo list through natural conversation.

There are **two ways** to connect, depending on which ChatGPT flow you use:

| Flow | When to use |
|------|-------------|
| **[New Plugin / MCP](#option-a-new-plugin-form-mcp)** | chatgpt.com → Explore GPTs → ＋ Add Plugin or chatgpt.com → your plugin list → New Plugin |
| **[Custom GPT Action / REST](#option-b-custom-gpt-action-rest)** | My GPTs → Create/Edit a GPT → Configure → Add action |

Both flows enforce the same Row-Level Security policies and OAuth token exchange.

> **Who can use it?** Owners, members, and honoured guests.
> Voting guests and public-link viewers cannot use the plugin because
> it exposes write operations.

> **Known limitation:** the `GET /authorize` endpoint currently only
> supports signing in by passing `email`/`password` as query
> parameters (used by the manual `curl` flow and CLI testing). If
> ChatGPT's connector opens `/authorize` with no credentials, it is
> redirected to an `/auth/oauth-login` page in the React app that does
> not exist yet — tracked in
> [issue #70](https://github.com/colinccook/planny-planny/issues/70).
> This does not affect the "does not implement OAuth" error this doc
> otherwise fixes, since discovery (the `.well-known` endpoints)
> happens before `/authorize` is ever called.

---

## Option A — New Plugin form (MCP)

This is the form shown when you tap **＋ Add Plugin** on chatgpt.com (see screenshot below):

```
┌──────────────────────────────────────────────────────┐
│ New Plugin                                    ×       │
│                                                       │
│  Icon (optional)   PNG only, 256 × 256 px, max 10 KB │
│                                                       │
│  Name              [Custom Tool            ]          │
│                                                       │
│  Description (opt) [Explain what it does…  ]          │
│                                                       │
│  Connection     ● Server URL   ○ Tunnel               │
│                 [https://example.com/sse   ]          │
│                                                       │
│  Authentication    [OAuth              ▾  ]           │
│  ▶ Advanced OAuth settings                            │
└──────────────────────────────────────────────────────┘
```

### Prerequisites

Find your **Supabase project reference** — it is the short ID in your
dashboard URL:

```
https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>
```

Replace every `<YOUR_PROJECT_REF>` below with that value.

### Step 1 — Deploy the Edge Functions

> **If you deploy via this repo's GitHub Actions `migrate` job** (the
> default — it runs on every push to `main`), the `PLUGIN_PUBLIC_URL`
> secret below is set automatically from the `SUPABASE_PROJECT_REF`
> repo variable, and the functions are deployed for you. You can skip
> straight to the smoke test.

If you deploy manually instead:

```bash
supabase functions deploy chatgpt-plugin       --project-ref <YOUR_PROJECT_REF>
supabase functions deploy chatgpt-plugin-auth  --project-ref <YOUR_PROJECT_REF>
```

Then set the `PLUGIN_PUBLIC_URL` secret so both functions can build
correct absolute URLs in their OAuth discovery metadata (inside an Edge
Function, `req.url`'s origin is always the internal Kong→edge-runtime
address, never your public Supabase URL):

```bash
supabase secrets set PLUGIN_PUBLIC_URL=https://<YOUR_PROJECT_REF>.supabase.co/functions/v1 \
  --project-ref <YOUR_PROJECT_REF>
```

Smoke-test the MCP endpoint (expect `{"jsonrpc":"2.0",...}` back):

```bash
curl -s -X POST \
  https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin/sse \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}'
```

You should see:

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"Planny Planny","version":"1.0.0"}}}
```

You can also verify the OAuth discovery metadata is reachable:

```bash
curl -s https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin/.well-known/oauth-protected-resource
curl -s https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/.well-known/oauth-authorization-server
```

### Step 2 — Fill in the New Plugin form

Open chatgpt.com → click your name/avatar → **My ChatGPT** →
**Plugins** → **＋ New Plugin** (or **Explore GPTs** → **＋ Add**).

Enter the following values in each field:

| Field | Value |
|-------|-------|
| **Icon** | *Skip, or upload a 256 × 256 PNG logo (max 10 KB)* |
| **Name** | `Planny Planny` |
| **Description** | `Manage your household meal plan, todos, events, and shopping list` |
| **Connection → Server URL** | `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin/sse` |
| **Authentication** | `OAuth` *(select from the dropdown)* |

> **Important — the Server URL must end in `/sse`.**
> That path is the MCP Streamable-HTTP endpoint. It is different from
> the REST base URL used by Custom GPT Actions.

### Step 3 — OAuth is discovered automatically

As soon as the Server URL is set, ChatGPT calls
`GET /.well-known/oauth-protected-resource` on it, follows the
`authorization_servers` entry to
`GET /.well-known/oauth-authorization-server`, and then registers
itself as an OAuth client via `POST /register` (RFC 7591 Dynamic
Client Registration) — no manual "Advanced OAuth settings" fields
should be required. If ChatGPT's UI still shows those fields (older
client versions, or if it falls back to manual entry), fill them in
with:

| OAuth field | Value |
|-------------|-------|
| **Authorization URL** | `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/authorize` |
| **Token URL** | `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/token` |
| **Refresh URL** | `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/token` |
| **Client ID** | *(leave blank — a client is dynamically registered)* |
| **Client Secret** | *(leave blank — the client is public and uses PKCE)* |
| **Scope** | `chatgpt-plugin` |
| **Token exchange method** | `POST request body` |

### Step 4 — Authenticate and test

1. Click **Save** — ChatGPT will walk you through the OAuth consent.
2. Sign in with your Planny Planny email and password when prompted.
3. ChatGPT will call `tools/list` automatically. You should see all 22
   Planny Planny tools listed.
4. Try a message: *"What todos do I have this week?"*

> **Tip — set your household first.**
> Open the Planny Planny app and navigate to the household you want
> ChatGPT to use before your first conversation. The plugin picks up
> `last_household_id` from your profile automatically.

---

## Option B — Custom GPT Action (REST)

Use this if you are building your own GPT (My GPTs → Create/Edit → Configure → Add action).

### What you can do via ChatGPT

| Topic | What you can say |
|---|---|
| **Todos** | "What are our open todos?" · "Add a todo to buy eggs for Friday" · "Mark the milk todo as done" · "Reschedule the shopping todo to Thursday" · "Delete the gym todo" |
| **Meal plan** | "What are we eating this week?" · "Plan pasta for Monday" · "Move Friday's pasta to Saturday" · "Copy Sunday roast to next Sunday too" · "Delete Tuesday's meal — we're eating out" |
| **Meal outcomes** | "Record that last night's curry happened as planned" · "Log that Monday's meal didn't happen — we didn't do food shopping" · "Clear the outcome for Tuesday" |
| **Ideas** | "What meal ideas do we have?" · "Add 'shakshuka' to our ideas" · "Remove the old soup idea" |
| **Events** | "Are there any visitors this week?" · "Add an event — Mum is visiting on Saturday with 2 extra adults" · "Update Saturday's event name" · "Remove the Sunday event" |
| **Shopping list** | "What do we need to buy?" · "What ingredients are coming up in our plan?" |

---

## How it works

The plugin is a **Supabase Edge Function** that sits in front of your
Supabase database. ChatGPT authenticates as *you* using your Supabase
JWT, so every request goes through the same Row-Level Security policies
that protect the app. ChatGPT can only see and change data in
households you belong to.

```
ChatGPT ──► Edge Function ──► Supabase Postgres (RLS applies)
             /chatgpt-plugin         ↕ your data only
```

---

### One-time setup

### 1. Deploy the Edge Functions

From the repository root, deploy both functions to your Supabase project:

```bash
supabase functions deploy chatgpt-plugin --project-ref <YOUR_PROJECT_REF>
supabase functions deploy chatgpt-plugin-auth --project-ref <YOUR_PROJECT_REF>
```

Your project reference is the short ID in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>`.

Verify they're live:

```bash
curl -i https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin/todos \
  -H "Authorization: Bearer dummy-token"
```

You should get a `401 Unauthorized` (invalid JWT) — that confirms the
function is deployed and the auth guard is working.

---

### 2. Obtain tokens via OAuth

The plugin now supports OAuth-style token exchange. Your ChatGPT action
will call the token endpoint to obtain and refresh tokens automatically.

**Option A: Manual token request (for testing)**

Exchange your email and password for an access token:

```bash
curl -X POST https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/token \
  -H 'Content-Type: application/json' \
  -d '{
    "grant_type": "password",
    "email": "you@example.com",
    "password": "your-password"
  }'
```

The response contains `access_token`, `refresh_token`, and `expires_in`:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "sbp_...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Option B: Automatic token refresh (recommended)**

When the access token expires, ChatGPT will automatically call the refresh endpoint:

```bash
curl -X POST https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/token \
  -H 'Content-Type: application/json' \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "sbp_..."
  }'
```

This returns a new access token. Your refresh token never expires as long as
you use it at least once every 7 days.

---

### 3. Add a Custom Action in ChatGPT

1. Go to **https://chatgpt.com** → your profile icon → **My GPTs** →
   **Create a GPT** (or edit an existing one).
2. In the GPT editor, click **Configure** → scroll down → **Add action**.
3. In the action editor:

   **Schema**: paste the contents of
   [`public/openapi.json`](../public/openapi.json) from this repo,
   replacing `<YOUR_PROJECT_REF>` in the `servers.url` field with your
   actual project reference.

   **Authentication**: choose **OAuth 2.0** with the following settings:
   - **Client ID**: Use the OAuth 2.0 flow to obtain tokens dynamically
   - **Authorization URL**: `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/authorize`
   - **Token URL**: `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/token`
   - **Refresh URL**: `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin-auth/token`
   - **Scopes**: `chatgpt-plugin` (scope for plugin access)

   Alternatively, if you prefer manual token setup:
   - Choose **API Key** → **Auth type: Bearer** →
   - Paste an access token from step 2 (Option A)

4. Click **Test** on any operation to verify ChatGPT can reach the
   function. A `200` response with an empty array is a success.

5. Click **Save**.

> **Tip — OAuth vs. Manual tokens**
> OAuth (recommended) automatically refreshes your tokens without intervention.
> Manual tokens require re-pasting when they expire (after 1 hour by default).
> Both methods enforce the same Row-Level Security policies.

> **Tip — set a household in the app first.**
> The plugin resolves your household automatically from your
> `last_household_id` profile field, which the app updates whenever you
> switch households. Sign into the app and navigate to the right
> household before your first ChatGPT conversation and you'll never
> need to pass `?household_id=` manually.

---

### 4. (Optional) Pin your GPT to the sidebar

Star or pin the GPT so it's always one click away. Give it a name like
*"Planny Planny"* and a system prompt like:

```
You are a friendly household meal-planning assistant for Planny Planny.
Help the user manage their meal plan, todos, ideas, events, and
shopping list. Today's date is {{today}}. Always confirm what you've
done after each action (e.g. "Done! I've added 'Pasta' to Wednesday.").
```

---

## API reference

The full OpenAPI 3.1 specification is at [`public/openapi.json`](../public/openapi.json).
Here is a quick summary:

### Todos

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/todos` | List todos. Pass `?completed=true` for done items. |
| `POST` | `/todos` | Create a todo (`title` required, `date`, `note` optional). |
| `PATCH` | `/todos/:id` | Update `title`, `date`, and/or `note`. |
| `POST` | `/todos/:id/complete` | Mark done. Optional `completed_on` date (defaults to today). |
| `POST` | `/todos/:id/reopen` | Un-tick a completed todo. |
| `DELETE` | `/todos/:id` | Delete permanently. |

### Meals

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/meals` | List meals. Optional `?from=` and `?to=` date range (default: today + 6 days). |
| `POST` | `/meals` | Add a meal (`title` required, `date`, `description` optional). |
| `PATCH` | `/meals/:id` | Update `title`, `date`, and/or `description`. |
| `POST` | `/meals/:id/copy` | Copy (or move) to another date. Pass `target_date`; set `move: true` to delete the original. |
| `DELETE` | `/meals/:id` | Delete a meal. |

### Meal outcomes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/outcomes` | List outcomes. Optional `?from=` / `?to=`. |
| `PUT` | `/outcomes/:meal_id` | Upsert an outcome. `status` is `"as_planned"` or `"did_not_happen"`. Optional `reason` and `note` for `did_not_happen`. |
| `DELETE` | `/outcomes/:meal_id` | Clear an outcome (mark as unrecorded). |

**Reason codes for `did_not_happen`:**

| Code | Label |
|------|-------|
| `no_shopping` | We didn't do food shopping |
| `ate_out` | We went out for a meal instead |
| `unexpected_event` | We had an unexpected event |
| `didnt_fancy_it` | We didn't fancy what we'd planned |
| `other` | Other |

### Ideas

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/ideas` | List meal ideas (most recent first, up to 50). |
| `POST` | `/ideas` | Propose an idea (`title` required, `description`, `date` optional). |
| `DELETE` | `/ideas/:id` | Delete an idea. |

### Events (day contexts)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/events` | List events. Optional `?from=` / `?to=`. |
| `POST` | `/events` | Create an event. Fields: `date`, `end_date`, `event_name`, `extra_adults`, `extra_children`, `extra_babies`. |
| `PATCH` | `/events/:id` | Update any event field. |
| `DELETE` | `/events/:id` | Delete an event. |

### Shopping list

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/shopping-list` | Ingredients from upcoming meal plans. Optional `?from=` / `?to=`. Returns `shopping_list` array with `name`, `starred`, `warning`, `meal_count`, and `meals` (which meals need it and on what date). |

---

## Keeping feature parity

The plugin aims for full feature parity with the app. Whenever a new
capability is added to Planny Planny:

1. **Add the operation** to `supabase/functions/chatgpt-plugin/index.ts`.
2. **Add the path** to `public/openapi.json`.
3. **Add a BDD scenario** to
   `tests/integration/features/chatgpt-plugin/chatgpt-plugin.feature`
   and the corresponding step definitions in
   `tests/integration/steps/chatgpt-plugin.steps.ts`.
4. **Re-deploy** the function: `supabase functions deploy chatgpt-plugin`.
5. **Update the schema** in your ChatGPT action — paste the new
   `openapi.json` into the action editor and click Save.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `"Error fetching OAuth configuration"` / `"does not implement OAuth"` | Confirm both Edge Functions are deployed and `PLUGIN_PUBLIC_URL` is set (Step 1), then re-check the two `.well-known` URLs with `curl`. If they 404, the functions aren't deployed with the latest code; if they time out, check `PLUGIN_PUBLIC_URL` points at your real project ref. |
| `401 Unauthorized` | If using manual tokens: your JWT has expired. Re-run the OAuth token request in step 2 and paste the new `access_token`. If using OAuth: check that your email/password are correct. |
| `"Invalid refresh token"` | Your refresh token has expired (usually 7 days of inactivity). Re-authenticate with your email and password to get a new token. |
| `"No household resolved"` | You haven't opened the app and navigated to a household yet, so `last_household_id` is null. Either open the app, or pass `?household_id=<uuid>` explicitly in the action schema's server URL. |
| `404 Not found` | The path or method is wrong. Check the OpenAPI spec. |
| `500` from Supabase | A database error. Check your Supabase project logs: **Dashboard → Edge Functions → chatgpt-plugin → Logs**. |
| ChatGPT says it can't find the action | The function may not be deployed, or the schema URL still contains `<YOUR_PROJECT_REF>`. Verify with the `curl` test in step 1. |

---

## Security notes

- **OAuth tokens are more secure than manual tokens** because they refresh automatically
  without exposing long-lived credentials to ChatGPT's configuration.
- The access token is a **bearer token** — treat it like a password. Anyone who
  has it can act as you within Planny Planny.
- The refresh token is long-lived and should be kept confidential. If using manual token setup,
  store it securely and rotate it every 30–90 days.
- If using OAuth, ChatGPT's token configuration is protected by OpenAI's security policies.
- The Edge Function enforces Supabase RLS on every request. It is
  **not** possible to read or write data from households you are not a
  member of, even with a valid token.
- The plugin only supports **owner / member / honoured guest** roles.
  If your role in a household is `voting_guest`, write operations will
  be rejected by RLS with a Postgres error.
