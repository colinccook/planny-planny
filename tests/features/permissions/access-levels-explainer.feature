Feature: Access Levels — explainer tray
  Every place in the app where a role decision is made surfaces a
  "What do these levels mean?" link. Tapping it opens a tray that
  spells out exactly what each of the five levels can and cannot
  do, so users understand the privileges they're being granted or
  granting.

  Background:
    Given I navigate to a shared household page with an invalid token

  Scenario: The explainer link is reachable from the public share page
    Then I should see the access levels link

  Scenario: Opening the explainer tray lists every access level
    When I open the access levels tray
    Then the access levels tray should be visible
    And the access levels tray should describe the "Owner" level
    And the access levels tray should describe the "Member" level
    And the access levels tray should describe the "Honoured Guest" level
    And the access levels tray should describe the "Voting Guest" level
    And the access levels tray should describe the "Public Link" level

  Scenario: The explainer tray spells out the key capabilities for each level
    When I open the access levels tray
    Then the "Owner" card should say it can "Remove other members"
    And the "Member" card should say it can "Invite new members"
    And the "Honoured Guest" card should say it cannot "Invite new members"
    And the "Voting Guest" card should say it cannot "Propose meal ideas"
    And the "Public Link" card should say it cannot "See who voted"
