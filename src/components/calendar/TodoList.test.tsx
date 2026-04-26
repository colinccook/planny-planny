import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

const mockCreate = { mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }
const mockComplete = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }
const mockReopen = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }
const mockDelete = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }

vi.mock('../../hooks/useTodos', () => ({
  useCreateTodo: () => mockCreate,
  useCompleteTodo: () => mockComplete,
  useReopenTodo: () => mockReopen,
  useDeleteTodo: () => mockDelete,
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-me' } }),
}))

import TodoList from './TodoList'
import type { TodoItem } from '../../hooks/useTodos'

function todo(overrides: Partial<TodoItem>): TodoItem {
  return {
    id: 't-1',
    household_id: 'hh-1',
    user_id: null,
    date: '2026-04-26',
    title: 'Buy milk',
    completed_on: null,
    completed_at: null,
    created_by: 'u-me',
    created_at: '2026-04-26T00:00:00Z',
    ...overrides,
  }
}

const baseProps = {
  householdId: 'hh-1',
  date: '2026-04-26',
  today: '2026-04-26',
}

describe('TodoList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an empty hint when there are no todos and the user can manage', () => {
    render(
      createElement(TodoList, { ...baseProps, todos: [], currentRole: 'owner' }),
    )
    expect(screen.getByText(/nothing to do/i)).toBeDefined()
  })

  it('renders nothing for a voting guest with no todos', () => {
    const { container } = render(
      createElement(TodoList, {
        ...baseProps,
        todos: [],
        currentRole: 'voting_guest',
      }),
    )
    expect(container.firstChild).toBeNull()
  })

  it('lists todos and crosses off completed ones', () => {
    render(
      createElement(TodoList, {
        ...baseProps,
        todos: [
          todo({ id: 'a', title: 'Open one' }),
          todo({
            id: 'b',
            title: 'Done one',
            completed_on: '2026-04-26',
            completed_at: '2026-04-26T09:00:00Z',
          }),
        ],
        currentRole: 'owner',
      }),
    )
    const open = screen.getByTestId('todo-item-a')
    const done = screen.getByTestId('todo-item-b')
    expect(open.getAttribute('data-complete')).toBe('false')
    expect(done.getAttribute('data-complete')).toBe('true')
  })

  it('ticks off a todo by calling completeTodo with the day', () => {
    render(
      createElement(TodoList, {
        ...baseProps,
        todos: [todo({ id: 'a' })],
        currentRole: 'owner',
      }),
    )
    fireEvent.click(screen.getByTestId('todo-toggle-a'))
    expect(mockComplete.mutate).toHaveBeenCalledWith({
      id: 'a',
      householdId: 'hh-1',
      completedOn: '2026-04-26',
    })
  })

  it('un-ticks a completed todo by calling reopenTodo', () => {
    render(
      createElement(TodoList, {
        ...baseProps,
        todos: [
          todo({
            id: 'a',
            completed_on: '2026-04-26',
            completed_at: '2026-04-26T09:00:00Z',
          }),
        ],
        currentRole: 'owner',
      }),
    )
    fireEvent.click(screen.getByTestId('todo-toggle-a'))
    expect(mockReopen.mutate).toHaveBeenCalledWith({
      id: 'a',
      householdId: 'hh-1',
    })
  })

  it('deletes a todo permanently when the × is pressed', () => {
    render(
      createElement(TodoList, {
        ...baseProps,
        todos: [todo({ id: 'a' })],
        currentRole: 'owner',
      }),
    )
    fireEvent.click(screen.getByTestId('todo-delete-a'))
    expect(mockDelete.mutate).toHaveBeenCalledWith({
      id: 'a',
      householdId: 'hh-1',
    })
  })

  it('hides toggle and delete controls for voting guests but still shows todos', () => {
    render(
      createElement(TodoList, {
        ...baseProps,
        todos: [todo({ id: 'a' })],
        currentRole: 'voting_guest',
      }),
    )
    expect(screen.getByTestId('todo-item-a')).toBeDefined()
    expect(screen.queryByTestId('todo-delete-a')).toBeNull()
    // Toggle is rendered but disabled.
    const toggle = screen.getByTestId('todo-toggle-a') as HTMLButtonElement
    expect(toggle.disabled).toBe(true)
    // No add input for voting guest.
    expect(screen.queryByTestId('todo-input-2026-04-26')).toBeNull()
  })

  it('creates a household-level todo by default', async () => {
    render(
      createElement(TodoList, {
        ...baseProps,
        todos: [],
        currentRole: 'member',
      }),
    )
    fireEvent.change(screen.getByTestId('todo-input-2026-04-26'), {
      target: { value: 'Pick up parcel' },
    })
    fireEvent.click(screen.getByTestId('todo-add-2026-04-26'))
    expect(mockCreate.mutateAsync).toHaveBeenCalledWith({
      household_id: 'hh-1',
      date: '2026-04-26',
      title: 'Pick up parcel',
      user_id: null,
      created_by: 'u-me',
    })
  })

  it('creates a private todo when the "Just for me" box is ticked', async () => {
    render(
      createElement(TodoList, {
        ...baseProps,
        todos: [],
        currentRole: 'honoured_guest',
      }),
    )
    fireEvent.click(screen.getByTestId('todo-private-2026-04-26'))
    fireEvent.change(screen.getByTestId('todo-input-2026-04-26'), {
      target: { value: 'Personal note' },
    })
    fireEvent.click(screen.getByTestId('todo-add-2026-04-26'))
    expect(mockCreate.mutateAsync).toHaveBeenCalledWith({
      household_id: 'hh-1',
      date: '2026-04-26',
      title: 'Personal note',
      user_id: 'u-me',
      created_by: 'u-me',
    })
  })

  it('marks private todos with a "Private" pill', () => {
    render(
      createElement(TodoList, {
        ...baseProps,
        todos: [todo({ id: 'p', user_id: 'u-me' })],
        currentRole: 'owner',
      }),
    )
    expect(screen.getByText('Private')).toBeDefined()
  })
})
