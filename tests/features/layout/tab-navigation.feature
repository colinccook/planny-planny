Feature: Tab Navigation

  Scenario: Tab bar uses replace navigation to avoid browser back button issues
    Given I am not authenticated
    When I navigate to the calendar page
    Then I should be redirected to the login page
