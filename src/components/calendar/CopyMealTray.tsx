import { useState, useMemo } from 'react'
import Tray from '../ui/Tray'
import type { MealPlanWithIngredients } from '../../hooks/useMealPlans'
import { useCopyMealPlan, useMealPlans } from '../../hooks/useMealPlans'
import { toDateString, addDays } from '../../lib/dates'
import { useToast } from '../../hooks/useToast'

interface CopyMealTrayProps {
  isOpen: boolean
  onClose: () => void
  meal: MealPlanWithIngredients
  sourceDate: string
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
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export default function CopyMealTray({
  isOpen,
  onClose,
  meal,
  sourceDate,
}: CopyMealTrayProps) {
  const [isMove, setIsMove] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const copyMeal = useCopyMealPlan()
  const { showToast } = useToast()

  // Generate 14 days starting from today for the date picker
  const dates = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result: string[] = []
    for (let i = 0; i < 14; i++) {
      result.push(toDateString(addDays(today, i)))
    }
    return result
  }, [])

  // Fetch meals for the date range to show previews
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]
  const { data: allMeals = [] } = useMealPlans(
    meal.household_id,
    startDate,
    endDate,
  )

  // Group meals by date
  const mealsByDate = useMemo(() => {
    const map = new Map<string, MealPlanWithIngredients[]>()
    for (const m of allMeals) {
      const existing = map.get(m.date) ?? []
      existing.push(m)
      map.set(m.date, existing)
    }
    return map
  }, [allMeals])

  const handleConfirm = async () => {
    if (!selectedDate) return
    try {
      await copyMeal.mutateAsync({
        meal,
        targetDate: selectedDate,
        move: isMove,
      })
      showToast(
        isMove
          ? `Moved "${meal.title}" to ${formatDateLabel(selectedDate)}`
          : `Copied "${meal.title}" to ${formatDateLabel(selectedDate)}`,
      )
      onClose()
      setSelectedDate(null)
      setIsMove(false)
    } catch {
      showToast('Something went wrong. Please try again.')
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedDate(null)
    setIsMove(false)
  }

  return (
    <Tray
      isOpen={isOpen}
      onClose={handleClose}
      title={`📋 Copy "${meal.title}"`}
      description="Pick a day to copy this meal to"
    >
      <div className="space-y-4 pb-2">
        {/* Move toggle */}
        <label
          className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5"
          data-testid="move-toggle"
        >
          <input
            type="checkbox"
            checked={isMove}
            onChange={(e) => setIsMove(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            data-testid="move-checkbox"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">Move</span>
            <p className="text-xs text-gray-500">
              Remove from {formatDateLabel(sourceDate)} after copying
            </p>
          </div>
        </label>

        {/* Date list */}
        <div
          className="max-h-[45vh] space-y-1.5 overflow-y-auto"
          data-testid="date-picker-list"
        >
          {dates.map((dateStr) => {
            const dayMeals = mealsByDate.get(dateStr) ?? []
            const isSource = dateStr === sourceDate
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                disabled={isSource && !isMove}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-emerald-100 ring-2 ring-emerald-500'
                    : isSource
                      ? 'bg-gray-50 opacity-60'
                      : 'bg-white ring-1 ring-gray-100 hover:bg-gray-50'
                }`}
                data-testid={`date-option-${dateStr}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatDateLabel(dateStr)}
                  </span>
                  {isSource && (
                    <span className="text-xs font-medium text-gray-400">
                      Current
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-xs font-medium text-emerald-600">
                      ✓ Selected
                    </span>
                  )}
                </div>
                {dayMeals.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayMeals.map((m) => (
                      <span
                        key={m.id}
                        className="inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-gray-600"
                      >
                        {m.title}
                      </span>
                    ))}
                  </div>
                )}
                {dayMeals.length === 0 && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    No meals planned
                  </p>
                )}
              </button>
            )
          })}
        </div>

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedDate || copyMeal.isPending}
          className="w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
          data-testid="confirm-copy-button"
        >
          {copyMeal.isPending
            ? 'Working…'
            : isMove
              ? `Move to ${selectedDate ? formatDateLabel(selectedDate) : '…'}`
              : `Copy to ${selectedDate ? formatDateLabel(selectedDate) : '…'}`}
        </button>
      </div>
    </Tray>
  )
}
