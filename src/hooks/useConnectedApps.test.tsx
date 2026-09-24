// @ClaudeIntegration #UnitTesting #Frontend #ChatGptPlugin
import { createElement } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListGrants = vi.fn()
const mockRevokeGrant = vi.fn()
const mockListCompatibilityGrants = vi.fn()
const mockRevokeCompatibilityGrant = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      oauth: {
        listGrants: (...args: unknown[]) => mockListGrants(...args),
        revokeGrant: (...args: unknown[]) => mockRevokeGrant(...args),
      },
    },
  },
}))

vi.mock('../lib/oauthBridgeGrants', () => ({
  listCompatibilityOAuthGrants: (...args: unknown[]) =>
    mockListCompatibilityGrants(...args),
  revokeCompatibilityOAuthGrant: (...args: unknown[]) =>
    mockRevokeCompatibilityGrant(...args),
}))

vi.mock('./useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import { useConnectedApps } from './useConnectedApps'

describe('useConnectedApps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      session: { access_token: 'access-token' },
      loading: false,
    })
    mockListGrants.mockResolvedValue({
      data: [{
        client: { id: 'native-1', name: 'ChatGPT' },
        scopes: ['openid'],
      }],
      error: null,
    })
    mockListCompatibilityGrants.mockResolvedValue([{
      client_id: 'compat-1',
      client_name: 'Claude',
      granted_at: '2026-09-24T07:00:00Z',
    }])
    mockRevokeGrant.mockResolvedValue({ error: null })
    mockRevokeCompatibilityGrant.mockResolvedValue(undefined)
  })

  it('shows native and compatibility OAuth grants together', async () => {
    const { result } = renderHook(() => useConnectedApps(), {
      wrapper: ({ children }) => createElement('div', null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.apps.map((app) => app.name)).toEqual(['ChatGPT', 'Claude'])
  })

  it('keeps native grants visible when compatibility grants cannot be loaded', async () => {
    mockListCompatibilityGrants.mockRejectedValue(
      new Error('Claude connections are temporarily unavailable.'),
    )

    const { result } = renderHook(() => useConnectedApps(), {
      wrapper: ({ children }) => createElement('div', null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.apps.map((app) => app.name)).toEqual(['ChatGPT'])
    expect(result.current.error).toBe(
      'Claude connections are temporarily unavailable.',
    )
  })

  it('keeps compatibility grants visible when native grants cannot be loaded', async () => {
    mockListGrants.mockResolvedValue({
      data: null,
      error: new Error('ChatGPT connections are temporarily unavailable.'),
    })

    const { result } = renderHook(() => useConnectedApps(), {
      wrapper: ({ children }) => createElement('div', null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.apps.map((app) => app.name)).toEqual(['Claude'])
    expect(result.current.error).toBe(
      'ChatGPT connections are temporarily unavailable.',
    )
  })

  it('revokes a compatibility grant through the bridge', async () => {
    const { result } = renderHook(() => useConnectedApps(), {
      wrapper: ({ children }) => createElement('div', null, children),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const claude = result.current.apps.find((app) => app.name === 'Claude')
    if (!claude) throw new Error('Expected Claude compatibility grant')

    await act(async () => {
      await result.current.revoke(claude)
    })

    expect(mockRevokeCompatibilityGrant).toHaveBeenCalledWith(
      'access-token',
      'compat-1',
    )
    expect(result.current.apps.map((app) => app.name)).toEqual(['ChatGPT'])
  })
})
