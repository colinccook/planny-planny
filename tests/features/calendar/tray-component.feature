Feature: Tray Component
  As a user I want to interact with tray components
  that slide in from the top and can be dismissed

  Scenario: Tray opens and displays content
    Given I open a page with a tray component
    When I click the trigger button
    Then the tray should be visible
    And the tray should have a close button

  Scenario: Tray closes via X button
    Given I open a page with a tray component
    When I click the trigger button
    And I click the tray close button
    Then the tray should not be visible

  Scenario: Tray closes on backdrop click
    Given I open a page with a tray component
    When I click the trigger button
    And I click the tray backdrop
    Then the tray should not be visible

  Scenario: Tray shows title and description
    Given I open a page with a tray component
    When I click the trigger button
    Then the tray should display the title "Test Tray"
    And the tray should display the description "A helpful description"

  Scenario: Tray is dismissable by swiping down
    Given I open a page with a tray component
    When I click the trigger button
    And I swipe down on the tray panel
    Then the tray should not be visible
