import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockMutate = vi.fn()

vi.mock('../../hooks/useIngredients', () => ({
  useCreateIngredient: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

import AddIngredientForm from './AddIngredientForm'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const baseProps = {
  householdId: 'h1',
  existingIngredients: [
    { id: 'i1', household_id: 'h1', name: 'Chicken', starred: true, warning: false, created_at: '' },
    { id: 'i2', household_id: 'h1', name: 'Rice', starred: false, warning: false, created_at: '' },
  ],
}

describe('AddIngredientForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the name input and add button', () => {
    render(createElement(AddIngredientForm, baseProps), { wrapper: createWrapper() })
    expect(screen.getByLabelText('Add ingredient')).toBeDefined()
    expect(screen.getByRole('button', { name: /Add/i })).toBeDefined()
  })

  it('disables submit when name is empty', () => {
    render(createElement(AddIngredientForm, baseProps), { wrapper: createWrapper() })
    const button = screen.getByRole('button', { name: /Add/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('shows duplicate warning when ingredient already exists', () => {
    render(createElement(AddIngredientForm, baseProps), { wrapper: createWrapper() })
    const input = screen.getByLabelText('Add ingredient')
    fireEvent.change(input, { target: { value: 'Chicken' } })
    expect(screen.getByText('This ingredient already exists')).toBeDefined()
  })

  it('shows duplicate warning case-insensitively', () => {
    render(createElement(AddIngredientForm, baseProps), { wrapper: createWrapper() })
    const input = screen.getByLabelText('Add ingredient')
    fireEvent.change(input, { target: { value: 'chicken' } })
    expect(screen.getByText('This ingredient already exists')).toBeDefined()
  })

  it('disables submit when duplicate exists', () => {
    render(createElement(AddIngredientForm, baseProps), { wrapper: createWrapper() })
    const input = screen.getByLabelText('Add ingredient')
    fireEvent.change(input, { target: { value: 'Chicken' } })
    const button = screen.getByRole('button', { name: /Add/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('shows autocomplete suggestions when typing', () => {
    render(createElement(AddIngredientForm, baseProps), { wrapper: createWrapper() })
    const input = screen.getByLabelText('Add ingredient')
    fireEvent.change(input, { target: { value: 'Chi' } })
    fireEvent.focus(input)
    expect(screen.getByRole('option', { name: /Chicken/ })).toBeDefined()
  })

  it('calls mutate with correct data on submit', () => {
    render(createElement(AddIngredientForm, baseProps), { wrapper: createWrapper() })
    const input = screen.getByLabelText('Add ingredient')
    fireEvent.change(input, { target: { value: 'Beef' } })
    const form = screen.getByRole('button', { name: /Add/i }).closest('form')
    if (!form) throw new Error('Expected to find a parent form element')
    fireEvent.submit(form)
    expect(mockMutate).toHaveBeenCalledWith(
      { household_id: 'h1', name: 'Beef', starred: false, warning: false },
      expect.any(Object)
    )
  })

  it('includes star and warning flags when toggled', () => {
    render(createElement(AddIngredientForm, baseProps), { wrapper: createWrapper() })
    const input = screen.getByLabelText('Add ingredient')
    fireEvent.change(input, { target: { value: 'Tofu' } })

    const starCheckbox = screen.getByRole('checkbox', { name: /Star/i })
    const warningCheckbox = screen.getByRole('checkbox', { name: /Warning/i })
    fireEvent.click(starCheckbox)
    fireEvent.click(warningCheckbox)

    const form = screen.getByRole('button', { name: /Add/i }).closest('form')
    if (!form) throw new Error('Expected to find a parent form element')
    fireEvent.submit(form)
    expect(mockMutate).toHaveBeenCalledWith(
      { household_id: 'h1', name: 'Tofu', starred: true, warning: true },
      expect.any(Object)
    )
  })
})
