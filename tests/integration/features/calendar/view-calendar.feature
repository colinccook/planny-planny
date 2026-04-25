Feature: Calendar View

  Scenario: Calendar page requires authentication
    Given I navigate to the calendar page
    Then I should be redirected to the login page

  Scenario: Calendar page is a protected route
    When I visit "/calendar" without being logged in
    Then I should see the login form
