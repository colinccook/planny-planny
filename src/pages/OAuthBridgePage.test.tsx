// @ClaudeIntegration #UnitTesting #Frontend #ChatGptPlugin !OAuthBridgePage
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseOAuthBridge = vi.fn()
const mockCompleteAuthorization = vi.fn()

vi.mock('../hooks/useOAuthBridge', () => ({
  useOAuthBridge: () => mockUseOAuthBridge(),
}))

import OAuthBridgePage from './OAuthBridgePage'

const requestUrl = [
  '/oauth/authorize?client_id=client-1',
  'client_name=Claude',
  'redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback',
  'state=state-1',
  'scope=openid%20email%20offline_access',
  'resource=https%3A%2F%2Fexample.supabase.co%2Ffunctions%2Fv1%2Fchatgpt-plugin%2Fclaude%2Fmcp',
  `code_challenge=${'a'.repeat(43)}`,
  'code_challenge_method=S256',
].join('&')

describe('OAuthBridgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOAuthBridge.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      completeAuthorization: mockCompleteAuthorization,
    })
  })

  it('shows the requesting client and permissions before approval', () => {
    render(
      createElement(
        MemoryRouter,
        { initialEntries: [requestUrl] },
        createElement(OAuthBridgePage),
      ),
    )

    expect(screen.getByText('Connect Claude')).toBeDefined()
    expect(screen.getByText('Stay connected until you revoke access')).toBeDefined()
    expect(screen.getByText(/Approval returns to claude.ai/)).toBeDefined()
    expect(screen.getByLabelText('Confirm your Planny Planny password')).toBeDefined()
  })

  it('approves the registered client and redirects with the returned code', async () => {
    mockCompleteAuthorization.mockResolvedValue(
      'https://claude.ai/api/mcp/auth_callback?code=approved&state=state-1',
    )
    const redirectToClient = vi.fn()

    render(
      createElement(
        MemoryRouter,
        { initialEntries: [requestUrl] },
        createElement(OAuthBridgePage, { redirectToClient }),
      ),
    )

    fireEvent.change(screen.getByLabelText('Confirm your Planny Planny password'), {
      target: { value: 'correct-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }))

    await waitFor(() => {
      expect(mockCompleteAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-1' }),
        'approve',
        'correct-password',
      )
    })
    expect(redirectToClient).toHaveBeenCalledWith(
      'https://claude.ai/api/mcp/auth_callback?code=approved&state=state-1',
    )
  })

  it('returns an access-denied redirect when the user declines', async () => {
    mockCompleteAuthorization.mockResolvedValue(
      'https://claude.ai/api/mcp/auth_callback?error=access_denied&state=state-1',
    )
    const redirectToClient = vi.fn()

    render(
      createElement(
        MemoryRouter,
        { initialEntries: [requestUrl] },
        createElement(OAuthBridgePage, { redirectToClient }),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Deny' }))

    await waitFor(() => {
      expect(mockCompleteAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-1' }),
        'deny',
        undefined,
      )
    })
    expect(redirectToClient).toHaveBeenCalledWith(
      'https://claude.ai/api/mcp/auth_callback?error=access_denied&state=state-1',
    )
  })

  it('shows a safe error when the bridge cannot complete authorization', async () => {
    mockCompleteAuthorization.mockRejectedValue(new Error('The OAuth client is no longer valid.'))

    render(
      createElement(
        MemoryRouter,
        { initialEntries: [requestUrl] },
        createElement(OAuthBridgePage),
      ),
    )

    fireEvent.change(screen.getByLabelText('Confirm your Planny Planny password'), {
      target: { value: 'correct-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }))

    expect((await screen.findByRole('alert')).textContent)
      .toBe('The OAuth client is no longer valid.')
  })
})
