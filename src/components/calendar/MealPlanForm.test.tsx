import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockCreateMutateAsync = vi.fn()
const mockUpdateMutateAsync = vi.fn()
const mockSetIngredientsMutateAsync = vi.fn()
const mockCreateIngredientMutateAsync = vi.fn()

vi.mock('../../hooks/useMealPlans', () => ({
  useCreateMealPlan: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateMealPlan: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useSetMealIngredients: () => ({
    mutateAsync: mockSetIngredientsMutateAsync,
    isPending: false,
  }),
}))

vi.mock('../../hooks/useIngredients', () => ({
  useIngredients: () => ({
    data: [
      { id: 'ing-1', household_id: 'h1', name: 'Salmon', starred: true, warning: false, created_at: '' },
      { id: 'ing-2', household_id: 'h1', name: 'Broccoli', starred: false, warning: false, created_at: '' },
      { id: 'ing-3', household_id: 'h1', name: 'Rice', starred: false, warning: true, created_at: '' },
    ],
  }),
  useCreateIngredient: () => ({
    mutateAsync: mockCreateIngredientMutateAsync,
    isPending: false,
  }),
  useIngredientUsageStats: () => ({ data: [] }),
}))

import MealPlanForm from './MealPlanForm'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('MealPlanForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-meal-1' })
    mockUpdateMutateAsync.mockResolvedValue({})
    mockSetIngredientsMutateAsync.mockResolvedValue({})
    mockCreateIngredientMutateAsync.mockResolvedValue({
      id: 'new-ing-1',
      household_id: 'h1',
      name: 'Tofu',
      starred: false,
      warning: false,
      created_at: '',
    })
  })

  it('renders add form with empty inputs', () => {
    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByPlaceholderText("What's for dinner?")).toBeDefined()
    expect(screen.getByPlaceholderText('Optional notes…')).toBeDefined()
    expect(screen.getByPlaceholderText('Search or add ingredients…')).toBeDefined()
    expect(screen.getByText('Add meal')).toBeDefined()
  })

  it('renders edit form with existing meal data and ingredients', () => {
    const existingMeal = {
      id: 'meal-1',
      household_id: 'h1',
      date: '2024-06-15',
      title: 'Grilled Salmon',
      description: 'with veggies',
      created_by: 'u1',
      created_at: '',
      updated_at: '',
      meal_plan_ingredients: [
        {
          meal_plan_id: 'meal-1',
          ingredient_id: 'ing-1',
          ingredients: { id: 'ing-1', household_id: 'h1', name: 'Salmon', starred: true, warning: false, created_at: '' },
        },
      ],
    }

    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        existingMeal,
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect((screen.getByPlaceholderText("What's for dinner?") as HTMLInputElement).value).toBe('Grilled Salmon')
    expect((screen.getByPlaceholderText('Optional notes…') as HTMLTextAreaElement).value).toBe('with veggies')
    expect(screen.getByText('Salmon')).toBeDefined()
    expect(screen.getByText('Update')).toBeDefined()
  })

  it('calls createMealPlan and setMealIngredients on submit for new meal', async () => {
    const onClose = vi.fn()
    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose,
      }),
      { wrapper: createWrapper() }
    )

    fireEvent.change(screen.getByPlaceholderText("What's for dinner?"), {
      target: { value: 'Pasta' },
    })
    fireEvent.click(screen.getByText('Add meal'))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        household_id: 'h1',
        date: '2024-06-15',
        title: 'Pasta',
        description: null,
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls updateMealPlan and setMealIngredients on submit for existing meal', async () => {
    const onClose = vi.fn()
    const existingMeal = {
      id: 'meal-1',
      household_id: 'h1',
      date: '2024-06-15',
      title: 'Grilled Salmon',
      description: null,
      created_by: 'u1',
      created_at: '',
      updated_at: '',
      meal_plan_ingredients: [
        {
          meal_plan_id: 'meal-1',
          ingredient_id: 'ing-1',
          ingredients: { id: 'ing-1', household_id: 'h1', name: 'Salmon', starred: true, warning: false, created_at: '' },
        },
      ],
    }

    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        existingMeal,
        onClose,
      }),
      { wrapper: createWrapper() }
    )

    fireEvent.change(screen.getByPlaceholderText("What's for dinner?"), {
      target: { value: 'Updated Salmon' },
    })
    fireEvent.click(screen.getByText('Update'))

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'meal-1',
        householdId: 'h1',
        title: 'Updated Salmon',
        description: null,
      })
    })
    await waitFor(() => {
      expect(mockSetIngredientsMutateAsync).toHaveBeenCalledWith({
        mealPlanId: 'meal-1',
        householdId: 'h1',
        ingredientIds: ['ing-1'],
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose,
      }),
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows autocomplete dropdown when typing in ingredient search', () => {
    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    const searchInput = screen.getByPlaceholderText('Search or add ingredients…')
    fireEvent.focus(searchInput)
    fireEvent.change(searchInput, { target: { value: 'Sal' } })

    expect(screen.getByTestId('ingredient-dropdown')).toBeDefined()
    expect(screen.getByText('Salmon ⭐')).toBeDefined()
  })

  it('adds ingredient from autocomplete and shows as removable tag', () => {
    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    const searchInput = screen.getByPlaceholderText('Search or add ingredients…')
    fireEvent.focus(searchInput)
    fireEvent.change(searchInput, { target: { value: 'Broc' } })
    fireEvent.click(screen.getByText('Broccoli'))

    expect(screen.getByTestId('selected-ingredients')).toBeDefined()
    expect(screen.getByText('Broccoli')).toBeDefined()
    expect(screen.getByLabelText('Remove Broccoli')).toBeDefined()
  })

  it('removes ingredient when remove button is clicked', () => {
    const existingMeal = {
      id: 'meal-1',
      household_id: 'h1',
      date: '2024-06-15',
      title: 'Test',
      description: null,
      created_by: 'u1',
      created_at: '',
      updated_at: '',
      meal_plan_ingredients: [
        {
          meal_plan_id: 'meal-1',
          ingredient_id: 'ing-2',
          ingredients: { id: 'ing-2', household_id: 'h1', name: 'Broccoli', starred: false, warning: false, created_at: '' },
        },
      ],
    }

    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        existingMeal,
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Broccoli')).toBeDefined()
    fireEvent.click(screen.getByLabelText('Remove Broccoli'))
    expect(screen.queryByTestId('selected-ingredients')).toBeNull()
  })

  it('creates new ingredient when it does not exist', async () => {
    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    const searchInput = screen.getByPlaceholderText('Search or add ingredients…')
    fireEvent.focus(searchInput)
    fireEvent.change(searchInput, { target: { value: 'Tofu' } })

    // Click the create button
    fireEvent.click(screen.getByText('+ Create \u201cTofu\u201d'))

    await waitFor(() => {
      expect(mockCreateIngredientMutateAsync).toHaveBeenCalledWith({
        household_id: 'h1',
        name: 'Tofu',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Tofu')).toBeDefined()
    })
  })

  it('shows ingredient suggestions section', () => {
    render(
      createElement(MealPlanForm, {
        householdId: 'h1',
        date: '2024-06-15',
        onClose: vi.fn(),
      }),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Ingredients')).toBeDefined()
  })
})
