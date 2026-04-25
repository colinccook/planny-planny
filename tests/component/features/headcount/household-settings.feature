Feature: Household settings with stepper controls for headcounts

  Households can configure default counts for adults, children, and babies
  using mobile-friendly +/- stepper buttons. Values cannot go below zero.

  Scenario: Settings form shows stepper controls for all categories
    Given the household settings form is rendered for an owner
    Then I should see a default adults stepper in settings
    And I should see a default children stepper in settings
    And I should see a default babies stepper in settings

  Scenario: Default babies starts at zero
    Given the household settings form is rendered for an owner
    Then the default babies value should be 0

  Scenario: Create household form shows stepper controls
    Given the create household form is expanded
    Then I should see a default adults stepper in create form
    And I should see a default children stepper in create form
    And I should see a default babies stepper in create form

  Scenario: Create household form defaults babies to zero
    Given the create household form is expanded
    Then the create form default babies value should be 0

  Scenario: Settings stepper increments adults
    Given the household settings form is rendered for an owner
    When I click the settings adults increment button
    Then the settings adults value should be 3

  Scenario: Settings stepper cannot go below zero
    Given the household settings form is rendered for an owner
    When I click the settings adults decrement button
    And I click the settings adults decrement button
    Then the settings adults value should be 0
    And the settings adults decrement button should be disabled
