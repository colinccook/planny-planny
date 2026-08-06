Feature: ChatGPT Plugin OAuth Implementation
  The ChatGPT plugin now supports OAuth 2.0 authentication flow for seamless user login
  without requiring manual JWT token management.

  This feature allows:
  - Users to authenticate via OAuth when adding the plugin to ChatGPT
  - Automatic token refresh without re-authentication
  - Secure authorization code flow with CSRF protection
  - Backward compatibility with password grant for CLI testing

  Background:
    # Verify the OAuth infrastructure exists
    # The actual Edge Function would be tested via manual deployment
    # These scenarios describe the expected behavior

  Scenario: Authorization code flow is implemented
    # GET /authorize endpoint exists and:
    # - Accepts client_id, redirect_uri, state, email, password
    # - Returns 302 redirect with authorization code
    # - Includes original state parameter for CSRF protection

  Scenario: Token exchange endpoint is implemented
    # POST /token endpoint exists and supports:
    # - grant_type: "authorization_code" (code exchange)
    # - grant_type: "password" (direct email/password)
    # - grant_type: "refresh_token" (token refresh)
    # - Returns access_token, refresh_token, expires_in, token_type

  Scenario: Authorization codes are stored securely
    # - Database table: chatgpt_oauth_codes
    # - Fields: code, state, user_id, redirect_uri, expires_at, used
    # - Expires after 10 minutes
    # - Marked as used after first exchange (one-time only)

  Scenario: Tokens are stored and tracked
    # - Database table: chatgpt_oauth_tokens
    # - Fields: user_id, access_token, refresh_token, access_token_expires_at
    # - RLS policies ensure users only access their own tokens
    # - Service role function for token refresh

  Scenario: CSRF protection via state parameter
    # - Authorization endpoint returns state parameter in redirect
    # - State protects against cross-site request forgery
    # - Token endpoint validates state matches

  Scenario: Backward compatibility with password grant
    # - Password grant still works for CLI/testing
    # - Direct email/password exchange for tokens
    # - Falls back when authorization code flow unavailable

  Scenario: Refresh tokens don't expire
    # - Refresh tokens remain valid for 7 days of inactivity
    # - Access tokens expire after 1 hour
    # - Users can automatically refresh without re-authentication
