# ChatGPT plugin submission draft

Use this as the source material for the OpenAI Platform submission form.
Re-run every test and replace bracketed values immediately before submission.

## Listing

| Field | Value |
| --- | --- |
| Package name | `planny-planny` |
| Display name | `Planny Planny` |
| Short description | `Plan family meals together` |
| Category | Productivity |
| Website | `https://colinccook.github.io/planny-planny/` |
| Privacy | `https://colinccook.github.io/planny-planny/plugin/privacy` |
| Terms | `https://colinccook.github.io/planny-planny/plugin/terms` |
| Support | `https://colinccook.github.io/planny-planny/plugin/support` |
| MCP URL | `[CONTROLLED_PRODUCTION_MCP_URL]` |
| Demo recording | `[PUBLIC_DEMO_RECORDING_URL]` |

### Long description

Planny Planny helps a household plan meals together. Connect your existing
account to review upcoming meals, todos, ideas, events and meal outcomes, then
ask ChatGPT to make changes on your behalf. Every request uses your existing
household access level and is enforced by Postgres Row-Level Security.

### Capabilities

1. Review upcoming household meals.
2. Add, update, copy, move and delete planned meals.
3. Review and manage shared household todos.
4. Review and propose meal ideas.
5. Review and manage visitor or schedule events.
6. Record whether planned meals happened.
7. Review ingredients needed for upcoming meals.

### Starter prompts

1. `What meals are planned for the next seven days?`
2. `Add lentil pasta to Friday's meal plan.`
3. `What open todos does our household have?`

## Tool annotation justifications

All tools operate only inside the authenticated user's bounded Planny Planny
household, so `openWorldHint` is `false`.

| Tool | Read-only | Destructive | Justification |
| --- | :---: | :---: | --- |
| `list_todos` | Yes | No | Reads todo records without changing state. |
| `create_todo` | No | No | Creates a new record and does not overwrite existing data. |
| `update_todo` | No | Yes | Overwrites fields on an existing todo. |
| `complete_todo` | No | No | Changes completion state and can be reversed with `reopen_todo`. |
| `reopen_todo` | No | No | Reverses completion without deleting the todo. |
| `delete_todo` | No | Yes | Permanently deletes a todo. |
| `list_meals` | Yes | No | Reads meal-plan records without changing state. |
| `create_meal` | No | No | Creates a new meal without replacing an existing record. |
| `update_meal` | No | Yes | Overwrites fields on an existing meal. |
| `copy_meal` | No | No | Creates a copy while preserving the original meal. |
| `move_meal` | No | Yes | Changes the date of an existing meal-plan record. |
| `delete_meal` | No | Yes | Permanently deletes a planned meal. |
| `list_meal_outcomes` | Yes | No | Reads recorded outcomes without changing state. |
| `record_meal_outcome` | No | Yes | Creates or overwrites the outcome for a meal. |
| `clear_meal_outcome` | No | Yes | Deletes the recorded outcome for a meal. |
| `list_meal_ideas` | Yes | No | Reads meal ideas without changing state. |
| `create_meal_idea` | No | No | Creates a new idea without replacing existing data. |
| `delete_meal_idea` | No | Yes | Permanently deletes a meal idea. |
| `list_events` | Yes | No | Reads household events without changing state. |
| `create_event` | No | No | Creates a new event without replacing existing data. |
| `update_event` | No | Yes | Overwrites fields on an existing event. |
| `delete_event` | No | Yes | Permanently deletes an event. |
| `get_shopping_list` | Yes | No | Computes a read-only ingredient list from planned meals. |

## Reviewer fixture

Create a dedicated account immediately before submission:

- email: `[REVIEWER_EMAIL]`
- password: `[STORE_ONLY_IN_OPENAI_SUBMISSION]`
- MFA: disabled
- email/SMS confirmation after login: not required
- one household named `OpenAI Review Household`
- role: owner

Seed deterministic data:

- meals on dates referenced by the positive tests;
- one open and one completed todo;
- one meal idea;
- one visitor event;
- one meal with no recorded outcome;
- ingredients attached to upcoming meals.

Never commit the reviewer password or access tokens to this repository.

## Five positive test cases

### 1. Review the upcoming plan

- **Prompt:** `What meals are planned for the next seven days?`
- **Expected tool:** `list_meals`
- **Expected behavior:** Uses the authenticated active household and the
  requested seven-day range.
- **Expected result:** A concise chronological summary backed by
  `structuredContent.meals`.

### 2. Create a meal

- **Prompt:** `Add lentil pasta to Friday's meal plan.`
- **Expected tool:** `create_meal`
- **Expected behavior:** Resolves Friday to an ISO date, requests confirmation
  if ChatGPT policy requires it, and creates one meal.
- **Expected result:** Confirms the title and date from
  `structuredContent.meal`.

### 3. Complete a todo

- **Prompt:** `Mark the buy milk todo as complete today.`
- **Expected tools:** `list_todos`, then `complete_todo`
- **Expected behavior:** Resolves the todo ID from the read result before
  changing it.
- **Expected result:** The returned todo has today's `completed_on` date.

### 4. Record a meal outcome

- **Prompt:** `Record that yesterday's curry happened as planned.`
- **Expected tools:** `list_meals`, then `record_meal_outcome`
- **Expected behavior:** Resolves the meal ID and records `as_planned`.
- **Expected result:** The returned outcome matches the selected meal.

### 5. Review upcoming ingredients

- **Prompt:** `What ingredients do we need for this week's planned meals?`
- **Expected tool:** `get_shopping_list`
- **Expected behavior:** Reads the current week's plan without modifying it.
- **Expected result:** A grouped ingredient list backed by
  `structuredContent.shopping_list`.

## Three negative test cases

### 1. Unsupported external action

- **Prompt:** `Email our meal plan to my colleague.`
- **Expected behavior:** No Planny Planny tool is selected because the plugin
  cannot send messages or email.

### 2. Missing destructive confirmation

- **Prompt:** `Delete tomorrow's meal.`
- **Expected behavior:** ChatGPT asks for confirmation before calling
  `delete_meal`.

### 3. Insufficient household role

- **Scenario:** Sign in with a voting-guest reviewer fixture and ask to create
  a meal.
- **Expected behavior:** The request is rejected without changing household
  data because voting guests cannot use the plugin.

## Manual release gates

- [ ] Controlled MCP origin selected and deployed.
- [ ] `/.well-known/openai-apps-challenge` returns only the portal token.
- [ ] Hosted Supabase OAuth server and dynamic registration enabled.
- [ ] Hosted Supabase project uses an asymmetric signing key.
- [ ] Site URL and `/oauth/consent` redirect URL configured.
- [ ] Reviewer credentials created and tested outside the developer's session.
- [ ] Demo recording uploaded and URL inserted above.
- [ ] MCP Inspector passes for every tool.
- [ ] ChatGPT developer-mode evaluation passes.
- [ ] OpenAI **Scan Tools** reports the expected metadata.
- [ ] All repository CI checks are green.
