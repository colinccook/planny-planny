Feature: Day context form with stepper controls for headcount adjustments

  Events can adjust the headcount of a household using +/- stepper buttons.
  The minimum value is clamped to the negative of the household default,
  so the total headcount can never go below zero.

  Scenario: Day context form has stepper controls for all categories
    Given the day context form is rendered for a new entry
    Then I should see an extra adults stepper
    And I should see an extra children stepper
    And I should see an extra babies stepper

  Scenario: Day context form has an optional end date field
    Given the day context form is rendered for a new entry
    Then I should see an end date field

  Scenario: Increment extra adults via stepper
    Given the day context form is rendered for a new entry
    When I click the increment button for extra adults
    Then the extra adults value should be 1

  Scenario: Decrement extra adults via stepper
    Given the day context form is rendered for a new entry
    When I click the increment button for extra adults
    And I click the increment button for extra adults
    And I click the decrement button for extra adults
    Then the extra adults value should be 1

  Scenario: Day context form populates existing values including babies
    Given the day context form is rendered with an existing context of 3 extra adults, 2 extra children, and 1 extra babies
    Then the extra adults value should be 3
    And the extra children value should be 2
    And the extra babies value should be 1

  Scenario: Extra adults cannot go below negative household default
    Given the day context form is rendered with household defaults of 2 adults, 1 children, and 0 babies
    When I click the decrement button for extra adults 2 times
    Then the extra adults value should be -2
    And the extra adults decrement button should be disabled

  Scenario: Extra adults can still go positive when household default is zero
    Given the day context form is rendered with household defaults of 0 adults, 0 children, and 0 babies
    Then the extra adults decrement button should be disabled
    And the extra adults increment button should be enabled
