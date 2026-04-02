import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUseHousehold = vi.fn()

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: () => mockUseHousehold(),
}))

vi.mock('../hooks/useMealPlans', () => ({
  useMealPlans: () => ({ data: [], isLoading: false }),
  useDayContexts: () => ({ data: [], isLoading: false }),
  useDayPlaceholders: () => ({ data: [] }),
  useDeleteMealPlan: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateMealPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMealPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateDayContext: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDayContext: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDayContext: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import CalendarPage from './CalendarPage'

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
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('CalendarPage', () => {
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

  it('shows loading spinner when loading', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: null,
      currentRole: null,
      isLoading: true,
    })

    const { container } = render(createElement(CalendarPage), {
      wrapper: createWrapper(),
    })

    // Spinner has animate-spin class
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeDefined()
    expect(spinner).not.toBeNull()
  })

  it('shows no household message when none selected', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: null,
      currentRole: null,
      isLoading: false,
    })

    render(createElement(CalendarPage), { wrapper: createWrapper() })
    expect(screen.getByText('No household selected.')).toBeDefined()
  })

  it('renders calendar view when household is available', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: {
        id: 'h1',
        name: 'Test House',
        alias: null,
        default_adults: 2,
        default_children: 1,
        public_share_token: null,
        created_by: 'u1',
        created_at: '',
      },
      currentRole: 'owner',
      isLoading: false,
    })

    render(createElement(CalendarPage), { wrapper: createWrapper() })
    expect(screen.getByText('Today')).toBeDefined()
  })
})
