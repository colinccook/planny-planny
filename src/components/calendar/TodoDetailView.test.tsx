import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'

const mockCreate = { mutateAsync: vi.fn(), isPending: false }
const mockUpdate = { mutateAsync: vi.fn(), isPending: false }
const mockDelete = { mutateAsync: vi.fn(), isPending: false }
const mockComplete = { mutate: vi.fn(), isPending: false }
const mockReopen = { mutate: vi.fn(), isPending: false }

vi.mock('../../hooks/useTodos', () => ({
  useCreateTodo: () => mockCreate,
  useUpdateTodo: () => mockUpdate,
  useDeleteTodo: () => mockDelete,
  useCompleteTodo: () => mockComplete,
  useReopenTodo: () => mockReopen,
}))

vi.mock('../../hooks/useMealPlans', () => ({
  useMealPlans: () => ({ data: [] }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-me' } }),
}))

// FullScreenView wraps via a header context provider in the real
// app; in tests we just render the children straight through.
vi.mock('../ui/FullScreenView', () => ({
  default: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
}))

import TodoDetailView from './TodoDetailView'
import type { TodoItem } from '../../hooks/useTodos'

function todo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 't-1',
    household_id: 'hh-1',
    user_id: null,
    date: '2026-05-10',
    title: 'Buy milk',
    note: null,
    completed_on: null,
    completed_at: null,
    created_by: 'u-me',
    created_at: '2026-05-06T00:00:00Z',
    ...overrides,
  }
}

const onBack = vi.fn()
const onSaved = vi.fn()

const baseProps = {
  householdId: 'hh-1',
  date: '2026-05-10',
  onBack,
  onSaved,
}

