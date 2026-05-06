import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock supabase before importing the hooks
const upsertMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('../lib/supabase', () => {
  const select = vi.fn(() => ({ single: vi.fn(() => upsertMock()) }))
  const upsert = vi.fn(() => ({ select }))
  const eqChain = (): { eq: () => unknown } => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ eq: vi.fn(() => deleteMock()) })),
        })),
      })),
    })),
  })
  const del = vi.fn(() => eqChain())
  return {
    supabase: {
      from: vi.fn(() => ({ upsert, delete: del })),
    },
  }
})

import { queryKeys } from '../lib/queryKeys'
import {
  useUpsertReaction,
  useDeleteReaction,
  type ReactionWithProfile,
} from './useMealIdeas'

function createWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
}

const HH = 'hh-1'
const TARGET = 'idea-1'
const USER = 'u-1'

function seed(qc: QueryClient, data: ReactionWithProfile[]) {
  qc.setQueryData(queryKeys.reactions(HH, 'meal_idea', [TARGET]), data)
}

describe('useUpsertReaction (optimistic)', () => {
  beforeEach(() => {
    upsertMock.mockReset()
    deleteMock.mockReset()
  })

  it('adds the reaction to the cache immediately, before the server responds', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    seed(qc, [])

    // Slow server: never resolve so we can observe the optimistic state.
    let resolve: (v: unknown) => void = () => { /* set in mock */ }
    upsertMock.mockReturnValue(new Promise((r) => (resolve = r)))

    const { result } = renderHook(() => useUpsertReaction(), {
      wrapper: createWrapper(qc),
    })

    act(() => {
      result.current.mutate({
        household_id: HH,
        target_type: 'meal_idea',
        target_id: TARGET,
        emoji: '👍',
        user_id: USER,
      })
    })

    await waitFor(() => {
      const cached = qc.getQueryData<ReactionWithProfile[]>(
        queryKeys.reactions(HH, 'meal_idea', [TARGET]),
      )
      expect(cached?.length).toBe(1)
      expect(cached?.[0].user_id).toBe(USER)
    })

    // Let the request finish so the test doesn't leak a pending promise.
    resolve({ data: { id: 'r-1' }, error: null })
  })

  it('rolls the cache back if the server rejects', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    seed(qc, [])

    upsertMock.mockResolvedValue({ data: null, error: new Error('boom') })

    const { result } = renderHook(() => useUpsertReaction(), {
      wrapper: createWrapper(qc),
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          household_id: HH,
          target_type: 'meal_idea',
          target_id: TARGET,
          emoji: '👍',
          user_id: USER,
        })
      } catch {
        // expected
      }
    })

    const cached = qc.getQueryData<ReactionWithProfile[]>(
      queryKeys.reactions(HH, 'meal_idea', [TARGET]),
    )
    expect(cached).toEqual([])
  })
})

describe('useDeleteReaction (optimistic)', () => {
  beforeEach(() => {
    upsertMock.mockReset()
    deleteMock.mockReset()
  })

  it('removes the reaction from the cache immediately', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const reaction: ReactionWithProfile = {
      id: 'r-1',
      household_id: HH,
      target_type: 'meal_idea',
      target_id: TARGET,
      emoji: '👍',
      user_id: USER,
      created_at: '2026-01-01T00:00:00Z',
      profiles: null,
    }
    seed(qc, [reaction])

    let resolve: (v: unknown) => void = () => { /* set in mock */ }
    deleteMock.mockReturnValue(new Promise((r) => (resolve = r)))

    const { result } = renderHook(() => useDeleteReaction(), {
      wrapper: createWrapper(qc),
    })

    act(() => {
      result.current.mutate({
        householdId: HH,
        targetType: 'meal_idea',
        targetId: TARGET,
        emoji: '👍',
        userId: USER,
      })
    })

    await waitFor(() => {
      const cached = qc.getQueryData<ReactionWithProfile[]>(
        queryKeys.reactions(HH, 'meal_idea', [TARGET]),
      )
      expect(cached).toEqual([])
    })

    resolve({ error: null })
  })
})
