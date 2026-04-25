Feature: Day Detail View
  As a user I want to tap a day to see a full-screen detail view
  so I can manage meals for that day

  Scenario: Day detail view requires authentication
    When I visit "/calendar/2026-04-06" without being logged in
    Then I should see the login form

  Scenario: Day detail page is a protected route
    Given I navigate to a day detail page
    Then I should be redirected to the login page
