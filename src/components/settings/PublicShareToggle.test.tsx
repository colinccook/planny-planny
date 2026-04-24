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

  it('renders nothing for honoured guests (cannot manage public link)', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: null },
      currentRole: 'honoured_guest',
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

  it('copies a share URL that includes the app base path', async () => {
    // Regression test: the copied share URL must respect Vite's BASE_URL so
    // that GitHub Pages deployments produce links like
    //   https://colinccook.github.io/planny-planny/shared/<token>
    // instead of
    //   https://colinccook.github.io/shared/<token>
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: 'tok-123' },
      currentRole: 'owner',
    })
    mockCopyToClipboard.mockResolvedValue(undefined)

    render(createElement(PublicShareToggle), { wrapper: createWrapper() })

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(mockCopyToClipboard).toHaveBeenCalledTimes(1))
    const copied: string = mockCopyToClipboard.mock.calls[0][0]
    expect(copied).toMatch(/^https?:\/\/[^/]+\/.*shared\/tok-123$/)
    expect(copied.endsWith('/shared/tok-123')).toBe(true)
  })

  it('displays the share URL with the app base path', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: { id: 'h1', public_share_token: 'tok-123' },
      currentRole: 'owner',
    })

    render(createElement(PublicShareToggle), { wrapper: createWrapper() })
    // The displayed code element should be a fully-qualified URL ending in
    // /shared/<token>, not a bare relative path.
    const displayed = screen.getByText(/shared\/tok-123/)
    expect(displayed.textContent).toMatch(/^https?:\/\/[^/]+\/.*shared\/tok-123$/)
  })
})
