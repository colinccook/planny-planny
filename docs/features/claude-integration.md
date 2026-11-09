# @ClaudeIntegration

Add Planny Planny to the Claude app as a **custom MCP connector** and
manage your household meal plan by chatting with Claude.

## What it does

- The remote MCP server that powers the [ChatGPT
  plugin](../chatgpt-plugin.md) is a standard **Streamable HTTP**
  endpoint with **OAuth 2.1 dynamic client registration** — exactly what
  Claude's *Add custom connector* screen expects.
- An **Add to Claude** card on the in-app Settings page walks through
  the setup and offers a one-tap copy of the server URL.
- Claude follows the active household shared with the app. A sole household
  works automatically, even if you have never manually selected it.
- Ask Claude to **list my households** or **switch to another household**;
  you no longer need to open the app just to choose one.
- Ask Claude **"what haven't we eaten for a while?"**, **"what are our
  most-used ingredients?"** or **"suggest some meals based on our
  history"**. The `get_meal_history` and `get_ingredient_stats` tools
  summarise a year of planning as one entry per dish or ingredient, so
  Claude can reason about rotation and variety without reading every day
  (see [@ChatGPTPlugin → History and inspiration tools](chatgpt-plugin.md#history-and-inspiration-tools)).

## How to connect

1. In Claude, open **Settings → Connectors → Add custom connector**.
2. Name it **Planny Planny** and paste the server URL from the Settings
   card (`https://<api-origin>/functions/v1/chatgpt-plugin/mcp`).
3. Turn on **Requires sign-in**; leave the client ID and client secret
   blank — the server registers Claude automatically.
4. Sign in with your Planny Planny account and approve the consent
   screen.

Your household permissions still apply to every tool call (RLS plus the
plugin's role checks), and access is revocable from **Connected apps**
in Settings.

## User journey

1. Open **Settings → Add to Claude** in Planny Planny.
2. Copy the displayed MCP server URL.
3. Add it as a custom connector in Claude and enable sign-in.
4. Complete OAuth consent, then ask Claude to work with the household plan.
5. Ask Claude to list households and, if needed, choose one by name. Switching
   updates the app and other signed-in devices too.
6. Ask for meal inspiration from the household's own history — which dishes
   are overdue, which ingredients dominate, and what to eat more of.
7. Revoke access later from **Connected apps** when the connector is no longer
   needed.

## Household tools and permissions

- `list_households` needs sign-in but no active household. It returns your
  memberships with `id`, `name`, `role`, `can_use_plugin`, and an
  `active_household_id` (or `null`). It never lists another user's memberships.
- `switch_household` takes a `household_id` from that list and saves
  `profiles.last_household_id`, the same preference used by the app. Confirm
  the switch before proceeding: later meal, todo, idea and event calls use it.
- Owners, members and honoured guests may select and use a household through
  the connector. Voting guests may discover their memberships but cannot
  select a restricted household or use its planning tools. Public links do
  not grant connector access.
- When several households exist without a valid saved choice, Claude asks
  which to use rather than guessing. When there is only one, it is used
  automatically. A stale preference never grants access to a former household.

The app publishes automatic selections after loading preferences, and both
surfaces follow later changes. Existing `?household_id=` MCP URLs still pin
planning calls to that household; omit the parameter to follow the shared
selection.

## Screenshots and visual walkthrough

The app's [shared household selection](../screenshots/households/05-shared-selection.png)
is captured at 390×844 by the household-switching BDD regression.

Capture the entry card, copied-URL state, OAuth consent, successful connector,
and revoked-access state at 390×844 under
`docs/screenshots/claude-integration/`. Playwright can create a deterministic
snapshot with:

```ts
await page.screenshot({
  path: 'docs/screenshots/claude-integration/01-add-to-claude.png',
  fullPage: true,
});
```

Refresh these images whenever the setup journey changes.

## Tests

All scenarios for this feature are tagged `@ClaudeIntegration`
([DR-019](../drs/dr-019-feature-tags.md)):

- [Search the repository for `@ClaudeIntegration`](https://github.com/search?q=repo%3Acolinccook%2Fplanny-planny+%22%40ClaudeIntegration%22&type=code)

## Maintenance

Keep this page, its screenshots, and the linked scenarios current when the
connector setup, OAuth flow, or permission behaviour changes.
