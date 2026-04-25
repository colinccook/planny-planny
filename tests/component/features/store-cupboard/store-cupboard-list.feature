Feature: Store Cupboard List

  Scenario: Empty cupboard shows no-ingredients message
    Given a store cupboard with no ingredients
    Then I should see the message "No ingredients in your future meal plans."

  Scenario: Ingredients are displayed in a flat list
    Given a store cupboard with the following ingredients:
      | name    | mealCount |
      | Chicken | 3         |
      | Rice    | 2         |
      | Onion   | 1         |
    Then I should see 3 cupboard items
    And I should see ingredient "Chicken" with meal count 3
    And I should see ingredient "Rice" with meal count 2
    And I should see ingredient "Onion" with meal count 1

  Scenario: Tapping an ingredient expands meal details
    Given a store cupboard with the following ingredients:
      | name    | mealCount |
      | Chicken | 2         |
    And the ingredient "Chicken" has the following meals:
      | name      | date       |
      | Stir Fry  | 2026-04-15 |
      | Roast     | 2026-04-18 |
    When I tap on ingredient "Chicken"
    Then I should see the meal details for "Chicken"
    And I should see meal "Stir Fry" in the expanded details
    And I should see meal "Roast" in the expanded details

  Scenario: Warning and starred indicators are shown
    Given a store cupboard with the following ingredients:
      | name    | mealCount | warning | starred |
      | Peanuts | 1         | true    | false   |
      | Butter  | 2         | false   | true    |
    Then the ingredient "Peanuts" should show a warning indicator
    And the ingredient "Butter" should show a starred indicator
