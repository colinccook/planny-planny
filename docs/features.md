# Product features (`@Features`)

Product features have stable, case-sensitive PascalCase `@FeatureName`
markers. Search the repository for a marker to find its BDD scenarios, unit
tests, and documentation. Every test names exactly one primary feature.

| Feature | What it covers |
| --- | --- |
| [@AIMealSuggestions](features/ai-meal-suggestions.md) | Building AI-ready meal suggestion prompts. |
| [@Authentication](features/authentication.md) | Registration, sign-in, sign-out, and protected routes. |
| [@ChatGPTPlugin](features/chatgpt-plugin.md) | The MCP plugin, OAuth, tools, and plugin information. |
| [@ClaudeIntegration](features/claude-integration.md) | Connecting the MCP server to Claude. |
| [@Headcounts](features/headcounts.md) | Household defaults and per-day adult, child, and visitor counts. |
| [@HouseholdSharing](features/household-sharing.md) | Invitations and public household links. |
| [@Households](features/households.md) | Creating, selecting, configuring, and synchronising households. |
| [@Ingredients](features/ingredients.md) | Managing, suggesting, starring, and using ingredients. |
| [@MealCalendar](features/meal-calendar.md) | Planning, viewing, copying, moving, and deleting meals by day. |
| [@MealOutcomes](features/meal-outcomes.md) | Recording whether planned meals were cooked and eaten. |
| [@MobileLayout](features/mobile-layout.md) | Navigation, overlays, mobile viewport behaviour, and reusable layout controls. |
| [@Permissions](features/permissions.md) | Access levels and role capabilities. |
| [@PlanStreak](features/plan-streak.md) | Displaying consecutive planned-day streaks. |
| [@Reactions](features/reactions.md) | Reacting to meals and ideas. |
| [@StoreCupboard](features/store-cupboard.md) | Device-local cupboard ingredients and sharing. |
| [@Todos](features/todos.md) | Household and private todo planning. |

`@ClaudeIntegration` has a dedicated feature page whose **Tests** link performs
the same repository lookup. Add a focused page under `docs/features/` when a
feature needs more explanation than this index provides.
