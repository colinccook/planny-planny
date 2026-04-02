import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found', code: 'PGRST116' },
          }),
        }),
      }),
    }),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: null, loading: false }),
}))

import JoinInvitePage from './JoinInvitePage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: ['/invite/test-token'] },
        createElement(Routes, null,
          createElement(Route, { path: '/invite/:token', element: children })
        )
      )
    )
  }
}

describe('JoinInvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error state for invalid invite', async () => {
    render(createElement(JoinInvitePage), { wrapper: createWrapper() })
    const errorMsg = await screen.findByText(/Invite not found/)
    expect(errorMsg).toBeDefined()
  })
})
