Feature: Day context form supports negative adjustments and babies

  Events can reduce the headcount of a household. For example, a partner
  might go away for the day requiring a -1 adjustment to adults.
  The form must also support recording babies alongside adults and children.

  Scenario: Day context form has an extra babies field
    Given the day context form is rendered for a new entry
    Then I should see an extra adults input
    And I should see an extra children input
    And I should see an extra babies input

  Scenario: Day context form allows negative values for extra adults
    Given the day context form is rendered for a new entry
    Then the extra adults input should accept the value -1

  Scenario: Day context form allows negative values for extra children
    Given the day context form is rendered for a new entry
    Then the extra children input should accept the value -1

  Scenario: Day context form allows negative values for extra babies
    Given the day context form is rendered for a new entry
    Then the extra babies input should accept the value -1

  Scenario: Day context form populates existing values including babies
    Given the day context form is rendered with an existing context of 3 extra adults, 2 extra children, and 1 extra babies
    Then the extra adults input should have value 3
    And the extra children input should have value 2
    And the extra babies input should have value 1

  Scenario: Day context form rejects values below minimum
    Given the day context form is rendered for a new entry
    Then the extra adults input should have a minimum of -99
    And the extra children input should have a minimum of -99
    And the extra babies input should have a minimum of -99

  Scenario: Day context form rejects values above maximum
    Given the day context form is rendered for a new entry
    Then the extra adults input should have a maximum of 99
    And the extra children input should have a maximum of 99
    And the extra babies input should have a maximum of 99
