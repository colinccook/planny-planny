import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useDayPlaceholders, useUpsertDayPlaceholder, useDeleteDayPlaceholder } from './useDayPlaceholders'

vi.mock('../lib/supabase', () => {
  const mockFrom = vi.fn()
  return {
    supabase: {
      from: mockFrom,
    },
  }
})

import { supabase } from '../lib/supabase'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const mockPlaceholders = [
  { id: 'p1', household_id: 'h1', day_of_week: 1, label: 'Oily fish Monday' },
  { id: 'p2', household_id: 'h1', day_of_week: 4, label: 'Veggie Thursday' },
]

describe('useDayPlaceholders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches placeholders for a household', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockPlaceholders, error: null }),
        }),
      }),
    } as never)

    const { result } = renderHook(() => useDayPlaceholders('h1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPlaceholders)
    expect(supabase.from).toHaveBeenCalledWith('day_placeholders')
  })

  it('returns empty array when householdId is undefined', async () => {
    const { result } = renderHook(() => useDayPlaceholders(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.data).toBeUndefined()
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useUpsertDayPlaceholder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts a placeholder', async () => {
    const upsertedData = { id: 'p3', household_id: 'h1', day_of_week: 2, label: 'Taco Tuesday' }
    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: upsertedData, error: null }),
        }),
      }),
    } as never)

    const { result } = renderHook(() => useUpsertDayPlaceholder(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      household_id: 'h1',
      day_of_week: 2,
      label: 'Taco Tuesday',
    })

    expect(supabase.from).toHaveBeenCalledWith('day_placeholders')
  })
})

describe('useDeleteDayPlaceholder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a placeholder', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as never)

    const { result } = renderHook(() => useDeleteDayPlaceholder(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({ id: 'p1', householdId: 'h1' })

    expect(supabase.from).toHaveBeenCalledWith('day_placeholders')
  })
})
