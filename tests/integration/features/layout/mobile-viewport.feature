Feature: Mobile viewport settings

  Scenario: Pinch-to-zoom is allowed for accessibility
    Given I am on the login page
    Then the viewport should allow user scaling

  Scenario: Viewport fits the device display including the notch
    Given I am on the login page
    Then the viewport should use viewport-fit cover
