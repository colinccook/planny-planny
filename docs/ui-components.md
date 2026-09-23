# UI components (`!UiComponents`)

Rendered components and user-facing surfaces have stable, case-sensitive
PascalCase `!UiComponent` markers. Search the repository for a marker to find
tests that render or drive that UI. The source link is the authoritative
implementation; components without a marker in a test do not yet have direct
coverage.

## Authentication and layout

| Component | Source |
| --- | --- |
| [!LoginForm](components/login-form.md) | [`LoginForm.tsx`](../src/components/auth/LoginForm.tsx) |
| [!RegisterForm](components/register-form.md) | [`RegisterForm.tsx`](../src/components/auth/RegisterForm.tsx) |
| [!SuccessfulMealsHeadline](components/successful-meals-headline.md) | [`SuccessfulMealsHeadline.tsx`](../src/components/auth/SuccessfulMealsHeadline.tsx) |
| [!AppShell](components/app-shell.md) | [`AppShell.tsx`](../src/components/layout/AppShell.tsx) |
| [!ProtectedRoute](components/protected-route.md) | [`ProtectedRoute.tsx`](../src/components/layout/ProtectedRoute.tsx) |
| [!TabBar](components/tab-bar.md) | [`TabBar.tsx`](../src/components/layout/TabBar.tsx) |

## Calendar

| Component | Source |
| --- | --- |
| [!AddMealView](components/add-meal-view.md) | [`AddMealView.tsx`](../src/components/calendar/AddMealView.tsx) |
| [!CalendarView](components/calendar-view.md) | [`CalendarView.tsx`](../src/components/calendar/CalendarView.tsx) |
| [!CopyMealTray](components/copy-meal-tray.md) | [`CopyMealTray.tsx`](../src/components/calendar/CopyMealTray.tsx) |
| [!DayContextBadge](components/day-context-badge.md) | [`DayContextBadge.tsx`](../src/components/calendar/DayContextBadge.tsx) |
| [!DayContextForm](components/day-context-form.md) | [`DayContextForm.tsx`](../src/components/calendar/DayContextForm.tsx) |
| [!DayDetailView](components/day-detail-view.md) | [`DayDetailView.tsx`](../src/components/calendar/DayDetailView.tsx) |
| [!DayEventsSection](components/day-events-section.md) | [`DayEventsSection.tsx`](../src/components/calendar/DayEventsSection.tsx) |
| [!DayHeaderStrip](components/day-header-strip.md) | [`DayHeaderStrip.tsx`](../src/components/calendar/DayHeaderStrip.tsx) |
| [!DayIdeasSection](components/day-ideas-section.md) | [`DayIdeasSection.tsx`](../src/components/calendar/DayIdeasSection.tsx) |
| [!DayMealsSection](components/day-meals-section.md) | [`DayMealsSection.tsx`](../src/components/calendar/DayMealsSection.tsx) |
| [!DayRow](components/day-row.md) | [`DayRow.tsx`](../src/components/calendar/DayRow.tsx) |
| [!MealCard](components/meal-card.md) | [`MealCard.tsx`](../src/components/calendar/MealCard.tsx) |
| [!MealPlanForm](components/meal-plan-form.md) | [`MealPlanForm.tsx`](../src/components/calendar/MealPlanForm.tsx) |
| [!MealPromptGenerator](components/meal-prompt-generator.md) | [`MealPromptGenerator.tsx`](../src/components/calendar/MealPromptGenerator.tsx) |
| [!OutcomeButton](components/outcome-button.md) | [`OutcomeButton.tsx`](../src/components/calendar/OutcomeButton.tsx) |
| [!OutcomeTray](components/outcome-tray.md) | [`OutcomeTray.tsx`](../src/components/calendar/OutcomeTray.tsx) |
| [!SwipeableDay](components/swipeable-day.md) | [`SwipeableDay.tsx`](../src/components/calendar/SwipeableDay.tsx) |
| [!TodoDetailView](components/todo-detail-view.md) | [`TodoDetailView.tsx`](../src/components/calendar/TodoDetailView.tsx) |
| [!TodoList](components/todo-list.md) | [`TodoList.tsx`](../src/components/calendar/TodoList.tsx) |

## Ingredients and cupboard

| Component | Source |
| --- | --- |
| [!AddIngredientForm](components/add-ingredient-form.md) | [`AddIngredientForm.tsx`](../src/components/ingredients/AddIngredientForm.tsx) |
| [!IngredientSuggestions](components/ingredient-suggestions.md) | [`IngredientSuggestions.tsx`](../src/components/ingredients/IngredientSuggestions.tsx) |
| [!IngredientTag](components/ingredient-tag.md) | [`IngredientTag.tsx`](../src/components/ingredients/IngredientTag.tsx) |
| [!IngredientsList](components/ingredients-list.md) | [`IngredientsList.tsx`](../src/components/ingredients/IngredientsList.tsx) |
| [!CupboardHeader](components/cupboard-header.md) | [`CupboardHeader.tsx`](../src/components/store-cupboard/CupboardHeader.tsx) |
| [!CupboardList](components/cupboard-list.md) | [`CupboardList.tsx`](../src/components/store-cupboard/CupboardList.tsx) |
| [!SwipeableRow](components/swipeable-row.md) | [`SwipeableRow.tsx`](../src/components/store-cupboard/SwipeableRow.tsx) |

