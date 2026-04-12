import { useState, useEffect, useRef, useCallback } from 'react'
import type { Database } from '../../types/database'
import {
  useMealPlans,
  useDayContexts,
  useDayPlaceholders,
} from '../../hooks/useMealPlans'
import { generateDateRange, generateBackwardDateRange } from '../../lib/dates'
import { useCalendarDirection } from '../../hooks/useCalendarDirection'
import DayRow from './DayRow'

type Household = Database['public']['Tables']['households']['Row']

interface CalendarViewProps {
  household: Household
  currentRole: 'owner' | 'member' | 'guest' | null
}

const INITIAL_DAYS = 14
const LOAD_MORE_DAYS = 14

export default function CalendarView({ household, currentRole }: CalendarViewProps) {
  const { direction, toggleDirection, infoDismissed, dismissInfo } = useCalendarDirection()

  return (
    <CalendarViewInner
      key={direction}
      direction={direction}
      toggleDirection={toggleDirection}
      infoDismissed={infoDismissed}
      dismissInfo={dismissInfo}
      household={household}
      currentRole={currentRole}
    />
  )
}

interface CalendarViewInnerProps {
  direction: 'forward' | 'backward'
  toggleDirection: () => void
  infoDismissed: boolean
  dismissInfo: () => void
  household: Household
  currentRole: 'owner' | 'member' | 'guest' | null
}

function CalendarViewInner({
  direction,
  toggleDirection,
  infoDismissed,
  dismissInfo,
  household,
  currentRole,
}: CalendarViewInnerProps) {
  const [today] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [dayCount, setDayCount] = useState(INITIAL_DAYS)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const dates =
    direction === 'forward'
      ? generateDateRange(today, dayCount)
      : generateBackwardDateRange(today, dayCount)

  // For data fetching, we need sorted start/end dates
  const sortedDates = [...dates].sort()
  const startDate = sortedDates[0]
  const endDate = sortedDates[sortedDates.length - 1]

  const { data: meals = [], isLoading: mealsLoading } = useMealPlans(
    household.id,
    startDate,
    endDate
  )
  const { data: contexts = [], isLoading: contextsLoading } = useDayContexts(
    household.id,
    startDate,
    endDate
  )
  const { data: placeholders = [] } = useDayPlaceholders(household.id)

  // Group meals by date
  const mealsByDate = new Map<string, typeof meals>()
  for (const meal of meals) {
    const existing = mealsByDate.get(meal.date) ?? []
    existing.push(meal)
    mealsByDate.set(meal.date, existing)
  }

  // Group contexts by date
  const contextsByDate = new Map<string, typeof contexts>()
  for (const ctx of contexts) {
    const existing = contextsByDate.get(ctx.date) ?? []
    existing.push(ctx)
    contextsByDate.set(ctx.date, existing)
  }

  // Map placeholders by day of week (0=Sunday, 6=Saturday)
  const placeholdersByDow = new Map<number, (typeof placeholders)[0]>()
  for (const ph of placeholders) {
    placeholdersByDow.set(ph.day_of_week, ph)
  }

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    setDayCount((prev) => prev + LOAD_MORE_DAYS)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const isLoading = mealsLoading || contextsLoading

  return (
    <div className="space-y-3 p-4">
      {direction === 'backward' && !infoDismissed && (
        <div
          className="flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100"
          data-testid="direction-info-card"
        >
          <span className="mt-0.5 text-lg">⏪</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Viewing past days
            </p>
            <p className="mt-0.5 text-sm text-blue-700">
              Tap the Calendar tab again to switch back to upcoming days.
            </p>
          </div>
          <button
            onClick={dismissInfo}
            className="shrink-0 rounded-lg p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
            aria-label="Dismiss info"
            data-testid="dismiss-direction-info"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {direction === 'forward' && (
        <div
          className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 ring-1 ring-emerald-100"
          data-testid="direction-forward-indicator"
        >
          <span className="text-lg">📅</span>
          <p className="text-sm font-medium text-emerald-800">Upcoming days</p>
          <button
            onClick={toggleDirection}
            className="ml-auto text-xs font-medium text-emerald-600 hover:text-emerald-800"
            data-testid="switch-to-past"
          >
            View past ⏪
          </button>
        </div>
      )}

      {dates.map((dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        const dow = dateObj.getDay()

        return (
          <DayRow
            key={dateStr}
            date={dateStr}
            household={household}
            contexts={contextsByDate.get(dateStr) ?? []}
            placeholder={placeholdersByDow.get(dow) ?? null}
            meals={mealsByDate.get(dateStr) ?? []}
            currentRole={currentRole}
          />
        )
      })}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isLoading && (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
        )}
      </div>
    </div>
  )
}
