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
              {
                user_id: 'u1',
                role: 'owner',
                joined_at: '2024-01-01',
                profiles: { display_name: 'Alice', avatar_url: null },
              },
              {
                user_id: 'u2',
                role: 'member',
                joined_at: '2024-01-02',
                profiles: { display_name: 'Bob', avatar_url: null },
              },
            ],
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  },
}))

import MemberList from './MemberList'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('MemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when no current household', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: null,
      currentRole: null,
    })

    const { container } = render(createElement(MemberList), { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders member list with role badges', async () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })

    render(createElement(MemberList), { wrapper: createWrapper() })

    // Wait for the query to resolve
    const alice = await screen.findByText('Alice')
    expect(alice).toBeDefined()

    const bob = await screen.findByText('Bob')
    expect(bob).toBeDefined()

    expect(screen.getByText('owner')).toBeDefined()
    expect(screen.getByText('member')).toBeDefined()
  })

  it('shows (you) marker for current user', async () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })

    render(createElement(MemberList), { wrapper: createWrapper() })
    const youLabel = await screen.findByText('(you)')
    expect(youLabel).toBeDefined()
  })

  it('shows remove button for non-self members when owner', async () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1' },
      currentRole: 'owner',
    })

    render(createElement(MemberList), { wrapper: createWrapper() })
    const removeButton = await screen.findByText('Remove')
    expect(removeButton).toBeDefined()
  })
})
