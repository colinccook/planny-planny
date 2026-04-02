Feature: Day Placeholders

  Scenario: Day placeholder settings require authentication
    Given I navigate to the settings page
    Then I should be redirected to the login page
