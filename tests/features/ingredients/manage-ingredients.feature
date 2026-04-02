Feature: Manage Ingredients

  Scenario: Ingredients page requires authentication
    Given I navigate to the ingredients page
    Then I should be redirected to the login page

  Scenario: Ingredients page is a protected route
    When I visit "/ingredients" without being logged in
    Then I should see the login form
