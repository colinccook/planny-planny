import { useMemo } from 'react'
import { useMealPlans, type MealPlanWithIngredients } from './useMealPlans'
import { toDateString } from '../lib/dates'

export interface CupboardMeal {
  name: string
  date: string
}

export interface CupboardIngredient {
  id: string
  name: string
  starred: boolean
  warning: boolean
  mealCount: number
  meals: CupboardMeal[]
}

export function useCupboardIngredients(householdId: string | undefined) {
  const today = toDateString(new Date())
  // Far-future end date to capture all planned meals
  const endDate = '2099-12-31'

  const { data: mealPlans = [], isLoading } = useMealPlans(householdId, today, endDate)

  const ingredients = useMemo(() => {
    const map = new Map<
      string,
      { ingredient: CupboardIngredient }
    >()

    for (const plan of mealPlans as MealPlanWithIngredients[]) {
      for (const mpi of plan.meal_plan_ingredients) {
        const ing = mpi.ingredients
        if (!ing) continue

        const existing = map.get(ing.id)
        const meal: CupboardMeal = { name: plan.title, date: plan.date }

        if (existing) {
          existing.ingredient.mealCount += 1
          existing.ingredient.meals.push(meal)
        } else {
          map.set(ing.id, {
            ingredient: {
              id: ing.id,
              name: ing.name,
              starred: ing.starred,
              warning: ing.warning,
              mealCount: 1,
              meals: [meal],
            },
          })
        }
      }
    }

    const result = Array.from(map.values()).map((v) => v.ingredient)
    result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [mealPlans])

  return { ingredients, isLoading }
}
