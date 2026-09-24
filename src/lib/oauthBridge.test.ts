// @ClaudeIntegration #UnitTesting #Frontend #ChatGptPlugin
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import {
  completeOAuthBridgeAuthorization,
  parseOAuthBridgeRequest,
} from './oauthBridge'

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: { id: 'user-1' },
} as Session

const connectorSession = {
  access_token: 'connector-access-token',
  refresh_token: 'connector-refresh-token',
  user: { id: 'user-1' },
} as Session

describe('OAuth bridge service', () => {
  it('reads the public-client PKCE request returned by the compatibility server', () => {
    const request = parseOAuthBridgeRequest(new URLSearchParams({
      client_id: 'client-1',
      client_name: 'Claude',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      state: 'state-1',
      scope: 'openid profile email offline_access',
      resource: 'https://example.supabase.co/functions/v1/chatgpt-plugin/claude/mcp',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'S256',
    }))

    expect(request.clientName).toBe('Claude')
    expect(request.codeChallengeMethod).toBe('S256')
  })

  it('rejects an authorization request that does not use PKCE S256', () => {
    expect(() => parseOAuthBridgeRequest(new URLSearchParams({
      client_id: 'client-1',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'plain',
    }))).toThrow('The authorization request must use PKCE S256.')
  })

  it('sends Supabase session tokens only in the authenticated approval body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ redirect_url: 'https://claude.ai/callback?code=approved' }),
    })
    const request = parseOAuthBridgeRequest(new URLSearchParams({
      client_id: 'client-1',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'S256',
    }))

    const connectorSessionFactory = vi.fn().mockResolvedValue(connectorSession)

    await completeOAuthBridgeAuthorization(
      request,
      'approve',
      {
        browserSession: session,
        email: 'planner@example.com',
        password: 'correct-password',
      },
      fetchImpl,
      connectorSessionFactory,
    )

    const [url, init] = fetchImpl.mock.calls[0] as [string, {
      headers: Record<string, string>
      body: string
    }]
    expect(url).not.toContain('connector-access-token')
    expect(url).not.toContain('connector-refresh-token')
    expect(init.headers.Authorization).toBe('Bearer access-token')
    expect(JSON.parse(init.body)).toMatchObject({
      action: 'approve',
      connector_access_token: 'connector-access-token',
      connector_refresh_token: 'connector-refresh-token',
    })
    expect(connectorSessionFactory).toHaveBeenCalledWith(
      'planner@example.com',
      'correct-password',
    )
  })

  it('does not send the refresh token when the user denies access', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ redirect_url: 'https://claude.ai/callback?error=access_denied' }),
    })
    const request = parseOAuthBridgeRequest(new URLSearchParams({
      client_id: 'client-1',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'S256',
    }))

    const connectorSessionFactory = vi.fn()

    await completeOAuthBridgeAuthorization(
      request,
      'deny',
      {
        browserSession: session,
        email: 'planner@example.com',
      },
      fetchImpl,
      connectorSessionFactory,
    )

    const [, init] = fetchImpl.mock.calls[0] as [string, { body: string }]
    expect(JSON.parse(init.body)).not.toHaveProperty('connector_refresh_token')
    expect(connectorSessionFactory).not.toHaveBeenCalled()
  })
})
