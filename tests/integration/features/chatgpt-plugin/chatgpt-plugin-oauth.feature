Feature: ChatGPT Plugin OAuth Authentication
  The ChatGPT plugin now supports OAuth-style token exchange instead of requiring
  users to manually copy/paste JWTs. This allows seamless authentication with
  automatic token refresh.

  # ── OAuth Password Grant ─────────────────────────────────

  Scenario: Obtaining initial tokens with email and password
    When I request an OAuth token with email and password
    Then I receive an access token, refresh token, and expiry
    And the tokens are stored in the database

  Scenario: Invalid credentials return 401
    When I request an OAuth token with invalid email or password
    Then I receive a 401 error
    And no tokens are stored

  Scenario: Missing email or password returns 400
    When I request an OAuth token without an email
    Then I receive a 400 error

  # ── OAuth Refresh Grant ──────────────────────────────────

  Scenario: Refreshing an expired access token
    Given I have a valid refresh token
    When I use the refresh token to get a new access token
    Then I receive a new access token
    And the new token is stored in the database
    And the original refresh token is updated

  Scenario: Using an expired or invalid refresh token returns 401
    When I try to refresh with an invalid refresh token
    Then I receive a 401 error

  # ── Token Format ─────────────────────────────────────────

  Scenario: Returned tokens have the correct format
    When I request an OAuth token with email and password
    Then the response includes:
      | Field       | Type   |
      | access_token | string |
      | refresh_token | string |
      | expires_in  | number |
      | token_type  | string |
    And token_type is "Bearer"
    And expires_in is 3600 (1 hour)
