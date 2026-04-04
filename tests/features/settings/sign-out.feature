Feature: Sign Out in Settings

  Scenario: Sign out button is visible in the Account section of Settings
    Given I am not authenticated
    When I navigate to the settings page
    Then I should be redirected to the login page

  Scenario: Header does not contain a sign out button
    Given I am on the login page
    Then I should not see a sign out button in the header
