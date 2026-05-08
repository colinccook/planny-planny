import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Capture every HouseholdRealtimeManager constructed during the test, plus
// the calls made on it, so we can assert on the lifecycle from the outside.
const instances: {
  subscribe: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
  householdId: string | null
}[] = []

vi.mock('../lib/realtime', () => {
  class FakeManager {
    subscribe = vi.fn((id: string) => {
      this.householdId = id
    })
    unsubscribe = vi.fn(() => {
      this.householdId = null
    })
    setEventListener = vi.fn()
    householdId: string | null = null
    constructor() {
      instances.push(this)
    }
  }
  return { HouseholdRealtimeManager: FakeManager }
})

vi.mock('../lib/supabase', () => ({ supabase: {} }))

import { useHouseholdRealtime } from './useHouseholdRealtime'

function createWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
}

beforeEach(() => {
  instances.length = 0
})

describe('useHouseholdRealtime', () => {
  it('subscribes to the initial household on mount', () => {
    const qc = new QueryClient()
    renderHook(() => useHouseholdRealtime('hh-1'), {
      wrapper: createWrapper(qc),
    })

    expect(instances).toHaveLength(1)
    expect(instances[0].subscribe).toHaveBeenCalledWith('hh-1')
    expect(instances[0].householdId).toBe('hh-1')
  })

  it('re-subscribes when the active household changes', () => {
    const qc = new QueryClient()
    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => useHouseholdRealtime(id),
      {
        wrapper: createWrapper(qc),
        initialProps: { id: 'hh-1' as string | null },
      },
    )

    expect(instances[0].subscribe).toHaveBeenLastCalledWith('hh-1')

    rerender({ id: 'hh-2' })

    expect(instances[0].subscribe).toHaveBeenCalledTimes(2)
    expect(instances[0].subscribe).toHaveBeenLastCalledWith('hh-2')
  })

  it('unsubscribes when the active household disappears (e.g. removed from the last household)', () => {
    const qc = new QueryClient()
    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => useHouseholdRealtime(id),
      {
        wrapper: createWrapper(qc),
        initialProps: { id: 'hh-1' as string | null },
      },
    )

    expect(instances[0].householdId).toBe('hh-1')
    expect(instances[0].unsubscribe).not.toHaveBeenCalled()

    rerender({ id: null })

    expect(instances[0].unsubscribe).toHaveBeenCalledTimes(1)
    expect(instances[0].householdId).toBeNull()
  })

  it('does not re-subscribe if the same household id is passed again', () => {
    const qc = new QueryClient()
    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => useHouseholdRealtime(id),
      {
        wrapper: createWrapper(qc),
        initialProps: { id: 'hh-1' as string | null },
      },
    )

    rerender({ id: 'hh-1' })
    rerender({ id: 'hh-1' })

    expect(instances[0].subscribe).toHaveBeenCalledTimes(1)
  })

  it('tears the manager down on unmount', () => {
    const qc = new QueryClient()
    const { unmount } = renderHook(() => useHouseholdRealtime('hh-1'), {
      wrapper: createWrapper(qc),
    })

    unmount()

    expect(instances[0].unsubscribe).toHaveBeenCalled()
  })
})
