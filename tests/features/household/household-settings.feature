Feature: Household Settings

  Scenario: Settings page redirects to login when not authenticated
    Given I am not authenticated
    When I navigate to the settings page
    Then I should be redirected to the login page
