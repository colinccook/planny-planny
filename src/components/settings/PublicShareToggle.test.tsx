import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUseHousehold = vi.fn()

vi.mock('../../hooks/useHousehold', () => ({
  useHousehold: () => mockUseHousehold(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  },
}))

import PublicShareToggle from './PublicShareToggle'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('PublicShareToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing for guests', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: null },
      currentRole: 'guest',
    })

    const { container } = render(createElement(PublicShareToggle), { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when no household', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: null,
      currentRole: null,
    })

    const { container } = render(createElement(PublicShareToggle), { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders toggle in off state when no token', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: null },
      currentRole: 'owner',
    })

    render(createElement(PublicShareToggle), { wrapper: createWrapper() })
    const toggle = screen.getByRole('switch')
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })

  it('renders toggle in on state when token exists', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: 'tok-123' },
      currentRole: 'owner',
    })

    render(createElement(PublicShareToggle), { wrapper: createWrapper() })
    const toggle = screen.getByRole('switch')
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('shows share URL when enabled', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: 'tok-123' },
      currentRole: 'owner',
    })

    render(createElement(PublicShareToggle), { wrapper: createWrapper() })
    expect(screen.getByText(/tok-123/)).toBeDefined()
    expect(screen.getByText('Copy')).toBeDefined()
  })

  it('does not show share URL when disabled', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: null },
      currentRole: 'owner',
    })

    render(createElement(PublicShareToggle), { wrapper: createWrapper() })
    expect(screen.queryByText('Copy')).toBeNull()
  })

  it('renders for members too', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: null },
      currentRole: 'member',
    })

    render(createElement(PublicShareToggle), { wrapper: createWrapper() })
    expect(screen.getByText('Public Sharing')).toBeDefined()
  })
})
