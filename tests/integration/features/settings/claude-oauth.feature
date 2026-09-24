@ClaudeIntegration
# #IntegrationTesting #Frontend #Backend #ChatGptPlugin !OAuthBridgePage
Feature: Claude OAuth connection
  Claude can dynamically register as a public MCP client, ask the signed-in
  user for approval, and exchange a PKCE authorization code for native
  Supabase session tokens.

  Background:
    Given I am signed in as an owner of a household called "Claude OAuth Household"
    And Claude has dynamically registered a public OAuth client
    And Claude has prepared a PKCE authorization request

  Scenario: Claude discovers its isolated compatibility authorization server
    When Claude requests its protected resource metadata
    Then the Claude metadata identifies its dedicated MCP resource
    And the Claude metadata identifies the compatibility authorization server
    When ChatGPT requests its protected resource metadata
    Then the ChatGPT metadata still identifies native Supabase Auth

  Scenario: A signed-in user approves the Claude connector
    When I open Claude's OAuth authorization request
    Then I see the Claude connection approval screen
    And I capture the Claude OAuth approval screen
    When I allow the Claude OAuth connection
    Then Claude receives an authorization code with its original state
    When Claude exchanges the authorization code using its PKCE verifier
    Then Claude receives native Supabase access and refresh tokens

  Scenario: A signed-in user denies the Claude connector
    When I open Claude's OAuth authorization request
    And I deny the Claude OAuth connection
    Then Claude receives an access denied response with its original state

  Scenario: A connected Claude client can be revoked independently
    When I open Claude's OAuth authorization request
    And I allow the Claude OAuth connection
    Then Claude receives an authorization code with its original state
    When Claude exchanges the authorization code using its PKCE verifier
    Then Claude receives native Supabase access and refresh tokens
    When the stored Claude access token becomes unusable
    When I open Connected apps in Settings
    Then I see Claude in Connected apps
    And I capture Claude in Connected apps
    When I revoke Claude from Connected apps
    Then Claude is no longer listed in Connected apps
    When the revoked connector refresh token is sent directly to Supabase Auth
    Then Supabase Auth rejects the revoked connector session
    When Claude tries to refresh the revoked connector session
    Then the revoked Claude session is rejected

  Scenario: Reconnecting the same Claude client revokes its previous session
    When I open Claude's OAuth authorization request
    And I allow the Claude OAuth connection
    Then Claude receives an authorization code with its original state
    When Claude exchanges the authorization code using its PKCE verifier
    Then Claude receives native Supabase access and refresh tokens
    When Claude remembers its current refresh token
    And Claude has prepared a PKCE authorization request
    And I open Claude's OAuth authorization request
    And I allow the Claude OAuth connection
    Then Claude receives an authorization code with its original state
    When Claude exchanges the authorization code using its PKCE verifier
    Then Claude receives native Supabase access and refresh tokens
    When the superseded connector refresh token is sent directly to Supabase Auth
    Then Supabase Auth rejects the superseded connector session
