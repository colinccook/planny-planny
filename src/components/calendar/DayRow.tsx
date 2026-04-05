import { useState } from 'react'
import type { Database } from '../../types/database'
import type { MealPlanWithIngredients } from '../../hooks/useMealPlans'
import { useDeleteMealPlan } from '../../hooks/useMealPlans'
import MealCard from './MealCard'
import MealPlanForm from './MealPlanForm'
import DayContextBadge from './DayContextBadge'
import DayContextForm from './DayContextForm'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']
type DayPlaceholder = Database['public']['Tables']['day_placeholders']['Row']

interface DayRowProps {
  date: string
  household: Household
  contexts: DayContext[]
  placeholder: DayPlaceholder | null
  meals: MealPlanWithIngredients[]
  currentRole: 'owner' | 'member' | 'guest' | null
}

function formatDateLabel(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Parse as local date (dateStr is YYYY-MM-DD)
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export default function DayRow({
  date,
  household,
  contexts,
  placeholder,
  meals,
  currentRole,
}: DayRowProps) {
  const [showMealForm, setShowMealForm] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [showContextForm, setShowContextForm] = useState(false)
  const [editingContext, setEditingContext] = useState<DayContext | undefined>(undefined)

  const deleteMeal = useDeleteMealPlan()
  const canEdit = currentRole === 'owner' || currentRole === 'member'

  const handleEditContext = () => {
    // If there's an existing context, edit the first one; otherwise create new
    setEditingContext(contexts[0])
    setShowContextForm(true)
  }

  const handleDeleteMeal = (mealId: string) => {
    deleteMeal.mutate({ id: mealId, householdId: household.id })
  }

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
      {/* Day header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 pb-2">
        <h3 className="text-base font-bold text-gray-900">
          {formatDateLabel(date)}
        </h3>

        <DayContextBadge
          defaultAdults={household.default_adults}
          defaultChildren={household.default_children}
          defaultBabies={household.default_babies}
          contexts={contexts}
          onEdit={handleEditContext}
        />

        {placeholder && (
          <span className="text-sm italic text-emerald-500">
            {placeholder.label}
          </span>
        )}
      </div>

      {/* Context form */}
      {showContextForm && (
        <div className="px-4 pb-2">
          <DayContextForm
            householdId={household.id}
            date={date}
            existing={editingContext}
            onClose={() => {
              setShowContextForm(false)
              setEditingContext(undefined)
            }}
          />
        </div>
      )}

      {/* Meals list */}
      <div className="space-y-2 px-4 pb-3">
        {meals.map((meal) =>
          editingMealId === meal.id ? (
            <MealPlanForm
              key={meal.id}
              householdId={household.id}
              date={date}
              existingMeal={meal}
              onClose={() => setEditingMealId(null)}
            />
          ) : (
            <MealCard
              key={meal.id}
              meal={meal}
              canEdit={canEdit}
              onEdit={() => setEditingMealId(meal.id)}
              onDelete={() => handleDeleteMeal(meal.id)}
            />
          )
        )}

        {/* Inline add-meal form */}
        {showMealForm && (
          <MealPlanForm
            householdId={household.id}
            date={date}
            onClose={() => setShowMealForm(false)}
          />
        )}

        {/* Add meal button */}
        {canEdit && !showMealForm && (
          <button
            type="button"
            onClick={() => setShowMealForm(true)}
            className="w-full rounded-lg border-2 border-dashed border-emerald-200 py-2 text-sm font-medium text-emerald-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
          >
            + Add meal
          </button>
        )}
      </div>
    </div>
  )
}
