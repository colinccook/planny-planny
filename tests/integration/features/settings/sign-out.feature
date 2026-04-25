Feature: Sign Out in Settings

  Scenario: Settings page requires authentication to access sign out
    Given I am not authenticated
    When I navigate to the settings page
    Then I should be redirected to the login page

  Scenario: Login page does not render the app header or sign out button
    Given I am on the login page
    Then the page should not contain an app header
