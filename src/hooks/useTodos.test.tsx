import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { renderHook } from '@testing-library/react'
import { useGroupedTodos } from './useTodos'
import type { TodoItem } from '../lib/todos'

function todo(overrides: Partial<TodoItem>): TodoItem {
  return {
    id: 'id',
    household_id: 'hh',
    user_id: null,
    date: '2026-04-26',
    title: 'Buy milk',
    completed_on: null,
    completed_at: null,
    created_by: 'u-1',
    created_at: '2026-04-26T00:00:00Z',
    ...overrides,
  }
}

const TODAY = '2026-04-26'

describe('useGroupedTodos', () => {
  // Regression test: previously the memo cache key was built from
  // todo IDs only, so ticking a todo (which keeps the same id but
  // changes completed_on) returned the cached pre-toggle Map and
  // the UI appeared "stuck" until the user manually refreshed.
  it('re-derives the grouping when a todo is ticked off', () => {
    const t = todo({ id: 't-1', date: TODAY })

    const { result, rerender } = renderHook(
      ({ todos }: { todos: TodoItem[] }) =>
        useGroupedTodos(todos, [TODAY], TODAY, 'u-1'),
      { initialProps: { todos: [t] } },
    )

    expect(result.current.get(TODAY)?.[0].completed_on).toBeNull()

    // Tick it off — same id, new completion fields. New array
    // reference too, mirroring what TanStack Query returns after
    // a refetch.
    const ticked: TodoItem = {
      ...t,
      completed_on: TODAY,
      completed_at: '2026-04-26T10:00:00Z',
    }
    rerender({ todos: [ticked] })

    expect(result.current.get(TODAY)?.[0].completed_on).toBe(TODAY)
  })

  it('re-derives the grouping when a todo is reopened', () => {
    const completed = todo({
      id: 't-1',
      date: TODAY,
      completed_on: TODAY,
      completed_at: '2026-04-26T10:00:00Z',
    })

    const { result, rerender } = renderHook(
      ({ todos }: { todos: TodoItem[] }) =>
        useGroupedTodos(todos, [TODAY], TODAY, 'u-1'),
      { initialProps: { todos: [completed] } },
    )

    expect(result.current.get(TODAY)?.[0].completed_on).toBe(TODAY)

    const reopened: TodoItem = {
      ...completed,
      completed_on: null,
      completed_at: null,
    }
    rerender({ todos: [reopened] })

    expect(result.current.get(TODAY)?.[0].completed_on).toBeNull()
  })
})
