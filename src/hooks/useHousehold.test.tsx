import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock supabase before importing the hook
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}))

// Mock useAuth
vi.mock('./useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'user-1' },
    session: null,
    loading: false,
  }),
}))

import { HouseholdProvider, useHousehold } from './useHousehold'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(HouseholdProvider, null, children)
    )
  }
}

describe('useHousehold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when used outside HouseholdProvider', () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    expect(() => {
      renderHook(() => useHousehold(), { wrapper })
    }).toThrow('useHousehold must be used within a HouseholdProvider')
  })

  it('returns loading state initially', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useHousehold(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.households).toEqual([])
    expect(result.current.currentHousehold).toBeNull()
    expect(result.current.currentRole).toBeNull()
  })

  it('provides switchHousehold function', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useHousehold(), { wrapper })

    expect(typeof result.current.switchHousehold).toBe('function')
  })

  it('resolves to empty households when user has no memberships', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useHousehold(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.households).toEqual([])
    expect(result.current.currentHousehold).toBeNull()
  })
})
