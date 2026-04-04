Feature: Plan Streak Display

  Scenario: Plan streak is not shown on unauthenticated pages
    Given I am on the login page
    Then I should not see a plan streak counter
