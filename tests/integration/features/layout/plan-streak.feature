Feature: Plan Streak Display

  Scenario: Plan streak counter is not shown on the login page
    Given I am on the login page
    Then I should not see a plan streak counter

  Scenario: Plan streak counter is not shown on the registration page
    Given I am on the registration page
    Then I should not see a plan streak counter
