# @ChatGPTPlugin

The MCP plugin, OAuth, tools, and plugin information.

## Why it matters

This capability helps a household plan, decide, or collaborate with less friction. The value is measured by the user journey below: a person can discover the capability, complete the task, and see the result reflected in the shared meal-planning experience.

## User journey

1. Connect the MCP plugin and approve OAuth consent.
2. Use the same active household as the app, or call `list_households` to
   discover your memberships and current selection.
3. If necessary, confirm a household choice with `switch_household`. The
   selection is shared with the app and other devices; a sole membership
   works automatically without a saved choice.
4. Plan meals, manage todos, ideas and events, and record outcomes within
   that household. Existing role checks and RLS still apply.

See [Claude household tools and permissions](claude-integration.md#household-tools-and-permissions)
for the shared tool contracts, role restrictions and explicit-URL override.

## Screenshots and visual walkthrough

Capture these states at the mobile viewport (390×844) and add the resulting images under `docs/screenshots/chat-g-p-t-plugin/`:

| State | Suggested filename |
| --- | --- |
| Entry point | `01-entry.png` |
| In-progress or empty state | `02-in-progress.png` |
| Completed state | `03-complete.png` |
| Edge case or permission state | `04-edge-case.png` |

The Playwright BDD scenarios are the source of truth for the journey. A scenario can save a snapshot with `await page.screenshot({ path: 'docs/screenshots/chat-g-p-t-plugin/04-edge-case.png', fullPage: true })`; keep screenshots deterministic and refresh them when the behaviour changes.

## Tests and implementation

- [Search all `@ChatGPTPlugin` references](https://github.com/colinccook/planny-planny/search?q=@ChatGPTPlugin&type=code)
- [Search the feature directory](../features.md)

## Maintenance

Update this page, its screenshots, and the linked scenarios whenever the user journey or value proposition changes.
