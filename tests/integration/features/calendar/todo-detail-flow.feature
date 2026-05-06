Feature: Todo Detail Flow
  As a user I want to manage a todo (rename, reschedule, add a
  note, delete it) on a dedicated full-screen view that I open
  by tapping the todo's name on the day list.

  Scenario: Add todo page requires authentication
    When I visit "/calendar/2026-04-06/todos/add" without being logged in
    Then I should see the login form

  Scenario: Edit todo page requires authentication
    When I visit "/calendar/2026-04-06/todos/edit/some-id" without being logged in
    Then I should see the login form
