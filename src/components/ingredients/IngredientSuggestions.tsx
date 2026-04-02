import { useMemo } from 'react'
import { useIngredients, useIngredientUsageStats } from '../../hooks/useIngredients'
import IngredientTag from './IngredientTag'
import type { Database } from '../../types/database'

type Ingredient = Database['public']['Tables']['ingredients']['Row']

interface IngredientSuggestionsProps {
  householdId: string
  onAddIngredient: (ingredient: Ingredient) => void
  /** Ingredient IDs already selected, to exclude from suggestions */
  excludeIds?: string[]
}

export default function IngredientSuggestions({
  householdId,
  onAddIngredient,
  excludeIds = [],
}: IngredientSuggestionsProps) {
  const { data: ingredients = [] } = useIngredients(householdId)
  const { data: usageStats = [] } = useIngredientUsageStats(householdId)

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])

  const statsMap = useMemo(() => {
    const map = new Map<string, { usage_count: number; last_planned_date: string | null }>()
    for (const stat of usageStats) {
      map.set(stat.ingredient_id, stat)
    }
    return map
  }, [usageStats])

  // Starred ingredients sorted by least recently planned (top 10)
  const starredSuggestions = useMemo(() => {
    return ingredients
      .filter((i) => i.starred && !excludeSet.has(i.id))
      .sort((a, b) => {
        const aDate = statsMap.get(a.id)?.last_planned_date ?? ''
        const bDate = statsMap.get(b.id)?.last_planned_date ?? ''
        return aDate.localeCompare(bDate)
      })
      .slice(0, 10)
  }, [ingredients, statsMap, excludeSet])

  // Warning ingredients used in last 7 days
  const warningRecent = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().split('T')[0]

    return ingredients
      .filter((i) => {
        if (!i.warning || excludeSet.has(i.id)) return false
        const stat = statsMap.get(i.id)
        return stat?.last_planned_date && stat.last_planned_date >= cutoff
      })
      .map((i) => ({
        ...i,
        recentCount: statsMap.get(i.id)?.usage_count ?? 0,
      }))
      .sort((a, b) => b.recentCount - a.recentCount)
  }, [ingredients, statsMap, excludeSet])

  if (starredSuggestions.length === 0 && warningRecent.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {starredSuggestions.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-gray-600">
            ⭐ Starred ingredients you haven&apos;t planned lately
          </h4>
          <div className="flex flex-wrap gap-2">
            {starredSuggestions.map((ingredient) => (
              <IngredientTag
                key={ingredient.id}
                name={ingredient.name}
                starred
                variant="addable"
                onAdd={() => onAddIngredient(ingredient)}
              />
            ))}
          </div>
        </div>
      )}

      {warningRecent.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-gray-600">
            ⚠️ Used in last 7 days
          </h4>
          <div className="flex flex-wrap gap-2">
            {warningRecent.map((ingredient) => (
              <IngredientTag
                key={ingredient.id}
                name={`${ingredient.name} (${ingredient.recentCount}×)`}
                warning
                variant="addable"
                onAdd={() => onAddIngredient(ingredient)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
