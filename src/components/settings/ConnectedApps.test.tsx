// @ClaudeIntegration #UnitTesting #Frontend !ConnectedApps
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseConnectedApps = vi.fn()
const mockRevoke = vi.fn()

vi.mock('../../hooks/useConnectedApps', () => ({
  useConnectedApps: () => mockUseConnectedApps(),
}))

import ConnectedApps from './ConnectedApps'

describe('ConnectedApps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseConnectedApps.mockReturnValue({
      apps: [{
        id: 'client-1',
        name: 'Claude',
        permissions: ['Planny Planny MCP access'],
        source: 'compatibility',
      }],
      loading: false,
      error: null,
      revokingKey: null,
      revoke: mockRevoke,
    })
  })

  it('shows connected OAuth clients', async () => {
    render(createElement(ConnectedApps))

    expect(await screen.findByText('Claude')).toBeDefined()
    expect(screen.getByText('Permissions: Planny Planny MCP access')).toBeDefined()
  })

  it('requests revocation for the selected app', async () => {
    render(createElement(ConnectedApps))

    fireEvent.click(await screen.findByRole('button', { name: 'Revoke Claude' }))

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith(expect.objectContaining({
        id: 'client-1',
        source: 'compatibility',
      }))
    })
  })
})
