import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()

const mockIngredients = [
  { id: 'i1', household_id: 'h1', name: 'Chicken', starred: true, warning: false, created_at: '' },
  { id: 'i2', household_id: 'h1', name: 'Rice', starred: false, warning: false, created_at: '' },
  { id: 'i3', household_id: 'h1', name: 'Peanuts', starred: false, warning: true, created_at: '' },
]

const mockUsageStats = [
  { ingredient_id: 'i1', usage_count: 5, last_planned_date: '2025-01-10' },
  { ingredient_id: 'i2', usage_count: 12, last_planned_date: '2025-01-15' },
]

vi.mock('../../hooks/useIngredients', () => ({
  useIngredients: () => ({ data: mockIngredients, isLoading: false }),
  useIngredientUsageStats: () => ({ data: mockUsageStats }),
  useUpdateIngredient: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteIngredient: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}))

import IngredientsList from './IngredientsList'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('IngredientsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all ingredients', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Chicken')).toBeDefined()
    expect(screen.getByText('Rice')).toBeDefined()
    expect(screen.getByText('Peanuts')).toBeDefined()
  })

  it('shows usage count for ingredients', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Used 5 times')).toBeDefined()
    expect(screen.getByText('Used 12 times')).toBeDefined()
    expect(screen.getByText('Used 0 times')).toBeDefined()
  })

  it('renders search input', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    expect(screen.getByPlaceholderText('Search ingredients…')).toBeDefined()
  })

  it('filters ingredients by search', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    const searchInput = screen.getByPlaceholderText('Search ingredients…')
    fireEvent.change(searchInput, { target: { value: 'chick' } })
    expect(screen.getByText('Chicken')).toBeDefined()
    expect(screen.queryByText('Rice')).toBeNull()
    expect(screen.queryByText('Peanuts')).toBeNull()
  })

  it('shows empty state when search matches nothing', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    const searchInput = screen.getByPlaceholderText('Search ingredients…')
    fireEvent.change(searchInput, { target: { value: 'xyz' } })
    expect(screen.getByText('No ingredients match your search.')).toBeDefined()
  })

  it('toggles star when star button clicked', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByLabelText('Unstar Chicken'))
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'i1',
      householdId: 'h1',
      updates: { starred: false },
    })
  })

  it('toggles warning when warning button clicked', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByLabelText('Remove warning from Peanuts'))
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'i3',
      householdId: 'h1',
      updates: { warning: false },
    })
  })

  it('shows confirmation when delete is clicked', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByLabelText('Delete Rice'))
    expect(screen.getByText('Confirm')).toBeDefined()
    expect(screen.getByText('Cancel')).toBeDefined()
  })

  it('calls delete on confirm', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByLabelText('Delete Rice'))
    fireEvent.click(screen.getByText('Confirm'))
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { id: 'i2', householdId: 'h1' },
      expect.any(Object)
    )
  })

  it('cancels delete when cancel is clicked', () => {
    render(createElement(IngredientsList, { householdId: 'h1', sortBy: 'alphabetical' }), {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByLabelText('Delete Rice'))
    fireEvent.click(screen.getByText('Cancel'))
    // Confirm/Cancel buttons should be gone, delete button should be back
    expect(screen.queryByText('Confirm')).toBeNull()
    expect(screen.getByLabelText('Delete Rice')).toBeDefined()
  })
})
