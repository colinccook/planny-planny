import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import DayPlaceholders from './DayPlaceholders'

const mockUseHousehold = vi.fn()
vi.mock('../../hooks/useHousehold', () => ({
  useHousehold: () => mockUseHousehold(),
}))

const mockUseDayPlaceholders = vi.fn()
const mockUseUpsertDayPlaceholder = vi.fn()
const mockUseDeleteDayPlaceholder = vi.fn()
vi.mock('../../hooks/useDayPlaceholders', () => ({
  useDayPlaceholders: (...args: unknown[]) => mockUseDayPlaceholders(...args),
  useUpsertDayPlaceholder: () => mockUseUpsertDayPlaceholder(),
  useDeleteDayPlaceholder: () => mockUseDeleteDayPlaceholder(),
}))

const mockHousehold = {
  id: 'h1',
  name: 'Test House',
  alias: null,
  default_adults: 2,
  default_children: 0,
  default_babies: 0,
  public_share_token: null,
  created_by: 'u1',
  created_at: '2024-01-01',
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('DayPlaceholders', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseUpsertDayPlaceholder.mockReturnValue({ mutateAsync: vi.fn() })
    mockUseDeleteDayPlaceholder.mockReturnValue({ mutateAsync: vi.fn() })
  })

  it('renders all 7 days of the week', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'owner',
    })
    mockUseDayPlaceholders.mockReturnValue({
      data: [],
      isLoading: false,
    })

    render(createElement(DayPlaceholders), { wrapper: createWrapper() })

    expect(screen.getByText('Monday')).toBeDefined()
    expect(screen.getByText('Tuesday')).toBeDefined()
    expect(screen.getByText('Wednesday')).toBeDefined()
    expect(screen.getByText('Thursday')).toBeDefined()
    expect(screen.getByText('Friday')).toBeDefined()
    expect(screen.getByText('Saturday')).toBeDefined()
    expect(screen.getByText('Sunday')).toBeDefined()
  })

  it('shows heading and description', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'owner',
    })
    mockUseDayPlaceholders.mockReturnValue({
      data: [],
      isLoading: false,
    })

    render(createElement(DayPlaceholders), { wrapper: createWrapper() })

    expect(screen.getByText('Day Placeholders')).toBeDefined()
    expect(screen.getByText(/Set default themes for each day/)).toBeDefined()
  })

  it('pre-fills existing placeholder labels', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'owner',
    })
    mockUseDayPlaceholders.mockReturnValue({
      data: [
        { id: 'p1', household_id: 'h1', day_of_week: 1, label: 'Oily fish Monday' },
        { id: 'p2', household_id: 'h1', day_of_week: 4, label: 'Veggie Thursday' },
      ],
      isLoading: false,
    })

    render(createElement(DayPlaceholders), { wrapper: createWrapper() })

    expect(screen.getByDisplayValue('Oily fish Monday')).toBeDefined()
    expect(screen.getByDisplayValue('Veggie Thursday')).toBeDefined()
  })

  it('shows clear buttons for existing placeholders when editable', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'owner',
    })
    mockUseDayPlaceholders.mockReturnValue({
      data: [
        { id: 'p1', household_id: 'h1', day_of_week: 1, label: 'Oily fish Monday' },
      ],
      isLoading: false,
    })

    render(createElement(DayPlaceholders), { wrapper: createWrapper() })

    expect(screen.getByRole('button', { name: 'Clear Monday' })).toBeDefined()
  })

  it('disables inputs for guest role', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'guest',
    })
    mockUseDayPlaceholders.mockReturnValue({
      data: [],
      isLoading: false,
    })

    render(createElement(DayPlaceholders), { wrapper: createWrapper() })

    const mondayInput = screen.getByRole('textbox', { name: 'Monday placeholder' })
    expect(mondayInput).toHaveProperty('disabled', true)
    expect(screen.getByText(/Only owners and members/)).toBeDefined()
  })

  it('renders nothing when no household selected', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: null,
      currentRole: null,
    })
    mockUseDayPlaceholders.mockReturnValue({
      data: [],
      isLoading: false,
    })

    const { container } = render(createElement(DayPlaceholders), {
      wrapper: createWrapper(),
    })

    expect(container.innerHTML).toBe('')
  })

  it('shows loading skeleton when fetching', () => {
    mockUseHousehold.mockReturnValue({
      currentHousehold: mockHousehold,
      currentRole: 'owner',
    })
    mockUseDayPlaceholders.mockReturnValue({
      data: [],
      isLoading: true,
    })

    render(createElement(DayPlaceholders), { wrapper: createWrapper() })

    expect(screen.getByText('Day Placeholders')).toBeDefined()
    expect(screen.queryByText('Monday')).toBeNull()
  })
})
