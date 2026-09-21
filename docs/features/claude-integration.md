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

## Tests

All scenarios for this feature are tagged `@ClaudeIntegration`
([DR-019](../drs/dr-019-feature-tags.md)):

- [Search the repository for `@ClaudeIntegration`](https://github.com/search?q=repo%3Acolinccook%2Fplanny-planny+%22%40ClaudeIntegration%22&type=code)
