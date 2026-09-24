// @ClaudeIntegration #UnitTesting #Backend #ChatGptPlugin
import { describe, expect, it } from 'vitest'
import {
  assertRegisteredRedirect,
  buildAuthorizationRedirect,
  buildOAuthBridgeUrl,
  parseAuthorizationRequest,
  parseRedirectUris,
  readBearerToken,
} from './oauthCompatibility'

const request = parseAuthorizationRequest({
  client_id: 'client-1',
  redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
  response_type: 'code',
  state: 'state-1',
  scope: 'openid profile email offline_access',
  resource: 'https://example.supabase.co/functions/v1/chatgpt-plugin/claude/mcp',
  code_challenge: 'a'.repeat(43),
  code_challenge_method: 'S256',
})

describe('OAuth compatibility validation', () => {
  it('accepts HTTPS and loopback redirect URIs used by MCP clients and tests', () => {
    expect(parseRedirectUris([
      'https://claude.ai/api/mcp/auth_callback',
      'http://127.0.0.1:5173/plugin/support',
    ])).toHaveLength(2)
  })

  it('rejects insecure non-loopback redirect URIs', () => {
    expect(() => parseRedirectUris(['http://example.com/callback']))
      .toThrow('HTTP redirect URIs are only allowed for loopback hosts')
  })

  it('requires public clients to use PKCE S256', () => {
    expect(() => parseAuthorizationRequest({
      client_id: 'client-1',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'plain',
    })).toThrow('PKCE requires code_challenge_method=S256')
  })

  it('accepts only redirect URIs registered to the requesting client', () => {
    expect(() => assertRegisteredRedirect({
      client_id: 'client-1',
      client_name: 'Claude',
      redirect_uris: ['https://example.com/other'],
    }, request)).toThrow('redirect_uri is not registered for this client')
  })

  it('builds the approval URL under the deployed application base path', () => {
    expect(buildOAuthBridgeUrl(
      'https://colinccook.github.io/planny-planny/',
      request,
      'Claude',
    )).toContain('https://colinccook.github.io/planny-planny/oauth/authorize?')
  })

  it('returns approvals and denials to the registered client with the original state', () => {
    const approved = new URL(buildAuthorizationRedirect(
      request.redirectUri,
      request.state,
      { code: 'code-1' },
    ))
    const denied = new URL(buildAuthorizationRedirect(
      request.redirectUri,
      request.state,
      { error: 'access_denied', errorDescription: 'User denied the request' },
    ))

    expect(approved.searchParams.get('code')).toBe('code-1')
    expect(approved.searchParams.get('state')).toBe('state-1')
    expect(denied.searchParams.get('error')).toBe('access_denied')
    expect(denied.searchParams.get('state')).toBe('state-1')
  })

  it('requires an authenticated bearer token before completing approval', () => {
    expect(readBearerToken('Bearer access-token')).toBe('access-token')
    expect(() => readBearerToken(null)).toThrow('A Supabase access token is required')
  })
})
