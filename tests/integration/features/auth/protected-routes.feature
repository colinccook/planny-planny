Feature: Protected Routes

  Scenario: Unauthenticated user accessing calendar is redirected to login
    Given I am not authenticated
    When I navigate to the calendar page
    Then I should be redirected to the login page

  Scenario: Unauthenticated user accessing ingredients is redirected to login
    Given I am not authenticated
    When I navigate to the ingredients page
    Then I should be redirected to the login page

  Scenario: Unauthenticated user accessing settings is redirected to login
    Given I am not authenticated
    When I navigate to the settings page
    Then I should be redirected to the login page
