Feature: Add Meal Flow
  As a user I want to add a meal through a full-screen form
  with tray components for each field

  Scenario: Add meal page requires authentication
    When I visit "/calendar/2026-04-06/add" without being logged in
    Then I should see the login form

  Scenario: Edit meal page requires authentication
    When I visit "/calendar/2026-04-06/edit/some-id" without being logged in
    Then I should see the login form
