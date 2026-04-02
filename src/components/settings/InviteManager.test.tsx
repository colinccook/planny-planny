import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
              { id: 'inv1', household_id: 'h1', token: 'abc123', role: 'member', created_by: 'u1', expires_at: null, created_at: '2024-01-01' },
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

  it('renders nothing for guests', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'guest',
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

    // Wait for invite list
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

  it('shows role selector with member and guest options', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })

    render(createElement(InviteManager), { wrapper: createWrapper() })
    const select = screen.getByRole('combobox') as HTMLSelectElement
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(2)
    expect(options[0].value).toBe('member')
    expect(options[1].value).toBe('guest')
  })
})
