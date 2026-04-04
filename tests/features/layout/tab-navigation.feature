Feature: Tab Navigation

  Scenario: Protected tab routes redirect unauthenticated users to login
    Given I am not authenticated
    When I navigate to the calendar page
    Then I should be redirected to the login page

  Scenario: All tab routes are protected
    Given I am not authenticated
    When I navigate to the ingredients page
    Then I should be redirected to the login page
