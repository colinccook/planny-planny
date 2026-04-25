import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockShowToast = vi.fn()
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

const mockCopyToClipboard = vi.fn()
vi.mock('../../lib/clipboard', () => ({
  copyToClipboard: (text: string) => mockCopyToClipboard(text),
}))

const mockUseHousehold = vi.fn()

vi.mock('../../hooks/useHousehold', () => ({
  useHousehold: () => mockUseHousehold(),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: null, loading: false }),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'inv1',
                household_id: 'h1',
                token: 'abc123',
                role: 'member',
                email: 'friend@example.com',
                created_by: 'u1',
                expires_at: null,
                created_at: '2024-01-01',
              },
            ],
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  },
}))

import InviteManager from './InviteManager'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('InviteManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing for honoured guests (cannot invite)', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'honoured_guest',
    })

    const { container } = render(createElement(InviteManager), { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing for voting guests', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'voting_guest',
    })

    const { container } = render(createElement(InviteManager), { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when no household', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: null,
      currentRole: null,
    })

    const { container } = render(createElement(InviteManager), { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders invite controls for owners', async () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })

    render(createElement(InviteManager), { wrapper: createWrapper() })
    expect(screen.getByText('Invite Links')).toBeDefined()
    expect(screen.getByText('Generate invite')).toBeDefined()

    // Wait for invite list (token is rendered with a leading slash)
    const token = await screen.findByText(/abc123/)
    expect(token).toBeDefined()
  })

  it('renders invite controls for members', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'member',
    })

    render(createElement(InviteManager), { wrapper: createWrapper() })
    expect(screen.getByText('Generate invite')).toBeDefined()
  })

  it('shows role selector with member, honoured_guest and voting_guest options', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })

    render(createElement(InviteManager), { wrapper: createWrapper() })
    const select = screen.getByLabelText('Invite role') as HTMLSelectElement
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(options).toEqual(['member', 'honoured_guest', 'voting_guest'])
  })

  it('shows the invitee email next to each pending invite', async () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })

    render(createElement(InviteManager), { wrapper: createWrapper() })
    expect(await screen.findByText('friend@example.com')).toBeDefined()
  })

  it('rejects invite generation when the email is invalid', async () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })

    render(createElement(InviteManager), { wrapper: createWrapper() })
    fireEvent.change(screen.getByLabelText('Recipient email'), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(screen.getByText('Generate invite'))

    expect(await screen.findByTestId('invite-error')).toBeDefined()
  })

  it('copies an invite URL that includes the app base path', async () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })
    mockCopyToClipboard.mockResolvedValue(undefined)

    render(createElement(InviteManager), { wrapper: createWrapper() })

    await screen.findByText(/abc123/)

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(mockCopyToClipboard).toHaveBeenCalledTimes(1))
    const copied: string = mockCopyToClipboard.mock.calls[0][0]
    expect(copied).toMatch(/^https?:\/\/[^/]+\/.*invite\/abc123$/)
    expect(copied.endsWith('/invite/abc123')).toBe(true)
  })
})
