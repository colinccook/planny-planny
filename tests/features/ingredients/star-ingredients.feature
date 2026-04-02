Feature: Star Ingredients

  Scenario: Starring ingredients requires authentication
    Given I navigate to the ingredients page
    Then I should be redirected to the login page
