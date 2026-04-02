Feature: Household Switcher

  Scenario: Settings page requires authentication to access switcher
    Given I am not authenticated
    When I navigate to the settings page
    Then I should be redirected to the login page
