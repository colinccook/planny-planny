import { describe, it, expect } from 'vitest'
import { groupTodosByDay, todoBelongsOnDay, type TodoItem } from './todos'

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

describe('todoBelongsOnDay', () => {
  it('shows an incomplete todo on its own scheduled future date', () => {
    const t = todo({ date: '2026-04-30' })
    expect(todoBelongsOnDay(t, '2026-04-30', TODAY, 'u-1')).toBe(true)
    expect(todoBelongsOnDay(t, '2026-04-29', TODAY, 'u-1')).toBe(false)
    expect(todoBelongsOnDay(t, TODAY, TODAY, 'u-1')).toBe(false)
  })

  it('rolls an incomplete todo from the past forward to today', () => {
    const t = todo({ date: '2026-04-20' })
    // It is no longer visible on its original past day…
    expect(todoBelongsOnDay(t, '2026-04-20', TODAY, 'u-1')).toBe(false)
    // …but it is visible today.
    expect(todoBelongsOnDay(t, TODAY, TODAY, 'u-1')).toBe(true)
    // Future days don't show it either.
    expect(todoBelongsOnDay(t, '2026-04-30', TODAY, 'u-1')).toBe(false)
  })

  it('keeps a completed todo pinned to its completion date forever', () => {
    const t = todo({ completed_on: '2026-04-20', completed_at: '2026-04-20T10:00:00Z' })
    expect(todoBelongsOnDay(t, '2026-04-20', TODAY, 'u-1')).toBe(true)
    expect(todoBelongsOnDay(t, TODAY, TODAY, 'u-1')).toBe(false)
    expect(todoBelongsOnDay(t, '2026-04-21', TODAY, 'u-1')).toBe(false)
  })

  it('hides a private todo from anyone but its owner', () => {
    const t = todo({ user_id: 'u-other' })
    expect(todoBelongsOnDay(t, TODAY, TODAY, 'u-1')).toBe(false)
    expect(todoBelongsOnDay(t, TODAY, TODAY, 'u-other')).toBe(true)
  })

  it('shows household-level (user_id null) todos to anyone', () => {
    const t = todo({ user_id: null })
    expect(todoBelongsOnDay(t, TODAY, TODAY, 'u-1')).toBe(true)
    expect(todoBelongsOnDay(t, TODAY, TODAY, 'u-other')).toBe(true)
  })
})

describe('groupTodosByDay', () => {
  it('omits days with no todos and includes rolled / completed / scheduled correctly', () => {
    const days = ['2026-04-25', TODAY, '2026-04-27']
    const todos: TodoItem[] = [
      todo({ id: 'roll', date: '2026-04-20' }), // rolled to today
      todo({ id: 'completed-yesterday', completed_on: '2026-04-25', completed_at: '2026-04-25T10:00:00Z' }),
      todo({ id: 'scheduled-tomorrow', date: '2026-04-27' }),
      todo({ id: 'private-other', user_id: 'u-other' }),
    ]
    const grouped = groupTodosByDay(todos, days, TODAY, 'u-1')
    expect(grouped.get('2026-04-25')?.map((t) => t.id)).toEqual(['completed-yesterday'])
    expect(grouped.get(TODAY)?.map((t) => t.id)).toEqual(['roll'])
    expect(grouped.get('2026-04-27')?.map((t) => t.id)).toEqual(['scheduled-tomorrow'])
  })

  it('returns an empty map when nothing is visible', () => {
    expect(
      groupTodosByDay([todo({ user_id: 'u-other' })], [TODAY], TODAY, 'u-1').size,
    ).toBe(0)
  })
})
