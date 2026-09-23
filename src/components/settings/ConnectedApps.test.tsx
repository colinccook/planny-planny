// @ClaudeIntegration #UnitTesting #Frontend !ConnectedApps
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListGrants = vi.fn()
const mockRevokeGrant = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      oauth: {
        listGrants: (...args: unknown[]) => mockListGrants(...args),
        revokeGrant: (...args: unknown[]) => mockRevokeGrant(...args),
      },
    },
  },
}))

import ConnectedApps from './ConnectedApps'

describe('ConnectedApps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListGrants.mockResolvedValue({
      data: [{
        client: { id: 'client-1', name: 'ChatGPT', uri: 'https://chatgpt.com', logo_uri: '' },
        scopes: ['openid', 'email'],
        granted_at: '2026-09-17T10:00:00Z',
      }],
      error: null,
    })
    mockRevokeGrant.mockResolvedValue({ data: {}, error: null })
  })

  it('shows connected OAuth clients', async () => {
    render(createElement(ConnectedApps))

    expect(await screen.findByText('ChatGPT')).toBeDefined()
    expect(screen.getByText('Permissions: openid, email')).toBeDefined()
  })

  it('removes an app after its grant is revoked', async () => {
    render(createElement(ConnectedApps))

    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }))

    await waitFor(() => {
      expect(mockRevokeGrant).toHaveBeenCalledWith({ clientId: 'client-1' })
    })
    expect(screen.queryByText('ChatGPT')).toBeNull()
  })
})
