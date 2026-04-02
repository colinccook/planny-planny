Feature: Public Household Sharing

  Scenario: Invalid share token shows error
    Given I navigate to a shared household page with an invalid token
    Then I should see an error message
