Feature: Store Cupboard Dismiss and Show

  Scenario: Dismissing an ingredient hides it from the list
    Given a store cupboard with the following ingredients:
      | name    | mealCount |
      | Chicken | 2         |
      | Rice    | 1         |
    When I dismiss ingredient "Chicken"
    Then I should see 1 cupboard items
    And I should not see ingredient "Chicken" in the active list

  Scenario: Show hidden reveals dismissed ingredients
    Given a store cupboard with the following ingredients:
      | name    | mealCount |
      | Chicken | 2         |
      | Rice    | 1         |
    And ingredient "Chicken" is dismissed
    When I toggle show hidden
    Then I should see 1 cupboard items
    And I should see 1 dismissed cupboard items
    And ingredient "Chicken" should appear as dismissed

  Scenario: Reset all un-hides all dismissed ingredients
    Given a store cupboard with the following ingredients:
      | name    | mealCount |
      | Chicken | 2         |
      | Rice    | 1         |
    And ingredient "Chicken" is dismissed
    And ingredient "Rice" is dismissed
    When I reset all dismissed ingredients
    Then I should see 2 cupboard items
    And I should see ingredient "Chicken" with meal count 2
    And I should see ingredient "Rice" with meal count 1

  Scenario: Undo restores a dismissed ingredient
    Given a store cupboard with the following ingredients:
      | name    | mealCount |
      | Chicken | 2         |
    And ingredient "Chicken" is dismissed
    And show hidden is enabled
    When I undo dismiss for ingredient "Chicken"
    Then I should see ingredient "Chicken" with meal count 2
    And ingredient "Chicken" should not appear as dismissed
