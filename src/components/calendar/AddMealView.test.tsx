import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockCreateMutateAsync = vi.fn()
const mockSetIngredientsMutateAsync = vi.fn()

vi.mock('../../hooks/useMealPlans', () => ({
  useCreateMealPlan: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateMealPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetMealIngredients: () => ({
    mutateAsync: mockSetIngredientsMutateAsync,
    isPending: false,
  }),
}))

vi.mock('../../hooks/useIngredients', () => ({
  useIngredients: () => ({
    data: [
      {
        id: 'ing-1',
        household_id: 'h1',
        name: 'Chicken',
        starred: true,
        warning: false,
        created_at: '',
      },
      {
        id: 'ing-2',
        household_id: 'h1',
        name: 'Peanuts',
        starred: false,
        warning: true,
        created_at: '',
      },
      {
        id: 'ing-3',
        household_id: 'h1',
        name: 'Saffron',
        starred: false,
        warning: false,
        created_at: '',
      },
    ],
  }),
  useIngredientUsageStats: () => ({
    data: [
      { ingredient_id: 'ing-1', usage_count: 10, last_planned_date: '2026-04-01' },
      { ingredient_id: 'ing-2', usage_count: 2, last_planned_date: '2026-04-03' },
      { ingredient_id: 'ing-3', usage_count: 1, last_planned_date: '2026-03-01' },
    ],
  }),
  useCreateIngredient: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import AddMealView from './AddMealView'

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

describe('AddMealView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Add Meal title', () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    expect(screen.getByText('Add Meal')).toBeDefined()
  })

  it('renders Edit Meal title when existingMeal is provided', () => {
    const existingMeal = {
      id: 'meal-1',
      household_id: 'h1',
      date: '2026-04-06',
      title: 'Chicken Curry',
      description: 'Mild',
      created_by: 'u1',
      created_at: '',
      updated_at: '',
      meal_plan_ingredients: [],
    }

    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        existingMeal,
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    expect(screen.getByText('Edit Meal')).toBeDefined()
  })

  it('shows tappable field cards', () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('title-field')).toBeDefined()
    expect(screen.getByTestId('notes-field')).toBeDefined()
    expect(screen.getByTestId('ingredients-field')).toBeDefined()
  })

  it('shows placeholder text in field cards when empty', () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    expect(screen.getByText("What's for dinner?")).toBeDefined()
    expect(screen.getByText('Optional notes')).toBeDefined()
    expect(screen.getByText('Tap to add ingredients')).toBeDefined()
  })

  it('opens title tray when title field is tapped', async () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    fireEvent.click(screen.getByTestId('title-field'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId('meal-title-input')).toBeDefined()
    expect(screen.getByText('Give your meal a name')).toBeDefined()
  })

  it('opens notes tray when notes field is tapped', async () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    fireEvent.click(screen.getByTestId('notes-field'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId('meal-notes-input')).toBeDefined()
    expect(screen.getByText('Add any extra details about this meal')).toBeDefined()
  })

  it('opens ingredients tray when ingredients field is tapped', async () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    fireEvent.click(screen.getByTestId('ingredients-field'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId('ingredient-search-input')).toBeDefined()
    expect(screen.getByTestId('add-ingredients-button')).toBeDefined()
  })

  it('shows least common ingredients excluding warnings in the tray', async () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    fireEvent.click(screen.getByTestId('ingredients-field'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const ideas = screen.getByTestId('ingredient-ideas')
    expect(ideas).toBeDefined()
    // Saffron (1 use) and Chicken (10 uses) should appear, but not Peanuts (warning)
    expect(screen.getByText('Saffron')).toBeDefined()
    expect(screen.getByText('Chicken')).toBeDefined()
    // Peanuts has warning=true so should be excluded from suggestions
    const ideasContainer = screen.getByTestId('ingredient-ideas')
    expect(ideasContainer.textContent).not.toContain('Peanuts')
  })

  it('dismisses ingredients tray when Add Ingredients is clicked', async () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    fireEvent.click(screen.getByTestId('ingredients-field'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    fireEvent.click(screen.getByTestId('add-ingredients-button'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })

    expect(screen.queryByTestId('ingredient-search-input')).toBeNull()
  })

  it('save button is disabled when title is empty', () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    const saveButton = screen.getByTestId('save-meal-button')
    expect(saveButton.hasAttribute('disabled')).toBe(true)
  })

  it('save button is enabled after entering a title', async () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    // Open title tray and enter text
    fireEvent.click(screen.getByTestId('title-field'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    fireEvent.change(screen.getByTestId('meal-title-input'), {
      target: { value: 'Chicken Curry' },
    })

    // Close tray
    fireEvent.click(screen.getByTestId('tray-close-button'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })

    const saveButton = screen.getByTestId('save-meal-button')
    expect(saveButton.hasAttribute('disabled')).toBe(false)
  })

  it('shows entered title on the field card after closing tray', async () => {
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack: vi.fn(),
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    fireEvent.click(screen.getByTestId('title-field'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    fireEvent.change(screen.getByTestId('meal-title-input'), {
      target: { value: 'Spaghetti Bolognese' },
    })

    fireEvent.click(screen.getByTestId('tray-close-button'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })

    expect(screen.getByText('Spaghetti Bolognese')).toBeDefined()
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn()
    render(
      createElement(AddMealView, {
        householdId: 'h1',
        date: '2026-04-06',
        onBack,
        onSaved: vi.fn(),
      }),
      { wrapper: createWrapper() },
    )

    fireEvent.click(screen.getByTestId('back-button'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
