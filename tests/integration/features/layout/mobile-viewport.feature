Feature: Mobile viewport settings

  Scenario: Pinch-to-zoom is disabled
    Given I am on the login page
    Then the viewport should have user-scalable disabled

  Scenario: Viewport fits the device display including the notch
    Given I am on the login page
    Then the viewport should use viewport-fit cover
