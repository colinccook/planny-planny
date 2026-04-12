import { useState } from 'react'
import type { Database } from '../../types/database'
import {
  useMealPlans,
  useDayContexts,
  useDayPlaceholders,
  useDeleteMealPlan,
} from '../../hooks/useMealPlans'
import FullScreenView from '../ui/FullScreenView'
import MealCard from './MealCard'
import DayContextBadge from './DayContextBadge'
import DayContextForm from './DayContextForm'
import MealPromptGenerator from './MealPromptGenerator'
import Tray from '../ui/Tray'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']

interface DayDetailViewProps {
  date: string
  household: Household
  currentRole: 'owner' | 'member' | 'guest' | null
  onBack: () => void
  onAddMeal: () => void
  onEditMeal: (mealId: string) => void
}

function formatDateLabel(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export default function DayDetailView({
  date,
  household,
  currentRole,
  onBack,
  onAddMeal,
  onEditMeal,
}: DayDetailViewProps) {
  const [showContextForm, setShowContextForm] = useState(false)
  const [showPromptTray, setShowPromptTray] = useState(false)
  const [editingContext, setEditingContext] = useState<DayContext | undefined>(
    undefined,
  )

  const { data: meals = [], isLoading: mealsLoading } = useMealPlans(
    household.id,
    date,
    date,
  )
  const { data: contexts = [] } = useDayContexts(household.id, date, date)
  const { data: placeholders = [] } = useDayPlaceholders(household.id)
  const deleteMeal = useDeleteMealPlan()
  const canEdit = currentRole === 'owner' || currentRole === 'member'

  const [y, m, d] = date.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const dow = dateObj.getDay()
  const placeholder = placeholders.find((ph) => ph.day_of_week === dow)

  const handleEditContext = () => {
    setEditingContext(contexts[0])
    setShowContextForm(true)
  }

  const handleDeleteMeal = (mealId: string) => {
    deleteMeal.mutate({ id: mealId, householdId: household.id })
  }

  return (
    <FullScreenView title={formatDateLabel(date)} onBack={onBack}>
      <div className="space-y-4 p-4">
        {/* Context badge and placeholder */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
          <DayContextForm
            householdId={household.id}
            date={date}
            existing={editingContext}
            household={household}
            onClose={() => {
              setShowContextForm(false)
              setEditingContext(undefined)
            }}
          />
        )}

        {/* Loading state */}
        {mealsLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
          </div>
        )}

        {/* Empty state with magic wand */}
        {!mealsLoading && meals.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-gray-400">No meals planned yet</p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowPromptTray(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                data-testid="magic-wand-button"
              >
                <span className="text-lg">🪄</span>
                Get AI meal suggestions
              </button>
            )}
          </div>
        )}

        {/* AI prompt tray */}
        <Tray
          isOpen={showPromptTray}
          onClose={() => setShowPromptTray(false)}
          title="🪄 AI Meal Suggestions"
          description="Generate a prompt to get meal ideas from AI"
        >
          <MealPromptGenerator
            household={household}
            date={date}
            contexts={contexts}
            dayTheme={placeholder?.label ?? null}
          />
        </Tray>

        {/* Meals list */}
        <div className="space-y-2">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              canEdit={canEdit}
              onEdit={() => onEditMeal(meal.id)}
              onDelete={() => handleDeleteMeal(meal.id)}
            />
          ))}
        </div>

        {/* Add meal button */}
        {canEdit && (
          <button
            type="button"
            onClick={onAddMeal}
            className="w-full rounded-lg border-2 border-dashed border-emerald-200 py-3 text-sm font-medium text-emerald-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
            data-testid="add-meal-button"
          >
            + Add meal
          </button>
        )}
      </div>
    </FullScreenView>
  )
}
