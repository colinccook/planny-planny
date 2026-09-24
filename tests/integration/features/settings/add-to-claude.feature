@ClaudeIntegration
# #IntegrationTesting #Frontend !AddToClaude
Feature: Add to Claude connector instructions
  The Settings page offers an "Add to Claude" card so a signed-in user
  can add Planny Planny to the Claude app as a custom MCP connector.
  The card shows the server URL to paste and explains that sign-in is
  required while the OAuth client details stay blank (the server
  supports dynamic client registration).

  Background:
    Given I am signed in as an owner of a household called "Claude Test Household"
    When I open the settings page

  Scenario: The settings page offers Claude connector instructions
    When I expand the "Add to Claude" section
    Then I see the MCP server URL to paste into Claude
    And I see that the connector requires sign-in with no client credentials
    And I see that approval creates a separate connector session
    And I capture the Add to Claude instructions

  Scenario: The server URL can be copied for the Claude app
    When I expand the "Add to Claude" section
    And I copy the server URL for Claude
    Then I see confirmation that the server URL was copied
