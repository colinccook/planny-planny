Feature: Household settings include babies configuration

  Households can configure default counts for adults, children, and babies.
  The babies count defaults to zero because most households do not have babies.

  Scenario: Settings form shows default babies field
    Given the household settings form is rendered for an owner
    Then I should see a default adults input in settings
    And I should see a default children input in settings
    And I should see a default babies input in settings

  Scenario: Default babies starts at zero
    Given the household settings form is rendered for an owner
    Then the default babies input should have value 0

  Scenario: Create household form shows default babies field
    Given the create household form is expanded
    Then I should see a default adults input in create form
    And I should see a default children input in create form
    And I should see a default babies input in create form

  Scenario: Create household form defaults babies to zero
    Given the create household form is expanded
    Then the create form default babies input should have value 0
