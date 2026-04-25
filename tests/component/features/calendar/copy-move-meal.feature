Feature: Copy and Move Meal
  As a user I want to copy or move a meal to another day
  so I can easily reschedule or duplicate planned meals

  Background:
    Given a day detail view with copyable meals:
      | title           | description       |
      | Chicken Curry   | With rice         |
      | Pasta Carbonara | Classic Italian   |

  Scenario: Copy button is visible on each meal card
    Then I should see a copy button on "Chicken Curry"
    And I should see a copy button on "Pasta Carbonara"

  Scenario: Tapping copy opens the copy tray
    When I tap the copy button on "Chicken Curry"
    Then I should see the copy tray for "Chicken Curry"
    And I should see a date picker with available days

  Scenario: Copy tray shows a move checkbox
    When I tap the copy button on "Chicken Curry"
    Then I should see a move checkbox
    And the move checkbox should be unchecked

  Scenario: User can select a target date
    When I tap the copy button on "Chicken Curry"
    And I select a target date
    Then the selected date should be highlighted
    And the confirm button should show "Copy to"

  Scenario: Toggling move changes the confirm button text
    When I tap the copy button on "Chicken Curry"
    And I select a target date
    And I check the move checkbox
    Then the confirm button should show "Move to"

  Scenario: Closing the copy tray resets state
    When I tap the copy button on "Chicken Curry"
    And I close the copy tray
    Then the copy tray should not be visible

  Scenario: Guest users do not see copy buttons
    Given a day detail view as a guest with copyable meals:
      | title           | description     |
      | Chicken Curry   | With rice       |
    Then I should not see a copy button on "Chicken Curry"
