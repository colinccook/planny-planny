Feature: Recording meal outcomes
  As a household editor I want to record whether a planned meal
  actually happened so that the household — and the global headline
  metric — can learn what worked and what got in the way.

  Scenario: Day detail outcome flow requires authentication
    When I visit "/calendar/2026-04-06" without being logged in
    Then I should see the login form

  Scenario: The unauthenticated welcome screen does not crash without stats
    Given I am on the login page
    Then I should see the login form

  Scenario: The headline meals counter is hidden when there are no recorded outcomes
    Given I am on the login page
    Then the successful meals headline should not be visible
