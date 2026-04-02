import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const today = new Date().toISOString().split('T')[0]
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const mockIngredients = [
  { id: 'i1', household_id: 'h1', name: 'Chicken', starred: true, warning: false, created_at: '' },
  { id: 'i2', household_id: 'h1', name: 'Salmon', starred: true, warning: false, created_at: '' },
  { id: 'i3', household_id: 'h1', name: 'Peanuts', starred: false, warning: true, created_at: '' },
  { id: 'i4', household_id: 'h1', name: 'Shellfish', starred: false, warning: true, created_at: '' },
  { id: 'i5', household_id: 'h1', name: 'Rice', starred: false, warning: false, created_at: '' },
]

const mockUsageStats = [
  { ingredient_id: 'i1', usage_count: 5, last_planned_date: thirtyDaysAgo },
  { ingredient_id: 'i2', usage_count: 3, last_planned_date: today },
  { ingredient_id: 'i3', usage_count: 2, last_planned_date: today },
  { ingredient_id: 'i4', usage_count: 1, last_planned_date: thirtyDaysAgo },
]

vi.mock('../../hooks/useIngredients', () => ({
  useIngredients: () => ({ data: mockIngredients }),
  useIngredientUsageStats: () => ({ data: mockUsageStats }),
}))

import IngredientSuggestions from './IngredientSuggestions'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('IngredientSuggestions', () => {
  it('shows starred suggestions section', () => {
    const onAdd = vi.fn()
    render(
      createElement(IngredientSuggestions, { householdId: 'h1', onAddIngredient: onAdd }),
      { wrapper: createWrapper() }
    )
    expect(screen.getByText(/Starred ingredients/)).toBeDefined()
  })

  it('shows starred ingredients sorted by least recently planned', () => {
    const onAdd = vi.fn()
    render(
      createElement(IngredientSuggestions, { householdId: 'h1', onAddIngredient: onAdd }),
      { wrapper: createWrapper() }
    )
    // Chicken was planned 30 days ago, Salmon today — Chicken should appear first
    const tags = screen.getAllByLabelText(/Add/)
    const chickenIndex = tags.findIndex((t) => t.getAttribute('aria-label') === 'Add Chicken')
    const salmonIndex = tags.findIndex((t) => t.getAttribute('aria-label') === 'Add Salmon')
    expect(chickenIndex).toBeLessThan(salmonIndex)
  })

  it('shows warning section for recently used warning ingredients', () => {
    const onAdd = vi.fn()
    render(
      createElement(IngredientSuggestions, { householdId: 'h1', onAddIngredient: onAdd }),
      { wrapper: createWrapper() }
    )
    expect(screen.getByText(/Used in last 7 days/)).toBeDefined()
    // Peanuts was used today, Shellfish was 30 days ago (not recent)
    expect(screen.getByText(/Peanuts/)).toBeDefined()
  })

  it('calls onAddIngredient when add button clicked', () => {
    const onAdd = vi.fn()
    render(
      createElement(IngredientSuggestions, { householdId: 'h1', onAddIngredient: onAdd }),
      { wrapper: createWrapper() }
    )
    fireEvent.click(screen.getByLabelText('Add Chicken'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1', name: 'Chicken' }))
  })

  it('excludes specified ingredient IDs', () => {
    const onAdd = vi.fn()
    render(
      createElement(IngredientSuggestions, {
        householdId: 'h1',
        onAddIngredient: onAdd,
        excludeIds: ['i1'],
      }),
      { wrapper: createWrapper() }
    )
    expect(screen.queryByLabelText('Add Chicken')).toBeNull()
  })
})
