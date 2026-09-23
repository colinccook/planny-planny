# UI components (`!UiComponents`)

Rendered components and user-facing surfaces have stable, case-sensitive
PascalCase `!UiComponent` markers. Search the repository for a marker to find
tests that render or drive that UI. The source link is the authoritative
implementation; components without a marker in a test do not yet have direct
coverage.

## Authentication and layout

| Component | Source |
| --- | --- |
| !LoginForm | [`LoginForm.tsx`](../src/components/auth/LoginForm.tsx) |
| !RegisterForm | [`RegisterForm.tsx`](../src/components/auth/RegisterForm.tsx) |
| !SuccessfulMealsHeadline | [`SuccessfulMealsHeadline.tsx`](../src/components/auth/SuccessfulMealsHeadline.tsx) |
| !AppShell | [`AppShell.tsx`](../src/components/layout/AppShell.tsx) |
| !ProtectedRoute | [`ProtectedRoute.tsx`](../src/components/layout/ProtectedRoute.tsx) |
| !TabBar | [`TabBar.tsx`](../src/components/layout/TabBar.tsx) |

## Calendar

| Component | Source |
| --- | --- |
| !AddMealView | [`AddMealView.tsx`](../src/components/calendar/AddMealView.tsx) |
| !CalendarView | [`CalendarView.tsx`](../src/components/calendar/CalendarView.tsx) |
| !CopyMealTray | [`CopyMealTray.tsx`](../src/components/calendar/CopyMealTray.tsx) |
| !DayContextBadge | [`DayContextBadge.tsx`](../src/components/calendar/DayContextBadge.tsx) |
| !DayContextForm | [`DayContextForm.tsx`](../src/components/calendar/DayContextForm.tsx) |
| !DayDetailView | [`DayDetailView.tsx`](../src/components/calendar/DayDetailView.tsx) |
| !DayEventsSection | [`DayEventsSection.tsx`](../src/components/calendar/DayEventsSection.tsx) |
| !DayHeaderStrip | [`DayHeaderStrip.tsx`](../src/components/calendar/DayHeaderStrip.tsx) |
| !DayIdeasSection | [`DayIdeasSection.tsx`](../src/components/calendar/DayIdeasSection.tsx) |
| !DayMealsSection | [`DayMealsSection.tsx`](../src/components/calendar/DayMealsSection.tsx) |
| !DayRow | [`DayRow.tsx`](../src/components/calendar/DayRow.tsx) |
| !MealCard | [`MealCard.tsx`](../src/components/calendar/MealCard.tsx) |
| !MealPlanForm | [`MealPlanForm.tsx`](../src/components/calendar/MealPlanForm.tsx) |
| !MealPromptGenerator | [`MealPromptGenerator.tsx`](../src/components/calendar/MealPromptGenerator.tsx) |
| !OutcomeButton | [`OutcomeButton.tsx`](../src/components/calendar/OutcomeButton.tsx) |
| !OutcomeTray | [`OutcomeTray.tsx`](../src/components/calendar/OutcomeTray.tsx) |
| !SwipeableDay | [`SwipeableDay.tsx`](../src/components/calendar/SwipeableDay.tsx) |
| !TodoDetailView | [`TodoDetailView.tsx`](../src/components/calendar/TodoDetailView.tsx) |
| !TodoList | [`TodoList.tsx`](../src/components/calendar/TodoList.tsx) |

## Ingredients and cupboard

| Component | Source |
| --- | --- |
| !AddIngredientForm | [`AddIngredientForm.tsx`](../src/components/ingredients/AddIngredientForm.tsx) |
| !IngredientSuggestions | [`IngredientSuggestions.tsx`](../src/components/ingredients/IngredientSuggestions.tsx) |
| !IngredientTag | [`IngredientTag.tsx`](../src/components/ingredients/IngredientTag.tsx) |
| !IngredientsList | [`IngredientsList.tsx`](../src/components/ingredients/IngredientsList.tsx) |
| !CupboardHeader | [`CupboardHeader.tsx`](../src/components/store-cupboard/CupboardHeader.tsx) |
| !CupboardList | [`CupboardList.tsx`](../src/components/store-cupboard/CupboardList.tsx) |
| !SwipeableRow | [`SwipeableRow.tsx`](../src/components/store-cupboard/SwipeableRow.tsx) |

