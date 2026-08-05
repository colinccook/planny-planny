# ChatGPT Plugin Setup Guide

Connect Planny Planny to ChatGPT so you can manage your household
meal plan and todo list through natural conversation.

> **Who can use it?** Owners, members, and honoured guests.
> Voting guests and public-link viewers cannot use the plugin because
> it exposes write operations.

---

## What you can do via ChatGPT

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

## One-time setup

### 1. Deploy the Edge Function

From the repository root, deploy to your Supabase project:

```bash
supabase functions deploy chatgpt-plugin --project-ref <YOUR_PROJECT_REF>
```

Your project reference is the short ID in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>`.

Verify it's live:

```bash
curl -i https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chatgpt-plugin/todos \
  -H "Authorization: ******
```

You should get a `401 Unauthorized` (no JWT yet) — that confirms the
function is deployed and the auth guard is working.

---

### 2. Get your Supabase user JWT

The plugin needs a JWT that proves who you are. Obtain one by signing
in to Supabase's Auth REST API with your Planny Planny email and
password:

```bash
curl -X POST \
  'https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <YOUR_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"your-password"}'
```

The response contains `access_token` — copy it. This is your JWT.

> **Where is my anon key?**
> Supabase dashboard → Project Settings → API → **Project API keys** →
> `anon` `public` key.

> **How long does the JWT last?**
> By default Supabase JWTs expire after one hour. When yours expires,
> repeat this step to get a fresh `access_token`. You can also set
> `JWT_EXPIRY` in your Supabase project Auth settings to a longer
> value (e.g. `604800` for 7 days).

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

   **Authentication**: choose **API Key** → **Auth type: Bearer** →
   paste the JWT you obtained in step 2.

4. Click **Test** on any operation to verify ChatGPT can reach the
   function. A `200` response with an empty array is a success.

5. Click **Save**.

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
| `401 Unauthorized` | Your JWT has expired. Re-run the `curl` sign-in command in step 2 and paste the new `access_token` into the ChatGPT action. |
| `"No household resolved"` | You haven't opened the app and navigated to a household yet, so `last_household_id` is null. Either open the app, or pass `?household_id=<uuid>` explicitly in the action schema's server URL. |
| `404 Not found` | The path or method is wrong. Check the OpenAPI spec. |
| `500` from Supabase | A database error. Check your Supabase project logs: **Dashboard → Edge Functions → chatgpt-plugin → Logs**. |
| ChatGPT says it can't find the action | The function may not be deployed, or the schema URL still contains `<YOUR_PROJECT_REF>`. Verify with the `curl` test in step 1. |

---

## Security notes

- The JWT is a **bearer token** — treat it like a password. Anyone who
  has it can act as you within Planny Planny.
- JWTs are stored in ChatGPT's action configuration. Use a
  long-expiry JWT only if you understand the risk; rotating it monthly
  is a reasonable default.
- The Edge Function enforces Supabase RLS on every request. It is
  **not** possible to read or write data from households you are not a
  member of, even with a valid JWT.
- The plugin only supports **owner / member / honoured guest** roles.
  If your role in a household is `voting_guest`, write operations will
  be rejected by RLS with a Postgres error.
