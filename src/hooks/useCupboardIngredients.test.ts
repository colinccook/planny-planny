import { describe, it, expect } from 'vitest'

// Test the deduplication and meal counting logic
// extracted from useCupboardIngredients

interface CupboardMeal {
  name: string
  date: string
}

interface CupboardIngredient {
  id: string
  name: string
  starred: boolean
  warning: boolean
  mealCount: number
  meals: CupboardMeal[]
}

interface MealPlanIngredient {
  ingredient_id: string
  ingredients: {
    id: string
    name: string
    starred: boolean
    warning: boolean
  }
}

interface MealPlan {
  title: string
  date: string
  meal_plan_ingredients: MealPlanIngredient[]
}

function deduplicateIngredients(mealPlans: MealPlan[]): CupboardIngredient[] {
  const map = new Map<string, CupboardIngredient>()

  for (const plan of mealPlans) {
    for (const mpi of plan.meal_plan_ingredients) {
      const ing = mpi.ingredients
      if (!ing) continue

      const meal: CupboardMeal = { name: plan.title, date: plan.date }
      const existing = map.get(ing.id)

      if (existing) {
        existing.mealCount += 1
        existing.meals.push(meal)
      } else {
        map.set(ing.id, {
          id: ing.id,
          name: ing.name,
          starred: ing.starred,
          warning: ing.warning,
          mealCount: 1,
          meals: [meal],
        })
      }
    }
  }

  const result = Array.from(map.values())
  result.sort((a, b) => a.name.localeCompare(b.name))
  return result
}

describe('Cupboard ingredients deduplication', () => {
  it('returns empty array for no meal plans', () => {
    expect(deduplicateIngredients([])).toEqual([])
  })

  it('returns unique ingredients from a single meal plan', () => {
    const plans: MealPlan[] = [
      {
        title: 'Stir Fry',
        date: '2026-04-15',
        meal_plan_ingredients: [
          { ingredient_id: 'i1', ingredients: { id: 'i1', name: 'Chicken', starred: false, warning: false } },
          { ingredient_id: 'i2', ingredients: { id: 'i2', name: 'Rice', starred: false, warning: false } },
        ],
      },
    ]

    const result = deduplicateIngredients(plans)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Chicken')
    expect(result[0].mealCount).toBe(1)
    expect(result[1].name).toBe('Rice')
    expect(result[1].mealCount).toBe(1)
  })

  it('deduplicates ingredients across multiple meals', () => {
    const plans: MealPlan[] = [
      {
        title: 'Stir Fry',
        date: '2026-04-15',
        meal_plan_ingredients: [
          { ingredient_id: 'i1', ingredients: { id: 'i1', name: 'Chicken', starred: false, warning: false } },
          { ingredient_id: 'i2', ingredients: { id: 'i2', name: 'Rice', starred: false, warning: false } },
        ],
      },
      {
        title: 'Curry',
        date: '2026-04-16',
        meal_plan_ingredients: [
          { ingredient_id: 'i1', ingredients: { id: 'i1', name: 'Chicken', starred: false, warning: false } },
          { ingredient_id: 'i3', ingredients: { id: 'i3', name: 'Onion', starred: true, warning: false } },
        ],
      },
    ]

    const result = deduplicateIngredients(plans)
    expect(result).toHaveLength(3)

    const chicken = result.find((r) => r.name === 'Chicken')!
    expect(chicken.mealCount).toBe(2)
    expect(chicken.meals).toEqual([
      { name: 'Stir Fry', date: '2026-04-15' },
      { name: 'Curry', date: '2026-04-16' },
    ])
  })

  it('sorts ingredients alphabetically', () => {
    const plans: MealPlan[] = [
      {
        title: 'Salad',
        date: '2026-04-15',
        meal_plan_ingredients: [
          { ingredient_id: 'i3', ingredients: { id: 'i3', name: 'Zucchini', starred: false, warning: false } },
          { ingredient_id: 'i1', ingredients: { id: 'i1', name: 'Avocado', starred: false, warning: false } },
          { ingredient_id: 'i2', ingredients: { id: 'i2', name: 'Mango', starred: false, warning: false } },
        ],
      },
    ]

    const result = deduplicateIngredients(plans)
    expect(result.map((r) => r.name)).toEqual(['Avocado', 'Mango', 'Zucchini'])
  })

  it('preserves starred and warning flags', () => {
    const plans: MealPlan[] = [
      {
        title: 'Meal',
        date: '2026-04-15',
        meal_plan_ingredients: [
          { ingredient_id: 'i1', ingredients: { id: 'i1', name: 'Peanuts', starred: false, warning: true } },
          { ingredient_id: 'i2', ingredients: { id: 'i2', name: 'Butter', starred: true, warning: false } },
        ],
      },
    ]

    const result = deduplicateIngredients(plans)
    expect(result.find((r) => r.name === 'Peanuts')?.warning).toBe(true)
    expect(result.find((r) => r.name === 'Butter')?.starred).toBe(true)
  })
})
