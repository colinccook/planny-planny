// @ClaudeIntegration #UnitTesting #Frontend #ChatGptPlugin
import { describe, expect, it, vi } from 'vitest'
import {
  listCompatibilityOAuthGrants,
  revokeCompatibilityOAuthGrant,
} from './oauthBridgeGrants'

describe('OAuth compatibility grants service', () => {
  it('loads compatibility grants with the signed-in access token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        grants: [{
          client_id: 'client-1',
          client_name: 'Claude',
          granted_at: '2026-09-24T07:00:00Z',
        }],
      }),
    })

    const grants = await listCompatibilityOAuthGrants('access-token', fetchImpl)

    expect(grants).toEqual([expect.objectContaining({ client_name: 'Claude' })])
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/chatgpt-plugin-auth/grants'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-token' },
      }),
    )
  })

  it('revokes only the selected compatibility client', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ revoked: true }),
    })

    await revokeCompatibilityOAuthGrant('access-token', 'client-1', fetchImpl)

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      client_id: 'client-1',
    })
  })
})
