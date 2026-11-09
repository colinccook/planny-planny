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
5. Ask for inspiration from your own history: "what haven't we eaten for a
   while?", "what are our most common ingredients?" or "suggest meals based
   on what we've cooked this year". The assistant calls `get_meal_history`
   and `get_ingredient_stats`, which return one compact entry per dish or
   ingredient rather than every planned day.

## History and inspiration tools

- `get_meal_history` (read-only; defaults to the past year) returns one
  entry per dish: `times_planned`, `first_planned`, `last_planned`,
  `days_since_last_planned`, `times_as_planned`, `times_did_not_happen` and
  the `ingredients` used. Dishes are ordered longest-unplanned first.
  Titles are grouped case- and whitespace-insensitively; near-duplicate
  names are left for the assistant to merge.
- `get_ingredient_stats` (read-only; defaults to the past year) ranks
  household ingredients by `meal_count`, with `last_used`, up to three
  `example_meals`, and the `starred` / `warning` flags. Ingredients never
  used in the range appear with a count of zero.
- `list_meals` now includes each meal's ingredient names and is paged:
  pass `limit` (default 100, max 365) and follow `next_from` while
  `has_more` is true. Pages end on a date boundary.
- Every tool's text content contains the full JSON result, not just an item
  count, so clients that ignore `structuredContent` still see the data.

See [dr-022](../drs/dr-022-mcp-data-volume.md) for the sizing rationale.

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
