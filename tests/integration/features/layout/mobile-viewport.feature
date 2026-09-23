@MobileLayout
# #IntegrationTesting #Frontend #MobileViewportAndZoom !AppShell
Feature: Mobile viewport settings

  Scenario: Pinch-to-zoom is allowed for accessibility
    Given I am on the login page
    Then the viewport should allow user scaling

  Scenario: Viewport fits the device display including the notch
    Given I am on the login page
    Then the viewport should use viewport-fit cover

  Scenario: Form fields never trigger iOS focus auto-zoom
    Given I am on the login page
    Then every form field should render at 16 pixels or larger

  Scenario: Pinch gestures are never blocked by script
    Given I am on the login page
    Then no gesture-blocking listeners should be registered
