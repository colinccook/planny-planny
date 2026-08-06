Feature: ChatGPT Plugin OAuth Authentication
  The ChatGPT plugin now supports full OAuth 2.0 code flow for seamless authentication:
  1. User redirected to login page when adding plugin to ChatGPT
  2. After login, authorization code generated and user redirected back
  3. ChatGPT exchanges code for access and refresh tokens
  4. Tokens can be refreshed automatically without re-authentication

  # ── OAuth Authorization Code Flow ───────────────────────────────

  Scenario: Full OAuth authorization code flow
    Given I have created a test account for OAuth
    When I request an authorization code with email and password
    Then I receive an authorization code in the redirect
    And the authorization code includes the original state
    When I exchange the authorization code for tokens
    Then I receive an access token, refresh token, and expiry

  Scenario: Authorization code includes state parameter for CSRF protection
    Given I have created a test account for OAuth
    When I request an authorization code with email and password
    Then I receive an authorization code in the redirect
    And the authorization code includes the original state

  Scenario: Invalid credentials return 401 on authorization
    When I request an authorization code with invalid credentials
    Then I receive a 401 error for invalid authorization

  Scenario: Exchanging invalid authorization code returns 401
    When I try to exchange an invalid authorization code
    Then I receive a 401 error

  # ── OAuth Password Grant (Fallback) ──────────────────────────────

  Scenario: Obtaining initial tokens with email and password
    Given I have created a test account for OAuth
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

  # ── OAuth Refresh Grant ──────────────────────────────────────────

  Scenario: Refreshing an expired access token
    Given I have created a test account for OAuth
    And I have a valid refresh token
    When I use the refresh token to get a new access token
    Then I receive a new access token
    And the new token is stored in the database
    And the original refresh token is updated

  Scenario: Using an expired or invalid refresh token returns 401
    When I try to refresh with an invalid refresh token
    Then I receive a 401 error

  # ── Token Format ─────────────────────────────────────────────────

  Scenario: Returned tokens have the correct format
    Given I have created a test account for OAuth
    When I request an OAuth token with email and password
    Then the response includes:
      | Field         | Type   |
      | access_token  | string |
      | refresh_token | string |
      | expires_in    | number |
      | token_type    | string |
    And token_type is "Bearer"
    And expires_in is 3600 (1 hour)
