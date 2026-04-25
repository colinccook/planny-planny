Feature: Household Invite Links
  Joining a household via an invite link must work end-to-end:
  the link must include the app's base path, must lead to the
  Join page when authenticated, and must redirect unauthenticated
  visitors through registration while preserving the invite token
  so they land back on the Join page after signing up.

  Scenario: Visiting an invite link while unauthenticated redirects to register
    Given I am not authenticated
    When I navigate to an invite link with token "test-token-12345"
    Then I should be redirected to the registration page
    And the registration page URL should preserve the invite redirect for token "test-token-12345"

  Scenario: Visiting an invite link with an invalid token shows an error
    Given I am not authenticated
    When I navigate to an invite link with token "definitely-not-a-real-token"
    Then I should be redirected to the registration page
    And the registration page URL should preserve the invite redirect for token "definitely-not-a-real-token"

  Scenario: Invite link routing is mounted on the app base path
    Given I am not authenticated
    When I navigate to an invite link with token "abc"
    Then the page URL should contain "/invite/abc"
    And the page URL should not be the SPA fallback

  Scenario: Registration page links back to login from an invite landing
    Given I am not authenticated
    When I navigate to an invite link with token "abc"
    Then I should see the registration form
    And I should see a link to the login page
