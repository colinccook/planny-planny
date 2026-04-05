Feature: Headcount display on the planning view

  The planning view shows how many adults, children, and babies are
  eating each day. Counts that are zero should be hidden to keep the
  UI clean, and negative adjustments (e.g. someone leaving for the day)
  must never make a displayed count go below zero.

  Scenario: Adults emoji is shown when default adults is greater than zero
    Given a household with 2 default adults, 0 default children, and 0 default babies
    And there are no day context overrides
    Then the planning badge should show adults with count 2
    And the planning badge should not show children
    And the planning badge should not show babies

  Scenario: Children emoji is shown when default children is greater than zero
    Given a household with 2 default adults, 1 default children, and 0 default babies
    And there are no day context overrides
    Then the planning badge should show adults with count 2
    And the planning badge should show children with count 1
    And the planning badge should not show babies

  Scenario: Babies emoji is shown when default babies is greater than zero
    Given a household with 2 default adults, 0 default children, and 1 default babies
    And there are no day context overrides
    Then the planning badge should show adults with count 2
    And the planning badge should not show children
    And the planning badge should show babies with count 1

  Scenario: All three categories shown when all are positive
    Given a household with 2 default adults, 1 default children, and 1 default babies
    And there are no day context overrides
    Then the planning badge should show adults with count 2
    And the planning badge should show children with count 1
    And the planning badge should show babies with count 1

  Scenario: Zero default hides the category from the badge
    Given a household with 0 default adults, 0 default children, and 0 default babies
    And there are no day context overrides
    Then the planning badge should not show adults
    And the planning badge should not show children
    And the planning badge should not show babies

  Scenario: Positive day context extras increase the displayed count
    Given a household with 2 default adults, 0 default children, and 0 default babies
    And a day context with extra adults 1, extra children 2, and extra babies 1
    Then the planning badge should show adults with count 3
    And the planning badge should show children with count 2
    And the planning badge should show babies with count 1

  Scenario: Negative day context extras reduce the displayed count
    Given a household with 2 default adults, 1 default children, and 0 default babies
    And a day context with extra adults -1, extra children 0, and extra babies 0
    Then the planning badge should show adults with count 1
    And the planning badge should show children with count 1

  Scenario: Large negative extra never makes the displayed count go below zero
    Given a household with 2 default adults, 1 default children, and 1 default babies
    And a day context with extra adults -100, extra children -100, and extra babies -100
    Then the planning badge should not show adults
    And the planning badge should not show children
    And the planning badge should not show babies

  Scenario: Negative extra that exactly cancels default shows zero and hides badge
    Given a household with 2 default adults, 0 default children, and 0 default babies
    And a day context with extra adults -2, extra children 0, and extra babies 0
    Then the planning badge should not show adults

  Scenario: Multiple day contexts are summed before display
    Given a household with 2 default adults, 0 default children, and 0 default babies
    And a day context with extra adults 1, extra children 0, and extra babies 0
    And a day context with extra adults 2, extra children 1, and extra babies 0
    Then the planning badge should show adults with count 5
    And the planning badge should show children with count 1
