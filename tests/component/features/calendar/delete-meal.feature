Feature: Delete Meal
  As a user I want to delete a meal from a day
  so I can remove meals I no longer plan to cook

  Background:
    Given a day detail view with the following meals:
      | title            | description     |
      | Chicken Stir Fry | With noodles    |
      | Pasta Carbonara  | Classic Italian |

  Scenario: Delete button is visible on each meal card
    Then I should see a delete button on "Chicken Stir Fry"
    And I should see a delete button on "Pasta Carbonara"

  Scenario: First tap on delete shows confirmation
    When I tap the delete button on "Chicken Stir Fry"
    Then I should see a confirmation message on "Chicken Stir Fry"
    And the delete button on "Chicken Stir Fry" should show a confirm icon

  Scenario: Second tap on delete removes the meal
    When I tap the delete button on "Chicken Stir Fry"
    And I tap the delete button on "Chicken Stir Fry" again to confirm
    Then the meal "Chicken Stir Fry" should be removed
    And I should still see the meal "Pasta Carbonara"

  Scenario: Cancel button dismisses the confirmation
    When I tap the delete button on "Chicken Stir Fry"
    And I tap the cancel button on "Chicken Stir Fry"
    Then I should not see a confirmation message on "Chicken Stir Fry"
    And I should still see the meal "Chicken Stir Fry"

  Scenario: Edit button is visible on each meal card
    Then I should see an edit button on "Chicken Stir Fry"

  Scenario: Guest users do not see delete or edit buttons
    Given a day detail view as a guest with the following meals:
      | title            | description     |
      | Chicken Stir Fry | With noodles    |
    Then I should not see a delete button on "Chicken Stir Fry"
    And I should not see an edit button on "Chicken Stir Fry"
