Feature: Store Cupboard Share

  Scenario: Share button copies visible ingredients to clipboard
    Given a store cupboard with the following ingredients:
      | name    | mealCount |
      | Chicken | 2         |
      | Rice    | 1         |
      | Onion   | 1         |
    When I click the share button
    Then the clipboard should contain "Chicken"
    And the clipboard should contain "Rice"
    And the clipboard should contain "Onion"

  Scenario: Share excludes dismissed ingredients
    Given a store cupboard with the following ingredients:
      | name    | mealCount |
      | Chicken | 2         |
      | Rice    | 1         |
    And ingredient "Chicken" is dismissed
    When I click the share button
    Then the clipboard should contain "Rice"
    And the clipboard should not contain "Chicken"
