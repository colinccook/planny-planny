import { useState } from 'react'
import {
  useIngredients,
  useIngredientUsageStats,
  useUpdateIngredient,
  useDeleteIngredient,
} from '../../hooks/useIngredients'
import type { IngredientUsageStat } from '../../hooks/useIngredients'
import type { Database } from '../../types/database'
import { SkeletonBlock } from '../ui/Skeleton'

type Ingredient = Database['public']['Tables']['ingredients']['Row']

export type SortOption = 'alphabetical' | 'most-used' | 'least-recent' | 'starred-first'

interface IngredientsListProps {
  householdId: string
  sortBy: SortOption
}

function formatLastPlanned(dateStr: string | null): string {
  if (!dateStr) return 'Never planned'
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Last: today'
  if (diffDays === 1) return 'Last: yesterday'
  if (diffDays < 30) return `Last: ${diffDays} days ago`
  if (diffDays < 365) return `Last: ${Math.floor(diffDays / 30)} months ago`
  return `Last: ${Math.floor(diffDays / 365)}y ago`
}

function sortIngredients(
  ingredients: Ingredient[],
  statsMap: Map<string, IngredientUsageStat>,
  sortBy: SortOption
): Ingredient[] {
  const sorted = [...ingredients]

  switch (sortBy) {
    case 'alphabetical':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'most-used':
      sorted.sort((a, b) => {
        const aCount = statsMap.get(a.id)?.usage_count ?? 0
        const bCount = statsMap.get(b.id)?.usage_count ?? 0
        return bCount - aCount
      })
      break
    case 'least-recent':
      sorted.sort((a, b) => {
        const aDate = statsMap.get(a.id)?.last_planned_date ?? ''
        const bDate = statsMap.get(b.id)?.last_planned_date ?? ''
        return aDate.localeCompare(bDate)
      })
      break
    case 'starred-first':
      sorted.sort((a, b) => {
        if (a.starred !== b.starred) return a.starred ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      break
  }

  return sorted
}

export default function IngredientsList({ householdId, sortBy }: IngredientsListProps) {
  const { data: ingredients = [], isLoading } = useIngredients(householdId)
  const { data: usageStats = [] } = useIngredientUsageStats(householdId)
  const updateIngredient = useUpdateIngredient()
  const deleteIngredient = useDeleteIngredient()

  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const statsMap = new Map<string, IngredientUsageStat>()
  for (const stat of usageStats) {
    statsMap.set(stat.ingredient_id, stat)
  }

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )
  const sorted = sortIngredients(filtered, statsMap, sortBy)

  const handleToggleStar = (ingredient: Ingredient) => {
    updateIngredient.mutate({
      id: ingredient.id,
      householdId,
      updates: { starred: !ingredient.starred },
    })
  }

  const handleToggleWarning = (ingredient: Ingredient) => {
    updateIngredient.mutate({
      id: ingredient.id,
      householdId,
      updates: { warning: !ingredient.warning },
    })
  }

  const handleDelete = (ingredient: Ingredient) => {
    setDeletingId(ingredient.id)
  }

  const confirmDelete = (ingredient: Ingredient) => {
    deleteIngredient.mutate(
      { id: ingredient.id, householdId },
      { onSettled: () => setDeletingId(null) }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="ingredients-list-skeleton">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients…"
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          {search ? 'No ingredients match your search.' : 'No ingredients yet. Add one above!'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg bg-white shadow">
          {sorted.map((ingredient) => {
            const stat = statsMap.get(ingredient.id)
            const isDeleting = deletingId === ingredient.id

            return (
              <li key={ingredient.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {ingredient.name}
                    </span>
                    {ingredient.warning && (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">
                        ⚠️
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                    <span>Used {stat?.usage_count ?? 0} times</span>
                    <span>{formatLastPlanned(stat?.last_planned_date ?? null)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isDeleting ? (
                    <>
                      <button
                        type="button"
                        onClick={() => confirmDelete(ingredient)}
                        disabled={deleteIngredient.isPending}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleStar(ingredient)}
                        className="rounded p-1.5 hover:bg-gray-100"
                        aria-label={ingredient.starred ? `Unstar ${ingredient.name}` : `Star ${ingredient.name}`}
                      >
                        <span className={ingredient.starred ? '' : 'opacity-30 grayscale'}>⭐</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleWarning(ingredient)}
                        className="rounded p-1.5 hover:bg-gray-100"
                        aria-label={ingredient.warning ? `Remove warning from ${ingredient.name}` : `Add warning to ${ingredient.name}`}
                      >
                        <span className={ingredient.warning ? '' : 'opacity-30 grayscale'}>⚠️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ingredient)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${ingredient.name}`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