describe('TodoDetailView — create mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mutateAsync.mockResolvedValue(undefined)
  })

  it('renders empty fields and the create-mode title', () => {
    render(createElement(TodoDetailView, baseProps))
    expect(screen.getByText('What needs doing?')).toBeDefined()
    expect(screen.getByTestId('todo-save-button').textContent).toContain('Save Todo')
    // No delete affordance in create mode.
    expect(screen.queryByTestId('todo-delete-button')).toBeNull()
    // No "done" toggle in create mode.
    expect(screen.queryByTestId('todo-detail-done-toggle')).toBeNull()
  })

  it('saves a new household-level todo with note and the URL date', async () => {
    render(createElement(TodoDetailView, baseProps))

    fireEvent.click(screen.getByTestId('todo-title-field'))
    fireEvent.change(screen.getByTestId('todo-title-input'), {
      target: { value: 'Pick up parcel' },
    })

    fireEvent.click(screen.getByTestId('todo-note-field'))
    fireEvent.change(screen.getByTestId('todo-note-input'), {
      target: { value: 'From the corner shop' },
    })

    fireEvent.click(screen.getByTestId('todo-save-button'))

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith({
        household_id: 'hh-1',
        date: '2026-05-10',
        title: 'Pick up parcel',
        note: 'From the corner shop',
        user_id: null,
        created_by: 'u-me',
      })
      expect(onSaved).toHaveBeenCalled()
    })
  })

  it('saves a private todo when "Just for me" is ticked', async () => {
    render(createElement(TodoDetailView, baseProps))

    fireEvent.click(screen.getByTestId('todo-title-field'))
    fireEvent.change(screen.getByTestId('todo-title-input'), {
      target: { value: 'Personal note' },
    })
    fireEvent.click(screen.getByTestId('todo-private-checkbox'))

    fireEvent.click(screen.getByTestId('todo-save-button'))

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Personal note',
          user_id: 'u-me',
          note: null,
        }),
      )
    })
  })

  it('does not save when the title is blank', () => {
    render(createElement(TodoDetailView, baseProps))
    const button = screen.getByTestId('todo-save-button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })
})

describe('TodoDetailView — edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mutateAsync.mockResolvedValue(undefined)
    mockDelete.mutateAsync.mockResolvedValue(undefined)
  })

  it('pre-fills fields from the existing todo', () => {
    render(
      createElement(TodoDetailView, {
        ...baseProps,
        existingTodo: todo({ title: 'Buy bread', note: 'wholemeal' }),
      }),
    )
    expect(screen.getByText('Buy bread')).toBeDefined()
    expect(screen.getByText('wholemeal')).toBeDefined()
    expect(screen.getByTestId('todo-save-button').textContent).toContain(
      'Update Todo',
    )
    expect(screen.getByTestId('todo-delete-button')).toBeDefined()
  })

  it('updates the todo with the new title, date and note', async () => {
    render(
      createElement(TodoDetailView, {
        ...baseProps,
        existingTodo: todo({ title: 'Old', date: '2026-05-10' }),
      }),
    )

    fireEvent.click(screen.getByTestId('todo-title-field'))
    fireEvent.change(screen.getByTestId('todo-title-input'), {
      target: { value: 'New title' },
    })

    fireEvent.click(screen.getByTestId('todo-note-field'))
    fireEvent.change(screen.getByTestId('todo-note-input'), {
      target: { value: 'with a note' },
    })

    fireEvent.click(screen.getByTestId('todo-save-button'))

    await waitFor(() => {
      expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({
        id: 't-1',
        householdId: 'hh-1',
        title: 'New title',
        date: '2026-05-10',
        note: 'with a note',
      })
      expect(onSaved).toHaveBeenCalled()
    })
  })

  it('deletes the todo when the delete button is tapped', async () => {
    render(
      createElement(TodoDetailView, {
        ...baseProps,
        existingTodo: todo({ id: 't-9' }),
      }),
    )
    fireEvent.click(screen.getByTestId('todo-delete-button'))
    await waitFor(() => {
      expect(mockDelete.mutateAsync).toHaveBeenCalledWith({
        id: 't-9',
        householdId: 'hh-1',
      })
      expect(onSaved).toHaveBeenCalled()
    })
  })

  it('marks an open todo done from the done toggle', () => {
    render(
      createElement(TodoDetailView, {
        ...baseProps,
        existingTodo: todo({ id: 't-2' }),
      }),
    )
    fireEvent.click(screen.getByTestId('todo-detail-done-toggle'))
    expect(mockComplete.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't-2', householdId: 'hh-1' }),
    )
  })

  it('reopens a completed todo from the done toggle', () => {
    render(
      createElement(TodoDetailView, {
        ...baseProps,
        existingTodo: todo({
          id: 't-3',
          completed_on: '2026-05-10',
          completed_at: '2026-05-10T09:00:00Z',
        }),
      }),
    )
    fireEvent.click(screen.getByTestId('todo-detail-done-toggle'))
    expect(mockReopen.mutate).toHaveBeenCalledWith({
      id: 't-3',
      householdId: 'hh-1',
    })
  })

  it('reschedules a todo by picking a new date from the date tray', async () => {
    render(
      createElement(TodoDetailView, {
        ...baseProps,
        existingTodo: todo({ date: '2026-05-10' }),
      }),
    )
    // Open the date tray.
    fireEvent.click(screen.getByTestId('todo-date-field'))
    // The date list contains today + 14 future days. Pick the
    // first option (today) which is whatever today happens to be.
    const list = screen.getByTestId('todo-date-picker-list')
    const firstOption = list.querySelectorAll<HTMLButtonElement>(
      'button[data-testid^="todo-date-option-"]',
    )[0]
    expect(firstOption).toBeDefined()
    fireEvent.click(firstOption)
    fireEvent.click(screen.getByTestId('todo-save-button'))
    await waitFor(() => {
      expect(mockUpdate.mutateAsync).toHaveBeenCalled()
    })
    const args = mockUpdate.mutateAsync.mock.calls[0][0] as {
      date: string
    }
    expect(args.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not show the private toggle in edit mode', () => {
    render(
      createElement(TodoDetailView, {
        ...baseProps,
        existingTodo: todo(),
      }),
    )
    expect(screen.queryByTestId('todo-private-checkbox')).toBeNull()
  })

  it('shows a private badge in edit mode for private todos', () => {
    render(
      createElement(TodoDetailView, {
        ...baseProps,
        existingTodo: todo({ user_id: 'u-me' }),
      }),
    )
    expect(screen.getByTestId('todo-private-badge')).toBeDefined()
  })
})
