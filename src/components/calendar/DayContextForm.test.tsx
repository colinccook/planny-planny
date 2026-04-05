import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockCreateMutateAsync = vi.fn()
const mockUpdateMutateAsync = vi.fn()
const mockDeleteMutateAsync = vi.fn()

vi.mock('../../hooks/useMealPlans', () => ({
  useCreateDayContext: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateDayContext: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useDeleteDayContext: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}))

import DayContextForm from './DayContextForm'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('DayContextForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateMutateAsync.mockResolvedValue({})
    mockUpdateMutateAsync.mockResolvedValue({})
    mockDeleteMutateAsync.mockResolvedValue({})
  })

  it('renders empty form for new context', () => {
    render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByLabelText('Event')).toBeDefined()
    expect(screen.getByLabelText('Extra adults')).toBeDefined()
    expect(screen.getByLabelText('Extra children')).toBeDefined()
    expect(screen.getByLabelText('Extra babies')).toBeDefined()
    expect(screen.getByText('Add context')).toBeDefined()
  })

  it('renders form with existing values', () => {
    const existing = {
      id: 'ctx1',
      household_id: 'h1',
      date: '2024-06-15',
      event_name: 'Party',
      extra_adults: 3,
      extra_children: 2,
      extra_babies: 1,
      created_at: '',
    }

    render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        existing,
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect((screen.getByLabelText('Event') as HTMLInputElement).value).toBe('Party')
    expect((screen.getByLabelText('Extra adults') as HTMLInputElement).value).toBe('3')
    expect((screen.getByLabelText('Extra children') as HTMLInputElement).value).toBe('2')
    expect((screen.getByLabelText('Extra babies') as HTMLInputElement).value).toBe('1')
    expect(screen.getByText('Update')).toBeDefined()
  })

  it('calls createDayContext on submit for new context', async () => {
    const onClose = vi.fn()
    render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose,
      }),
      { wrapper: createWrapper() }
    )

    fireEvent.change(screen.getByLabelText('Event'), {
      target: { value: 'BBQ night' },
    })
    fireEvent.change(screen.getByLabelText('Extra adults'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByText('Add context'))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        household_id: 'h1',
        date: '2024-06-15',
        event_name: 'BBQ night',
        extra_adults: 2,
        extra_children: 0,
        extra_babies: 0,
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows Delete button only for existing contexts', () => {
    const { rerender } = render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.queryByText('Delete')).toBeNull()

    const existing = {
      id: 'ctx1',
      household_id: 'h1',
      date: '2024-06-15',
      event_name: 'Party',
      extra_adults: 0,
      extra_children: 0,
      extra_babies: 0,
      created_at: '',
    }

    rerender(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        existing,
        onClose: vi.fn(),
      })
    )

    expect(screen.getByText('Delete')).toBeDefined()
  })

  it('calls deleteDayContext on Delete click', async () => {
    const onClose = vi.fn()
    const existing = {
      id: 'ctx1',
      household_id: 'h1',
      date: '2024-06-15',
      event_name: 'Party',
      extra_adults: 0,
      extra_children: 0,
      extra_babies: 0,
      created_at: '',
    }

    render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        existing,
        onClose,
      }),
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
        id: 'ctx1',
        householdId: 'h1',
      })
    })
    expect(onClose).toHaveBeenCalled()
  })
})
