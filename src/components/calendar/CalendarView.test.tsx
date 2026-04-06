import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../hooks/useMealPlans', () => ({
  useMealPlans: () => ({
    data: [
      {
        id: 'meal-1',
        household_id: 'h1',
        date: new Date().toISOString().slice(0, 10),
        title: 'Test Meal',
        description: null,
        created_by: 'u1',
        created_at: '',
        updated_at: '',
        meal_plan_ingredients: [],
      },
    ],
    isLoading: false,
  }),
  useDayContexts: () => ({
    data: [],
    isLoading: false,
  }),
  useDayPlaceholders: () => ({
    data: [],
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

import CalendarView from './CalendarView'

// Mock IntersectionObserver for jsdom
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

let origIO: typeof IntersectionObserver | undefined

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      MemoryRouter,
      null,
      createElement(QueryClientProvider, { client: queryClient }, children),
    )
  }
}

const mockHousehold = {
  id: 'h1',
  name: 'Test House',
  alias: null,
  default_adults: 2,
  default_children: 1,
  default_babies: 0,
  public_share_token: null,
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
}

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    origIO = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    if (origIO) {
      globalThis.IntersectionObserver = origIO
    }
  })

  it('renders 14 days initially', () => {
    render(
      createElement(CalendarView, {
        household: mockHousehold,
        currentRole: 'owner',
      }),
      { wrapper: createWrapper() }
    )

    // Should show "Today"
    expect(screen.getByText('Today')).toBeDefined()
    // Should show "Tomorrow"
    expect(screen.getByText('Tomorrow')).toBeDefined()
    // DayRow is now a clickable card, no "Add meal" buttons in calendar view
    const dayRows = screen.getAllByText('No meals planned')
    // 13 empty days (1 has a meal)
    expect(dayRows.length).toBe(13)
  })

  it('renders meals from data', () => {
    render(
      createElement(CalendarView, {
        household: mockHousehold,
        currentRole: 'owner',
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Test Meal')).toBeDefined()
  })

  it('renders day rows as clickable cards', () => {
    render(
      createElement(CalendarView, {
        household: mockHousehold,
        currentRole: 'guest',
      }),
      { wrapper: createWrapper() }
    )

    // Day rows should be rendered as clickable buttons
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(14)
  })
})
