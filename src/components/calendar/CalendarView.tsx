import { useState, useEffect, useRef, useCallback } from 'react'
import type { Database } from '../../types/database'
import {
  useMealPlans,
  useDayContexts,
  useDayPlaceholders,
} from '../../hooks/useMealPlans'
import { generateDateRange, generateBackwardDateRange } from '../../lib/dates'
import { useCalendarDirection } from '../../hooks/useCalendarDirection'
import {
  useCalendarScrollMemory,
  clearCalendarScrollMemory,
} from '../../hooks/useCalendarScrollMemory'
import type { Audience } from '../../lib/permissions'
import DayRow from './DayRow'

type Household = Database['public']['Tables']['households']['Row']

interface CalendarViewProps {
  household: Household
  currentRole: Audience
}

const INITIAL_DAYS = 14
const LOAD_MORE_DAYS = 14
// Show the "Return to today" button after the user has scrolled this many
// pixels — far enough that "today" is well off-screen.
const RETURN_TO_TODAY_THRESHOLD_PX = 800

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
  currentRole: Audience
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
  const [showReturnToToday, setShowReturnToToday] = useState(false)

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

  const isLoading = mealsLoading || contextsLoading

  // Scroll memory only applies in forward mode — backward mode is a
  // transient "let me peek at last week" view; restoring its scroll on
  // return would feel surprising. We also wait for data to load before
  // restoring so the rendered rows have settled heights — otherwise we
  // could scroll past the bottom of an empty skeleton. Returning from a
  // day view typically hits the TanStack Query cache, so `isLoading` is
  // false on the very first render and restore is effectively instant.
  useCalendarScrollMemory({
    dayCount,
    setDayCount,
    ready: direction === 'forward' && !isLoading,
  })

  // Watch scroll position to toggle the "Return to today" button. The
  // button is only meaningful when scrolling through upcoming days; in
  // backward mode "today" is already at the top.
  useEffect(() => {
    if (direction !== 'forward') return
    const onScroll = () => {
      setShowReturnToToday(window.scrollY > RETURN_TO_TODAY_THRESHOLD_PX)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [direction])

  const handleReturnToToday = useCallback(() => {
    clearCalendarScrollMemory()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

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
          <div className="flex items-center gap-1.5" aria-label="Loading more days">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {showReturnToToday && (
        <button
          type="button"
          onClick={handleReturnToToday}
          className="safe-area-bottom fixed inset-x-0 bottom-16 z-20 mx-auto flex w-fit items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-emerald-700/20 transition-colors hover:bg-emerald-700 active:bg-emerald-800"
          aria-label="Return to today"
          data-testid="return-to-today-button"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          Return to today
        </button>
      )}
    </div>
  )
}
