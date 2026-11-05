// @Households #UnitTesting #Frontend #Backend
import { createElement, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserPreferences } from './useUserPreferences'

const mocks = vi.hoisted(() => {
  const request = {
    error: null,
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
  }
  return { request, update: vi.fn(() => request) }
})

vi.mock('./useAuth', () => ({ useAuth: () => ({ user: { id: 'user' } }) }))
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { last_household_id: null, sound_effects_enabled: true },
            error: null,
          }),
        }),
      }),
      update: mocks.update,
    }),
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client }, children)
}

describe('household preference writes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only saves an initial household when no remote selection exists', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => result.current.setPreferences(
      { lastHouseholdId: 'home' }, { onlyIfNoHousehold: true },
    ))
    await waitFor(() => expect(mocks.request.is).toHaveBeenCalledWith('last_household_id', null))
    expect(mocks.request.eq).toHaveBeenCalledWith('id', 'user')
    expect(mocks.update).toHaveBeenCalledWith({ last_household_id: 'home' })
  })

  it('lets an explicit switch replace the previous household selection', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => result.current.setPreferences({ lastHouseholdId: 'beach' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ last_household_id: 'beach' }))
    expect(mocks.request.is).not.toHaveBeenCalled()
    expect(mocks.request.eq).toHaveBeenCalledWith('id', 'user')
  })
})
