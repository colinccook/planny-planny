import { useState } from 'react'
import type { CupboardIngredient } from '../../hooks/useCupboardIngredients'
import SwipeableRow from './SwipeableRow'

interface CupboardListProps {
  ingredients: CupboardIngredient[]
  dismissedIds: string[]
  showHidden: boolean
  onDismiss: (id: string) => void
  onUndismiss: (id: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.toLocaleDateString('en-GB', { weekday: 'short' })
  const dayNum = date.getDate()
  const month = date.toLocaleDateString('en-GB', { month: 'short' })
  return `${day} ${dayNum} ${month}`
}

function CupboardItem({
  ingredient,
  isDismissed,
  onDismiss,
  onUndismiss,
}: {
  ingredient: CupboardIngredient
  isDismissed: boolean
  onDismiss: () => void
  onUndismiss: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (isDismissed) {
    return (
      <li
        className="flex items-center justify-between px-4 py-3 bg-gray-50"
        data-testid="cupboard-item-dismissed"
      >
        <span className="text-sm text-gray-400 line-through">{ingredient.name}</span>
        <button
          type="button"
          onClick={onUndismiss}
          className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
          aria-label={`Restore ${ingredient.name}`}
        >
          Undo
        </button>
      </li>
    )
  }

  return (
    <SwipeableRow onDismiss={onDismiss}>
      <li className="px-4 py-3" data-testid="cupboard-item">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={`${ingredient.name}, used in ${ingredient.mealCount} meal${ingredient.mealCount !== 1 ? 's' : ''}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{ingredient.name}</span>
            {ingredient.warning && (
              <span className="text-xs" aria-label="Warning">⚠️</span>
            )}
            {ingredient.starred && (
              <span className="text-xs" aria-label="Starred">⭐</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-xs font-medium text-emerald-700">
              {ingredient.mealCount}
            </span>
            <span
              className={`text-gray-400 transition-transform text-xs ${expanded ? 'rotate-180' : ''}`}
            >
              ▼
            </span>
          </div>
        </button>

        {expanded && (
          <div className="mt-2 ml-1 space-y-1" data-testid="cupboard-item-meals">
            {ingredient.meals.map((meal, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-gray-400">•</span>
                <span className="font-medium">{meal.name}</span>
                <span>— {formatDate(meal.date)}</span>
              </div>
            ))}
          </div>
        )}
      </li>
    </SwipeableRow>
  )
}

export default function CupboardList({
  ingredients,
  dismissedIds,
  showHidden,
  onDismiss,
  onUndismiss,
}: CupboardListProps) {
  const visible = ingredients.filter(
    (ing) => showHidden || !dismissedIds.includes(ing.id)
  )

  if (visible.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500" data-testid="cupboard-empty">
        {ingredients.length === 0
          ? 'No ingredients in your future meal plans.'
          : 'All items are in the cupboard! 🎉'}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-lg bg-white shadow" data-testid="cupboard-list">
      {visible.map((ingredient) => (
        <CupboardItem
          key={ingredient.id}
          ingredient={ingredient}
          isDismissed={dismissedIds.includes(ingredient.id)}
          onDismiss={() => onDismiss(ingredient.id)}
          onUndismiss={() => onUndismiss(ingredient.id)}
        />
      ))}
    </ul>
  )
}
