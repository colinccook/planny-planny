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

const mockHousehold = {
  id: 'h1',
  name: 'Test',
  alias: null,
  default_adults: 2,
  default_children: 1,
  default_babies: 0,
  public_share_token: null,
  created_by: null,
  created_at: '',
}

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
        household: mockHousehold,
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByLabelText('Event')).toBeDefined()
    expect(screen.getByLabelText(/End date/)).toBeDefined()
    expect(screen.getByText('Extra adults')).toBeDefined()
    expect(screen.getByText('Extra children')).toBeDefined()
    expect(screen.getByText('Extra babies')).toBeDefined()
    expect(screen.getByText('Add context')).toBeDefined()
  })

  it('submits with end_date when provided', async () => {
    const onClose = vi.fn()
    render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        household: mockHousehold,
        onClose,
      }),
      { wrapper: createWrapper() }
    )

    fireEvent.change(screen.getByLabelText('Event'), { target: { value: 'Holiday' } })
    fireEvent.change(screen.getByLabelText(/End date/), { target: { value: '2024-06-20' } })
    fireEvent.click(screen.getByText('Add context'))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        household_id: 'h1',
        date: '2024-06-15',
        event_name: 'Holiday',
        end_date: '2024-06-20',
        extra_adults: 0,
        extra_children: 0,
        extra_babies: 0,
      })
    })
  })

  it('renders form with existing values', () => {
    const existing = {
      id: 'ctx1',
      household_id: 'h1',
      date: '2024-06-15',
      end_date: null,
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
        household: mockHousehold,
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect((screen.getByLabelText('Event') as HTMLInputElement).value).toBe('Party')
    expect(screen.getByTestId('extra-adults-value').textContent).toBe('3')
    expect(screen.getByTestId('extra-children-value').textContent).toBe('2')
    expect(screen.getByTestId('extra-babies-value').textContent).toBe('1')
    expect(screen.getByText('Update')).toBeDefined()
  })

  it('increments extra adults via stepper', async () => {
    const onClose = vi.fn()
    render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        household: mockHousehold,
        onClose,
      }),
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('extra-adults-increment'))
    fireEvent.click(screen.getByTestId('extra-adults-increment'))

    expect(screen.getByTestId('extra-adults-value').textContent).toBe('2')

    fireEvent.click(screen.getByText('Add context'))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        household_id: 'h1',
        date: '2024-06-15',
        event_name: null,
        end_date: null,
        extra_adults: 2,
        extra_children: 0,
        extra_babies: 0,
      })
    })
  })

  it('clamps extra adults min to negative household default', () => {
    render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        household: { ...mockHousehold, default_adults: 3 },
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    // Click decrement 4 times — should stop at -3
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByTestId('extra-adults-decrement'))
    }
    expect(screen.getByTestId('extra-adults-value').textContent).toBe('-3')
  })

  it('shows Delete button only for existing contexts', () => {
    const { rerender } = render(
      createElement(DayContextForm, {
        householdId: 'h1',
        date: '2024-06-15',
        household: mockHousehold,
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.queryByText('Delete')).toBeNull()

    const existing = {
      id: 'ctx1',
      household_id: 'h1',
      date: '2024-06-15',
      end_date: null,
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
        household: mockHousehold,
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
      end_date: null,
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
        household: mockHousehold,
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