## Settings

| Component | Source |
| --- | --- |
| !AccessLevelsLink | [`AccessLevelsLink.tsx`](../src/components/settings/AccessLevelsLink.tsx) |
| !AccessLevelsList | [`AccessLevelsList.tsx`](../src/components/settings/AccessLevelsList.tsx) |
| !AddToClaude | [`AddToClaude.tsx`](../src/components/settings/AddToClaude.tsx) |
| !ConnectedApps | [`ConnectedApps.tsx`](../src/components/settings/ConnectedApps.tsx) |
| !CreateHouseholdForm | [`CreateHouseholdForm.tsx`](../src/components/settings/CreateHouseholdForm.tsx) |
| !DayPlaceholders | [`DayPlaceholders.tsx`](../src/components/settings/DayPlaceholders.tsx) |
| !DeleteAccount | [`DeleteAccount.tsx`](../src/components/settings/DeleteAccount.tsx) |
| !DeleteHousehold | [`DeleteHousehold.tsx`](../src/components/settings/DeleteHousehold.tsx) |
| !HouseholdSettings | [`HouseholdSettings.tsx`](../src/components/settings/HouseholdSettings.tsx) |
| !HouseholdSwitcher | [`HouseholdSwitcher.tsx`](../src/components/settings/HouseholdSwitcher.tsx) |
| !InviteManager | [`InviteManager.tsx`](../src/components/settings/InviteManager.tsx) |
| !MemberList | [`MemberList.tsx`](../src/components/settings/MemberList.tsx) |
| !MyMemberships | [`MyMemberships.tsx`](../src/components/settings/MyMemberships.tsx) |
| !PreferencesSettings | [`PreferencesSettings.tsx`](../src/components/settings/PreferencesSettings.tsx) |
| !PublicShareToggle | [`PublicShareToggle.tsx`](../src/components/settings/PublicShareToggle.tsx) |
| !RoleBadge | [`RoleBadge.tsx`](../src/components/settings/RoleBadge.tsx) |

## Reusable UI

| Component | Source |
| --- | --- |
| !CollapsibleSection | [`CollapsibleSection.tsx`](../src/components/ui/CollapsibleSection.tsx) |
| !ErrorBoundary | [`ErrorBoundary.tsx`](../src/components/ui/ErrorBoundary.tsx) |
| !FullScreenView | [`FullScreenView.tsx`](../src/components/ui/FullScreenView.tsx) |
| !HeaderCountBadge | [`HeaderCountBadge.tsx`](../src/components/ui/HeaderCountBadge.tsx) |
| !NumberStepper | [`NumberStepper.tsx`](../src/components/ui/NumberStepper.tsx) |
| !OverlayProvider | [`OverlayProvider.tsx`](../src/components/ui/OverlayProvider.tsx) |
| !ReactionButton | [`ReactionButton.tsx`](../src/components/ui/ReactionButton.tsx) |
| !Skeleton | [`Skeleton.tsx`](../src/components/ui/Skeleton.tsx) |
| !Toast | [`Toast.tsx`](../src/components/ui/Toast.tsx) |
| !Tray | [`Tray.tsx`](../src/components/ui/Tray.tsx) |
| !VerticalSelector | [`VerticalSelector.tsx`](../src/components/ui/VerticalSelector.tsx) |

## Route surfaces

| Component | Source |
| --- | --- |
| !CalendarPage | [`CalendarPage.tsx`](../src/pages/CalendarPage.tsx) |
| !IngredientsPage | [`IngredientsPage.tsx`](../src/pages/IngredientsPage.tsx) |
| !JoinInvitePage | [`JoinInvitePage.tsx`](../src/pages/JoinInvitePage.tsx) |
| !OAuthConsentPage | [`OAuthConsentPage.tsx`](../src/pages/OAuthConsentPage.tsx) |
| !PluginInformationPage | [`PluginInformationPage.tsx`](../src/pages/PluginInformationPage.tsx) |
| !PublicHouseholdPage | [`PublicHouseholdPage.tsx`](../src/pages/PublicHouseholdPage.tsx) |
| !SettingsPage | [`SettingsPage.tsx`](../src/pages/SettingsPage.tsx) |
