import { useState } from 'react'
import type { MealPlanWithIngredients } from '../../hooks/useMealPlans'
import IngredientTag from '../ingredients/IngredientTag'
import ReactionButton, {
  type Reactor,
  type ReactionOption,
} from '../ui/ReactionButton'

const THUMB_OPTIONS: ReactionOption[] = [{ emoji: '👍', label: 'Thumbs up' }]

interface MealCardProps {
  meal: MealPlanWithIngredients
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onCopy?: () => void
  reactors?: Reactor[]
  currentUserEmoji?: string | null
  onReact?: (emoji: string) => void | Promise<void>
  onUnreact?: () => void | Promise<void>
  canReact?: boolean
}

export default function MealCard({
  meal,
  canEdit,
  onEdit,
  onDelete,
  onCopy,
  reactors,
  currentUserEmoji,
  onReact,
  onUnreact,
  canReact,
}: MealCardProps) {
  const [confirming, setConfirming] = useState(false)

  const handleDelete = () => {
    if (confirming) {
      onDelete()
      setConfirming(false)
    } else {
      setConfirming(true)
    }
  }

  return (
    <div
      className="group rounded-lg bg-emerald-50/60 px-3 py-2.5 transition-shadow"
      data-testid="meal-card"
      data-meal-card="true"
      data-meal-id={meal.id}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 text-left"
          onClick={canEdit ? onEdit : undefined}
        >
          <p className="font-semibold text-gray-900">{meal.title}</p>
          {meal.description && (
            <p className="mt-0.5 text-sm text-gray-500">{meal.description}</p>
          )}
        </button>

        {canEdit && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1.5 text-gray-400 hover:bg-emerald-100 hover:text-emerald-700"
              aria-label={`Edit ${meal.title}`}
              data-testid="edit-meal-button"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            {onCopy && (
              <button
                type="button"
                onClick={onCopy}
                className="rounded p-1.5 text-gray-400 hover:bg-blue-100 hover:text-blue-700"
                aria-label={`Copy ${meal.title}`}
                data-testid="copy-meal-button"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className={`rounded p-1.5 transition-colors ${
                confirming
                  ? 'bg-red-100 text-red-600'
                  : 'text-gray-400 hover:bg-red-100 hover:text-red-600'
              }`}
              aria-label={confirming ? `Confirm delete ${meal.title}` : `Delete ${meal.title}`}
              data-testid="delete-meal-button"
            >
              {confirming ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
            {confirming && (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cancel delete"
                data-testid="cancel-delete-button"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {confirming && (
        <p className="mt-1 text-xs text-red-500" data-testid="delete-confirm-text">
          Tap ✓ again to delete this meal
        </p>
      )}

      {meal.meal_plan_ingredients.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {meal.meal_plan_ingredients.map((ing) => (
            <IngredientTag
              key={ing.ingredient_id}
              name={ing.ingredients?.name ?? ing.ingredient_id}
              starred={ing.ingredients?.starred}
              warning={ing.ingredients?.warning}
            />
          ))}
        </div>
      )}

      {canReact && onReact && onUnreact && (
        <div className="mt-2">
          <ReactionButton
            options={THUMB_OPTIONS}
            reactors={reactors ?? []}
            currentUserEmoji={currentUserEmoji ?? null}
            onReact={onReact}
            onUnreact={onUnreact}
            size="sm"
            targetLabel={meal.title}
            testId={`meal-reaction-${meal.id}`}
          />
        </div>
      )}
    </div>
  )
}
