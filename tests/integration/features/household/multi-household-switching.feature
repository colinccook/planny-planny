Feature: Switching between multiple households
  A user that belongs to two households must be able to use the
  Settings panel to (a) see both, (b) switch the active household,
  and (c) have that choice remembered as their new default — both on
  the same device after sign-out and on a fresh device that has never
  seen them before. The cross-device persistence is the whole point of
  the `last_household_id` column on `profiles`; without it, switching
  households on a phone is forgotten the next time you open the app on
  a laptop.

  These scenarios are deliberately a regression net for the
  "Settings panel renders blank for a multi-household user" bug
  introduced when last-household persistence was added.

  Background:
    Given I am signed in as a user who owns "Cook Family" and is a member of "Beach House"

  Scenario: User with two households can switch the active one from Settings
    When I open the settings page
    Then the Settings panel renders with both households listed in My Memberships
    And the Current Household selector shows "Cook Family"
    When I switch the Current Household to "Beach House"
    Then the Current Household selector shows "Beach House"
    And the "(viewing)" indicator in My Memberships moves to "Beach House"

  Scenario: The chosen household is remembered as the default after sign-out and back in
    When I open the settings page
    And I switch the Current Household to "Beach House"
    And I sign out and sign back in
    And I open the settings page
    Then the Current Household selector shows "Beach House"

  Scenario: The chosen household is remembered across devices
    When I open the settings page
    And I switch the Current Household to "Beach House"
    And I sign in to the same account from a fresh browser context
    And I open the settings page
    Then the Current Household selector shows "Beach House"

  Scenario Outline: Either household can be made the default across devices
    When I open the settings page
    And I switch the Current Household to "<choice>"
    And I sign in to the same account from a fresh browser context
    And I open the settings page
    Then the Current Household selector shows "<choice>"

    Examples:
      | choice      |
      | Cook Family |
      | Beach House |