## Settings

| Component | Source |
| --- | --- |
| [!AccessLevelsLink](components/access-levels-link.md) | [`AccessLevelsLink.tsx`](../src/components/settings/AccessLevelsLink.tsx) |
| [!AccessLevelsList](components/access-levels-list.md) | [`AccessLevelsList.tsx`](../src/components/settings/AccessLevelsList.tsx) |
| [!AddToClaude](components/add-to-claude.md) | [`AddToClaude.tsx`](../src/components/settings/AddToClaude.tsx) |
| [!ConnectedApps](components/connected-apps.md) | [`ConnectedApps.tsx`](../src/components/settings/ConnectedApps.tsx) |
| [!CreateHouseholdForm](components/create-household-form.md) | [`CreateHouseholdForm.tsx`](../src/components/settings/CreateHouseholdForm.tsx) |
| [!DayPlaceholders](components/day-placeholders.md) | [`DayPlaceholders.tsx`](../src/components/settings/DayPlaceholders.tsx) |
| [!DeleteAccount](components/delete-account.md) | [`DeleteAccount.tsx`](../src/components/settings/DeleteAccount.tsx) |
| [!DeleteHousehold](components/delete-household.md) | [`DeleteHousehold.tsx`](../src/components/settings/DeleteHousehold.tsx) |
| [!HouseholdSettings](components/household-settings.md) | [`HouseholdSettings.tsx`](../src/components/settings/HouseholdSettings.tsx) |
| [!HouseholdSwitcher](components/household-switcher.md) | [`HouseholdSwitcher.tsx`](../src/components/settings/HouseholdSwitcher.tsx) |
| [!InviteManager](components/invite-manager.md) | [`InviteManager.tsx`](../src/components/settings/InviteManager.tsx) |
| [!MemberList](components/member-list.md) | [`MemberList.tsx`](../src/components/settings/MemberList.tsx) |
| [!MyMemberships](components/my-memberships.md) | [`MyMemberships.tsx`](../src/components/settings/MyMemberships.tsx) |
| [!PreferencesSettings](components/preferences-settings.md) | [`PreferencesSettings.tsx`](../src/components/settings/PreferencesSettings.tsx) |
| [!PublicShareToggle](components/public-share-toggle.md) | [`PublicShareToggle.tsx`](../src/components/settings/PublicShareToggle.tsx) |
| [!RoleBadge](components/role-badge.md) | [`RoleBadge.tsx`](../src/components/settings/RoleBadge.tsx) |

## Reusable UI

| Component | Source |
| --- | --- |
| [!CollapsibleSection](components/collapsible-section.md) | [`CollapsibleSection.tsx`](../src/components/ui/CollapsibleSection.tsx) |
| [!ErrorBoundary](components/error-boundary.md) | [`ErrorBoundary.tsx`](../src/components/ui/ErrorBoundary.tsx) |
| [!FullScreenView](components/full-screen-view.md) | [`FullScreenView.tsx`](../src/components/ui/FullScreenView.tsx) |
| [!HeaderCountBadge](components/header-count-badge.md) | [`HeaderCountBadge.tsx`](../src/components/ui/HeaderCountBadge.tsx) |
| [!NumberStepper](components/number-stepper.md) | [`NumberStepper.tsx`](../src/components/ui/NumberStepper.tsx) |
| [!OverlayProvider](components/overlay-provider.md) | [`OverlayProvider.tsx`](../src/components/ui/OverlayProvider.tsx) |
| [!ReactionButton](components/reaction-button.md) | [`ReactionButton.tsx`](../src/components/ui/ReactionButton.tsx) |
| [!Skeleton](components/skeleton.md) | [`Skeleton.tsx`](../src/components/ui/Skeleton.tsx) |
| [!Toast](components/toast.md) | [`Toast.tsx`](../src/components/ui/Toast.tsx) |
| [!Tray](components/tray.md) | [`Tray.tsx`](../src/components/ui/Tray.tsx) |
| [!VerticalSelector](components/vertical-selector.md) | [`VerticalSelector.tsx`](../src/components/ui/VerticalSelector.tsx) |

## Route surfaces

| Component | Source |
| --- | --- |
| [!CalendarPage](components/calendar-page.md) | [`CalendarPage.tsx`](../src/pages/CalendarPage.tsx) |
| [!IngredientsPage](components/ingredients-page.md) | [`IngredientsPage.tsx`](../src/pages/IngredientsPage.tsx) |
| [!JoinInvitePage](components/join-invite-page.md) | [`JoinInvitePage.tsx`](../src/pages/JoinInvitePage.tsx) |
| [!OAuthConsentPage](components/o-auth-consent-page.md) | [`OAuthConsentPage.tsx`](../src/pages/OAuthConsentPage.tsx) |
| [!PluginInformationPage](components/plugin-information-page.md) | [`PluginInformationPage.tsx`](../src/pages/PluginInformationPage.tsx) |
| [!PublicHouseholdPage](components/public-household-page.md) | [`PublicHouseholdPage.tsx`](../src/pages/PublicHouseholdPage.tsx) |
| [!SettingsPage](components/settings-page.md) | [`SettingsPage.tsx`](../src/pages/SettingsPage.tsx) |
