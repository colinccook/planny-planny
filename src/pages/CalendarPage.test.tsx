import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUseHousehold = vi.fn()

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: () => mockUseHousehold(),
}))

vi.mock('../hooks/useMealPlans', () => ({
  useMealPlans: () => ({ data: [], isLoading: false }),
  useDayContexts: () => ({ data: [], isLoading: false }),
  useDayPlaceholders: () => ({ data: [] }),
}))

vi.mock('../hooks/useMealIdeas', () => ({
  useMealIdeas: () => ({ data: [] }),
}))

vi.mock('../hooks/useTodos', () => ({
  useTodos: () => ({ data: [] }),
  useGroupedTodos: () => new Map(),
  useCreateTodo: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useCompleteTodo: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useReopenTodo: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDeleteTodo: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  todoBelongsOnDay: () => false,
  groupTodosByDay: () => new Map(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

import CalendarPage from './CalendarPage'
import { CalendarDirectionProvider } from '../hooks/useCalendarDirection'

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
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(CalendarDirectionProvider, null, children),
      ),
    )
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

  it('shows loading skeleton when loading', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: null,
      currentRole: null,
      isLoading: true,
    })

    const { container } = render(createElement(CalendarPage), {
      wrapper: createWrapper(),
    })

    // Skeleton has animate-pulse class
    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).toBeDefined()
    expect(skeleton).not.toBeNull()
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
        default_babies: 0,
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
