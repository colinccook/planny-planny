import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Supabase mock ──────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

// ── useMealPlans mock (for DayRow) ──────────────────────────

const mockDeleteMutate = vi.fn()

vi.mock('../../hooks/useMealPlans', async () => {
  const actual = await vi.importActual('../../hooks/useMealPlans')
  return {
    ...actual,
    useDeleteMealPlan: () => ({ mutate: mockDeleteMutate, isPending: false }),
    useCreateMealPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdateMealPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateDayContext: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdateDayContext: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteDayContext: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }
})

import DayRow from './DayRow'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const mockHousehold = {
  id: 'h1',
  name: 'Test House',
  alias: null,
  default_adults: 2,
  default_children: 1,
  public_share_token: null,
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
}

const baseMeal = {
  id: 'meal-1',
  household_id: 'h1',
  date: '2024-06-15',
  title: 'Grilled Salmon',
  description: 'with roasted veggies',
  created_by: 'u1',
  created_at: '2024-06-15T08:00:00Z',
  updated_at: '2024-06-15T08:00:00Z',
  meal_plan_ingredients: [],
}

describe('DayRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the date label and household context', () => {
    render(
      createElement(DayRow, {
        date: '2099-12-25',
        household: mockHousehold,
        contexts: [],
        placeholder: null,
        meals: [],
        currentRole: 'owner',
      }),
      { wrapper: createWrapper() }
    )

    // Should display a formatted date
    // 2099-12-25 is a Friday in most locales
    expect(screen.getByRole('heading', { level: 3 })).toBeDefined()
    // Default people count
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('1')).toBeDefined()
  })

  it('renders meals for the day', () => {
    render(
      createElement(DayRow, {
        date: '2024-06-15',
        household: mockHousehold,
        contexts: [],
        placeholder: null,
        meals: [baseMeal],
        currentRole: 'owner',
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Grilled Salmon')).toBeDefined()
    expect(screen.getByText('with roasted veggies')).toBeDefined()
  })

  it('renders multiple meals', () => {
    const secondMeal = {
      ...baseMeal,
      id: 'meal-2',
      title: 'Pasta Carbonara',
      description: null,
    }
    render(
      createElement(DayRow, {
        date: '2024-06-15',
        household: mockHousehold,
        contexts: [],
        placeholder: null,
        meals: [baseMeal, secondMeal],
        currentRole: 'owner',
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Grilled Salmon')).toBeDefined()
    expect(screen.getByText('Pasta Carbonara')).toBeDefined()
  })

  it('shows the + Add meal button for owners', () => {
    render(
      createElement(DayRow, {
        date: '2024-06-15',
        household: mockHousehold,
        contexts: [],
        placeholder: null,
        meals: [],
        currentRole: 'owner',
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('+ Add meal')).toBeDefined()
  })

  it('hides + Add meal button for guests', () => {
    render(
      createElement(DayRow, {
        date: '2024-06-15',
        household: mockHousehold,
        contexts: [],
        placeholder: null,
        meals: [],
        currentRole: 'guest',
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.queryByText('+ Add meal')).toBeNull()
  })

  it('shows meal form when + Add meal is clicked', async () => {
    render(
      createElement(DayRow, {
        date: '2024-06-15',
        household: mockHousehold,
        contexts: [],
        placeholder: null,
        meals: [],
        currentRole: 'member',
      }),
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByText('+ Add meal'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("What's for dinner?")).toBeDefined()
    })
  })

  it('renders day placeholder label', () => {
    render(
      createElement(DayRow, {
        date: '2024-06-15',
        household: mockHousehold,
        contexts: [],
        placeholder: {
          id: 'ph1',
          household_id: 'h1',
          day_of_week: 6,
          label: '🐟 Oily fish day',
        },
        meals: [],
        currentRole: 'owner',
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('🐟 Oily fish day')).toBeDefined()
  })

  it('shows day context events', () => {
    const context = {
      id: 'ctx1',
      household_id: 'h1',
      date: '2024-06-15',
      event_name: 'Mum visiting',
      extra_adults: 1,
      extra_children: 0,
      created_at: '2024-06-15T00:00:00Z',
    }

    render(
      createElement(DayRow, {
        date: '2024-06-15',
        household: mockHousehold,
        contexts: [context],
        placeholder: null,
        meals: [],
        currentRole: 'owner',
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Mum visiting')).toBeDefined()
    // 2 default + 1 extra adult = 3
    expect(screen.getByText('3')).toBeDefined()
  })
})
