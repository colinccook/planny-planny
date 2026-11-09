// Pure aggregation helpers for the MCP meal-history and ingredient-stat
// tools. They turn per-day meal rows into compact, per-dish and
// per-ingredient summaries so an AI client can reason about a year of
// history without reading hundreds of raw rows (see DR-022).

export interface HistoryIngredient {
  id: string
  name: string
  starred: boolean
  warning: boolean
}

export interface HistoryMealRow {
  id: string
  title: string
  date: string
  outcome_status: 'as_planned' | 'did_not_happen' | null
  ingredients: HistoryIngredient[]
}

export interface DishHistory {
  title: string
  times_planned: number
  first_planned: string
  last_planned: string
  days_since_last_planned: number
  times_as_planned: number
  times_did_not_happen: number
  ingredients: string[]
}

export interface IngredientStat {
  name: string
  starred: boolean
  warning: boolean
  meal_count: number
  last_used: string | null
  example_meals: string[]
}

export const EXAMPLE_MEAL_LIMIT = 3

export interface MealPage<T extends { date: string }> {
  page: T[]
  has_more: boolean
  next_from: string | null
}

/**
 * Cut a page out of `rows`, which must hold up to `limit + 1` meals in date
 * order. Pages end on a date boundary so the next page can start at
 * `next_from` without repeating or skipping meals planned on the same day.
 * A single day with more meals than `limit` is returned whole instead.
 */
export function pageMealsByDate<T extends { date: string }>(rows: T[], limit: number): MealPage<T> {
  if (rows.length <= limit) return { page: rows, has_more: false, next_from: null }
  const boundaryDate = rows[limit].date
  const page = rows.slice(0, limit)
  const beforeBoundary = page.filter((row) => row.date < boundaryDate)
  return {
    page: beforeBoundary.length > 0 ? beforeBoundary : page,
    has_more: true,
    next_from: boundaryDate,
  }
}

export function normaliseDishTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.UTC(
    Number(fromDate.slice(0, 4)), Number(fromDate.slice(5, 7)) - 1, Number(fromDate.slice(8, 10)),
  )
  const to = Date.UTC(
    Number(toDate.slice(0, 4)), Number(toDate.slice(5, 7)) - 1, Number(toDate.slice(8, 10)),
  )
  return Math.round((to - from) / 86_400_000)
}

/**
 * Group planned meals by dish title (case- and whitespace-insensitive).
 * Dishes are sorted with the longest-unplanned first so "what haven't we
 * eaten for a while?" is answered by the top of the list.
 */
export function groupMealsByDish(rows: HistoryMealRow[], today: string): DishHistory[] {
  const dishes = new Map<string, DishHistory & { ingredientSet: Set<string> }>()

  for (const row of rows) {
    const key = normaliseDishTitle(row.title)
    if (!key) continue
    let dish = dishes.get(key)
    if (!dish) {
      dish = {
        title: row.title.trim(),
        times_planned: 0,
        first_planned: row.date,
        last_planned: row.date,
        days_since_last_planned: 0,
        times_as_planned: 0,
        times_did_not_happen: 0,
        ingredients: [],
        ingredientSet: new Set<string>(),
      }
      dishes.set(key, dish)
    }
    dish.times_planned++
    if (row.date < dish.first_planned) dish.first_planned = row.date
    if (row.date >= dish.last_planned) {
      dish.last_planned = row.date
      dish.title = row.title.trim()
    }
    if (row.outcome_status === 'as_planned') dish.times_as_planned++
    if (row.outcome_status === 'did_not_happen') dish.times_did_not_happen++
    for (const ingredient of row.ingredients) dish.ingredientSet.add(ingredient.name)
  }

  return [...dishes.values()]
    .map(({ ingredientSet, ...dish }) => ({
      ...dish,
      days_since_last_planned: daysBetween(dish.last_planned, today),
      ingredients: [...ingredientSet].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) =>
      a.last_planned.localeCompare(b.last_planned) || a.title.localeCompare(b.title))
}

/**
 * Count how often each ingredient appears across planned meals. Household
 * ingredients that never appeared in the range are included with a zero
 * count so neglected favourites can still be suggested.
 */
export function summariseIngredients(
  rows: HistoryMealRow[],
  householdIngredients: HistoryIngredient[],
): IngredientStat[] {
  const stats = new Map<string, IngredientStat>()
  const seed = (ingredient: HistoryIngredient): IngredientStat => {
    let stat = stats.get(ingredient.id)
    if (!stat) {
      stat = {
        name: ingredient.name,
        starred: ingredient.starred,
        warning: ingredient.warning,
        meal_count: 0,
        last_used: null,
        example_meals: [],
      }
      stats.set(ingredient.id, stat)
    }
    return stat
  }

  for (const ingredient of householdIngredients) seed(ingredient)

  const byDateDesc = [...rows].sort((a, b) => b.date.localeCompare(a.date))
  for (const row of byDateDesc) {
    for (const ingredient of row.ingredients) {
      const stat = seed(ingredient)
      stat.meal_count++
      if (!stat.last_used || row.date > stat.last_used) stat.last_used = row.date
      const title = row.title.trim()
      if (stat.example_meals.length < EXAMPLE_MEAL_LIMIT && !stat.example_meals.includes(title)) {
        stat.example_meals.push(title)
      }
    }
  }

  return [...stats.values()].sort((a, b) =>
    b.meal_count - a.meal_count || a.name.localeCompare(b.name))
}
