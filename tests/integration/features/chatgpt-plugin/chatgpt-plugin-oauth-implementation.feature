Feature: ChatGPT Plugin OAuth Implementation
  The ChatGPT plugin supports the OAuth 2.0 authorization code flow (with
  PKCE) plus password and refresh_token grants, and exposes RFC 8414/7591
  discovery metadata so ChatGPT's MCP connector can configure itself
  automatically instead of failing with "does not implement OAuth".

  Background:
    Given a seeded ChatGPT plugin test user

  # ── Discovery — RFC 8414 (authorization server metadata) ───────────────

  Scenario: The authorization server metadata endpoint is discoverable without authentication
    When I request the OAuth authorization server metadata
    Then the discovery response status is 200
    And the discovery response contains an "issuer" field
    And the discovery response contains an "authorization_endpoint" field
    And the discovery response contains a "token_endpoint" field
    And the discovery response contains a "registration_endpoint" field
    And the discovery response lists "S256" in "code_challenge_methods_supported"

  # ── Dynamic Client Registration — RFC 7591 ──────────────────────────────

  Scenario: A new OAuth client can dynamically register itself
    When I register a new OAuth client with redirect_uris:
      """
      ["https://chatgpt.com/aip/oauth/callback"]
      """
    Then the registration response status is 201
    And the registration response contains a "client_id" field
    And the registration response contains token_endpoint_auth_method "none"

  Scenario: Dynamic Client Registration rejects a request without redirect_uris
    When I register a new OAuth client with redirect_uris:
      """
      []
      """
    Then the registration response status is 400

  # ── Authorization code flow (with PKCE) ─────────────────────────────────

  Scenario: The full PKCE authorization code flow issues working tokens
    Given a PKCE code verifier and matching code_challenge
    When I request an authorization code with email and password and the code_challenge
    Then I am redirected with an authorization code and the original state
    When I exchange the authorization code for tokens using the code_verifier
    Then the OAuth token response contains an access_token and refresh_token

  Scenario: Token exchange rejects a missing code_verifier when a code_challenge was used
    Given a PKCE code verifier and matching code_challenge
    When I request an authorization code with email and password and the code_challenge
    Then I am redirected with an authorization code and the original state
    When I exchange the authorization code for tokens without a code_verifier
    Then the OAuth token exchange fails with status 400

  Scenario: Token exchange rejects a code_verifier that does not match the code_challenge
    Given a PKCE code verifier and matching code_challenge
    When I request an authorization code with email and password and the code_challenge
    Then I am redirected with an authorization code and the original state
    When I exchange the authorization code for tokens using a wrong code_verifier
    Then the OAuth token exchange fails with status 400

  # ── Password & refresh grants (backward compatible, no PKCE) ────────────

  Scenario: The password grant exchanges credentials for tokens directly
    When I request tokens with the password grant using the seeded user's credentials
    Then the OAuth token response contains an access_token and refresh_token

  Scenario: The password grant can be used twice in a row for the same user
    When I request tokens with the password grant using the seeded user's credentials
    Then the OAuth token response contains an access_token and refresh_token
    When I request tokens with the password grant using the seeded user's credentials
    Then the OAuth token response contains an access_token and refresh_token

  Scenario: The refresh_token grant issues a new access token
    When I request tokens with the password grant using the seeded user's credentials
    Then the OAuth token response contains an access_token and refresh_token
    When I request tokens with the refresh_token grant using the last refresh token
    Then the OAuth token response contains an access_token and refresh_token
