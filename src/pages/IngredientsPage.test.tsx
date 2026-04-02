import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockIngredients = [
  { id: 'i1', household_id: 'h1', name: 'Chicken', starred: true, warning: false, created_at: '' },
  { id: 'i2', household_id: 'h1', name: 'Rice', starred: false, warning: false, created_at: '' },
]

vi.mock('../hooks/useIngredients', () => ({
  useIngredients: () => ({ data: mockIngredients }),
}))

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: () => ({
    households: [{ id: 'h1', name: 'My House' }],
    currentHousehold: { id: 'h1', name: 'My House' },
    currentRole: 'owner',
    switchHousehold: vi.fn(),
    isLoading: false,
  }),
}))

// Mock the child components so we test IngredientsPage's logic, not children
vi.mock('../components/ingredients/AddIngredientForm', () => ({
  default: (props: { householdId: string }) =>
    createElement('div', { 'data-testid': 'add-form', 'data-household-id': props.householdId }),
}))

vi.mock('../components/ingredients/IngredientsList', () => ({
  default: (props: { householdId: string; sortBy: string }) =>
    createElement('div', { 'data-testid': 'ingredients-list', 'data-sort': props.sortBy }),
}))

import IngredientsPage from './IngredientsPage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('IngredientsPage', () => {
  it('renders the page title', () => {
    render(createElement(IngredientsPage), { wrapper: createWrapper() })
    expect(screen.getByText('Ingredients')).toBeDefined()
  })

  it('renders the sort dropdown', () => {
    render(createElement(IngredientsPage), { wrapper: createWrapper() })
    expect(screen.getByLabelText('Sort ingredients')).toBeDefined()
  })

  it('renders add form for owners', () => {
    render(createElement(IngredientsPage), { wrapper: createWrapper() })
    expect(screen.getByTestId('add-form')).toBeDefined()
  })

  it('renders ingredients list', () => {
    render(createElement(IngredientsPage), { wrapper: createWrapper() })
    expect(screen.getByTestId('ingredients-list')).toBeDefined()
  })

  it('passes sort option to ingredients list', () => {
    render(createElement(IngredientsPage), { wrapper: createWrapper() })
    const list = screen.getByTestId('ingredients-list')
    expect(list.getAttribute('data-sort')).toBe('alphabetical')
  })

  it('changes sort when dropdown changes', () => {
    render(createElement(IngredientsPage), { wrapper: createWrapper() })
    const select = screen.getByLabelText('Sort ingredients')
    fireEvent.change(select, { target: { value: 'most-used' } })
    const list = screen.getByTestId('ingredients-list')
    expect(list.getAttribute('data-sort')).toBe('most-used')
  })
})
