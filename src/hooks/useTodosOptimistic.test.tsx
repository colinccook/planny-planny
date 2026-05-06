import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const updateMock = vi.fn()

vi.mock('../lib/supabase', () => {
  const single = vi.fn(() => updateMock())
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  return { supabase: { from: vi.fn(() => ({ update })) } }
})

import { queryKeys } from '../lib/queryKeys'
import { useCompleteTodo, useReopenTodo } from './useTodos'
import type { TodoItem } from '../lib/todos'

function createWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
}

const HH = 'hh-1'
const TODO: TodoItem = {
  id: 't-1',
  household_id: HH,
  user_id: null,
  date: '2026-04-26',
  title: 'Buy milk',
  note: null,
  completed_on: null,
  completed_at: null,
  created_by: 'u-1',
  created_at: '2026-04-26T00:00:00Z',
}

function seed(qc: QueryClient, todos: TodoItem[]) {
  qc.setQueryData(queryKeys.todoItems(HH, '2026-04-26', '2026-04-26'), todos)
}

describe('useCompleteTodo (optimistic)', () => {
  beforeEach(() => {
    updateMock.mockReset()
  })

  it('marks the todo complete in the cache immediately', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    seed(qc, [TODO])
    let resolve: (v: unknown) => void = () => { /* set in mock */ }
    updateMock.mockReturnValue(new Promise((r) => (resolve = r)))

    const { result } = renderHook(() => useCompleteTodo(), {
      wrapper: createWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 't-1', householdId: HH, completedOn: '2026-04-26' })
    })

    await waitFor(() => {
      const cached = qc.getQueryData<TodoItem[]>(
        queryKeys.todoItems(HH, '2026-04-26', '2026-04-26'),
      )
      expect(cached?.[0].completed_on).toBe('2026-04-26')
    })

    resolve({ data: TODO, error: null })
  })

  it('rolls back if the server rejects', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    seed(qc, [TODO])
    updateMock.mockResolvedValue({ data: null, error: new Error('boom') })

    const { result } = renderHook(() => useCompleteTodo(), {
      wrapper: createWrapper(qc),
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: 't-1',
          householdId: HH,
          completedOn: '2026-04-26',
        })
      } catch {
        // expected
      }
    })

    const cached = qc.getQueryData<TodoItem[]>(
      queryKeys.todoItems(HH, '2026-04-26', '2026-04-26'),
    )
    expect(cached?.[0].completed_on).toBeNull()
  })
})

describe('useReopenTodo (optimistic)', () => {
  beforeEach(() => {
    updateMock.mockReset()
  })

  it('clears completed_on in the cache immediately', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const completed: TodoItem = {
      ...TODO,
      completed_on: '2026-04-26',
      completed_at: '2026-04-26T10:00:00Z',
    }
    seed(qc, [completed])
    let resolve: (v: unknown) => void = () => { /* set in mock */ }
    updateMock.mockReturnValue(new Promise((r) => (resolve = r)))

    const { result } = renderHook(() => useReopenTodo(), {
      wrapper: createWrapper(qc),
    })

    act(() => {
      result.current.mutate({ id: 't-1', householdId: HH })
    })

    await waitFor(() => {
      const cached = qc.getQueryData<TodoItem[]>(
        queryKeys.todoItems(HH, '2026-04-26', '2026-04-26'),
      )
      expect(cached?.[0].completed_on).toBeNull()
    })

    resolve({ data: TODO, error: null })
  })
})
