// @ChatGPTPlugin #UnitTesting #Frontend #ChatGptPlugin !OAuthConsentPage
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetAuthorizationDetails = vi.fn()
const mockApproveAuthorization = vi.fn()
const mockDenyAuthorization = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      oauth: {
        getAuthorizationDetails: (...args: unknown[]) => mockGetAuthorizationDetails(...args),
        approveAuthorization: (...args: unknown[]) => mockApproveAuthorization(...args),
        denyAuthorization: (...args: unknown[]) => mockDenyAuthorization(...args),
      },
    },
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import OAuthConsentPage from './OAuthConsentPage'

describe('OAuthConsentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false })
    mockGetAuthorizationDetails.mockResolvedValue({
      data: {
        authorization_id: 'auth-1',
        redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect',
        client: {
          id: 'client-1',
          name: 'ChatGPT',
          uri: 'https://chatgpt.com',
          logo_uri: '',
        },
        user: { id: 'user-1', email: 'planner@example.com' },
        scope: 'openid email',
      },
      error: null,
    })
  })

  it('shows the requesting client and permissions before approval', async () => {
    render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/oauth/consent?authorization_id=auth-1'] },
        createElement(OAuthConsentPage),
      ),
    )

    expect(await screen.findByText('Connect ChatGPT')).toBeDefined()
    expect(screen.getByText('Confirm your Planny Planny identity')).toBeDefined()
    expect(screen.getByText('Read your account email address')).toBeDefined()
  })

  it('approves the authorization request when the user allows access', async () => {
    mockApproveAuthorization.mockResolvedValue({
      data: { redirect_url: 'https://chatgpt.com/callback?code=approved' },
      error: null,
    })
    const redirectToClient = vi.fn()

    render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/oauth/consent?authorization_id=auth-1'] },
        createElement(OAuthConsentPage, { redirectToClient }),
      ),
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Allow' }))

    await waitFor(() => {
      expect(mockApproveAuthorization).toHaveBeenCalledWith(
        'auth-1',
        { skipBrowserRedirect: true },
      )
    })
    expect(redirectToClient).toHaveBeenCalledWith('https://chatgpt.com/callback?code=approved')
  })

  it('denies the authorization request when the user declines access', async () => {
    mockDenyAuthorization.mockResolvedValue({
      data: { redirect_url: 'https://chatgpt.com/callback?error=access_denied' },
      error: null,
    })
    const redirectToClient = vi.fn()

    render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/oauth/consent?authorization_id=auth-1'] },
        createElement(OAuthConsentPage, { redirectToClient }),
      ),
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }))

    await waitFor(() => {
      expect(mockDenyAuthorization).toHaveBeenCalledWith(
        'auth-1',
        { skipBrowserRedirect: true },
      )
    })
    expect(redirectToClient).toHaveBeenCalledWith(
      'https://chatgpt.com/callback?error=access_denied',
    )
  })

  it('shows an error when the authorization identifier is missing', () => {
    render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/oauth/consent'] },
        createElement(OAuthConsentPage),
      ),
    )

    expect(screen.getByText('Invalid request')).toBeDefined()
  })
})
