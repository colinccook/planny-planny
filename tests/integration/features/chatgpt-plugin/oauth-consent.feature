Feature: ChatGPT OAuth consent
  Planny Planny hosts the user-facing consent screen used by the
  Supabase Auth OAuth 2.1 authorization server.

  Scenario: A signed-out user returns to the consent request after login
    When I visit "/oauth/consent?authorization_id=auth-test" without being logged in
    Then I should be redirected to login with OAuth authorization id "auth-test"

  Scenario: A request without an authorization identifier fails safely
    When I visit "/oauth/consent" without being logged in
    Then I should see an invalid OAuth authorization request
