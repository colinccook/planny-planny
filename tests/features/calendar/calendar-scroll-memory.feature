Feature: Calendar Scroll Memory and Return To Today
  As a user planning meals weeks ahead
  I want the calendar to remember where I was when I dip into a day
  and to surface a "Return to today" button when I'm scrolled far down
  so it stays effortless to navigate a long-running plan

  Background:
    Given I open a page with a stub calendar of 30 days

  Scenario: Return-to-today button is hidden near the top
    Then I should not see the return-to-today button

  Scenario: Return-to-today button appears after scrolling far enough
    When I scroll the calendar to 1200 pixels
    Then I should see the return-to-today button

  Scenario: Tapping return-to-today scrolls back to the top
    When I scroll the calendar to 1200 pixels
    And I click the return-to-today button
    Then the calendar should be scrolled to the top

  Scenario: Calendar persists scroll position to session storage
    When I scroll the calendar to 600 pixels
    Then the saved calendar scroll position should be 600 pixels
