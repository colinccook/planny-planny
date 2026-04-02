import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'

import MealCard from './MealCard'

describe('MealCard', () => {
  const baseMeal = {
    id: 'meal-1',
    household_id: 'h1',
    date: '2024-06-15',
    title: 'Grilled Salmon',
    description: 'with roasted veggies',
    created_by: 'u1',
    created_at: '2024-06-15T08:00:00Z',
    updated_at: '2024-06-15T08:00:00Z',
    meal_plan_ingredients: [],
  }

  it('renders meal title and description', () => {
    render(
      createElement(MealCard, {
        meal: baseMeal,
        canEdit: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    )

    expect(screen.getByText('Grilled Salmon')).toBeDefined()
    expect(screen.getByText('with roasted veggies')).toBeDefined()
  })

  it('renders without description when null', () => {
    render(
      createElement(MealCard, {
        meal: { ...baseMeal, description: null },
        canEdit: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    )

    expect(screen.getByText('Grilled Salmon')).toBeDefined()
    expect(screen.queryByText('with roasted veggies')).toBeNull()
  })

  it('shows edit/delete buttons when canEdit is true', () => {
    render(
      createElement(MealCard, {
        meal: baseMeal,
        canEdit: true,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    )

    expect(screen.getByLabelText('Edit Grilled Salmon')).toBeDefined()
    expect(screen.getByLabelText('Delete Grilled Salmon')).toBeDefined()
  })

  it('hides edit/delete buttons when canEdit is false', () => {
    render(
      createElement(MealCard, {
        meal: baseMeal,
        canEdit: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    )

    expect(screen.queryByLabelText('Edit Grilled Salmon')).toBeNull()
    expect(screen.queryByLabelText('Delete Grilled Salmon')).toBeNull()
  })

  it('renders ingredient tags with names using IngredientTag component', () => {
    const mealWithIngredients = {
      ...baseMeal,
      meal_plan_ingredients: [
        {
          meal_plan_id: 'meal-1',
          ingredient_id: 'ing-1',
          ingredients: { id: 'ing-1', household_id: 'h1', name: 'Salmon', starred: true, warning: false, created_at: '' },
        },
        {
          meal_plan_id: 'meal-1',
          ingredient_id: 'ing-2',
          ingredients: { id: 'ing-2', household_id: 'h1', name: 'Broccoli', starred: false, warning: false, created_at: '' },
        },
      ],
    }

    render(
      createElement(MealCard, {
        meal: mealWithIngredients,
        canEdit: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    )

    expect(screen.getByText('Salmon')).toBeDefined()
    expect(screen.getByText('Broccoli')).toBeDefined()
  })

  it('shows star icon for starred ingredients', () => {
    const mealWithStarred = {
      ...baseMeal,
      meal_plan_ingredients: [
        {
          meal_plan_id: 'meal-1',
          ingredient_id: 'ing-1',
          ingredients: { id: 'ing-1', household_id: 'h1', name: 'Salmon', starred: true, warning: false, created_at: '' },
        },
      ],
    }

    render(
      createElement(MealCard, {
        meal: mealWithStarred,
        canEdit: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    )

    expect(screen.getByLabelText('starred')).toBeDefined()
  })

  it('shows warning icon for warning ingredients', () => {
    const mealWithWarning = {
      ...baseMeal,
      meal_plan_ingredients: [
        {
          meal_plan_id: 'meal-1',
          ingredient_id: 'ing-3',
          ingredients: { id: 'ing-3', household_id: 'h1', name: 'Peanuts', starred: false, warning: true, created_at: '' },
        },
      ],
    }

    render(
      createElement(MealCard, {
        meal: mealWithWarning,
        canEdit: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      })
    )

    expect(screen.getByLabelText('warning')).toBeDefined()
  })
})
