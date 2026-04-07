import { useNavigate } from 'react-router-dom'
import type { Database } from '../../types/database'
import type { MealPlanWithIngredients } from '../../hooks/useMealPlans'
import IngredientTag from '../ingredients/IngredientTag'

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
}: DayRowProps) {
  const navigate = useNavigate()

  const extraAdults = contexts.reduce((sum, c) => sum + c.extra_adults, 0)
  const extraChildren = contexts.reduce((sum, c) => sum + c.extra_children, 0)
  const extraBabies = contexts.reduce((sum, c) => sum + c.extra_babies, 0)
  const totalAdults = Math.max(0, household.default_adults + extraAdults)
  const totalChildren = Math.max(0, household.default_children + extraChildren)
  const totalBabies = Math.max(0, household.default_babies + extraBabies)
  const events = contexts.filter((c) => c.event_name).map((c) => c.event_name!)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/calendar/${date}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/calendar/${date}`)
      }}
      className="cursor-pointer rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50 active:bg-gray-100"
      data-testid={`day-row-${date}`}
    >
      {/* Day header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 pb-2">
        <h3 className="text-base font-bold text-gray-900">
          {formatDateLabel(date)}
        </h3>

        <span className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 text-gray-600">
            {totalAdults > 0 && (
              <span>
                {totalAdults}
                <span role="img" aria-label="adults">🧑</span>
              </span>
            )}
            {totalChildren > 0 && (
              <span>
                {totalChildren}
                <span role="img" aria-label="children">🧒</span>
              </span>
            )}
            {totalBabies > 0 && (
              <span>
                {totalBabies}
                <span role="img" aria-label="babies">👶</span>
              </span>
            )}
          </span>
          {events.map((event, i) => (
            <span
              key={i}
              className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            >
              {event}
            </span>
          ))}
        </span>

        {placeholder && (
          <span className="text-sm italic text-emerald-500">
            {placeholder.label}
          </span>
        )}

        {/* Chevron */}
        <svg
          className="ml-auto h-4 w-4 shrink-0 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Meals list (read-only summary) */}
      <div className="space-y-1 px-4 pb-3">
        {meals.map((meal) => (
          <div key={meal.id} className="rounded-lg bg-emerald-50/60 px-3 py-2">
            <p className="text-sm font-semibold text-gray-900">{meal.title}</p>
            {meal.meal_plan_ingredients.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
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
          </div>
        ))}
        {meals.length === 0 && (
          <p className="py-1 text-sm text-gray-400">No meals planned</p>
        )}
      </div>
    </div>
  )
}
