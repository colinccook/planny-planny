Feature: Public Household Sharing

  Scenario: Invalid share token shows error
    Given I navigate to a shared household page with an invalid token
    Then I should see an error message

  Scenario: Shared link routing is mounted on the app base path
    Given I navigate to a shared household page with an invalid token
    Then the page URL should contain "/shared/"
    And the page URL should not be the SPA fallback
