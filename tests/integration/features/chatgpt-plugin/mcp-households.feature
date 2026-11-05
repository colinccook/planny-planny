@ClaudeIntegration
# #IntegrationTesting #Backend #ChatGptPlugin #Frontend !LoginForm !OAuthConsentPage !SettingsPage !HouseholdSwitcher
Feature: Household selection in the Claude connector
  The connector shares the app's active household and can discover and
  change households without requiring a selection in the app first.

  Background:
    Given I am signed in as an owner of a household for the plugin

  Scenario: A sole household can receive meals without a saved selection
    When I plan a meal through the connector without a saved household selection
    Then the connector discovers my sole household and saves the meal there

  Scenario Outline: Switching in the app and connector stays in sync
    Given I have a second connector household as a "<role>"
    When I change households in the app and then through the connector
    Then both selections are shared and the next meal belongs to the chosen household

    Examples:
      | role           |
      | owner          |
      | member         |
      | honoured_guest |

  Scenario: Multiple memberships can be discovered before choosing a household
    Given I have a second connector household as a "member"
    When I ask the connector for households without a saved selection
    Then it lists my memberships and asks me to choose before planning a meal

  Scenario: A voting guest can discover memberships but cannot select a restricted household
    Given I have a second connector household as a "voting_guest"
    When I try to select a restricted or unavailable household through the connector
    Then the connector refuses both switches and keeps my original selection

  Scenario: Household discovery still requires authentication
    When I call MCP tool "list_households" without authentication
    Then the MCP response status is 401
