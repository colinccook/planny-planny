import { useState, useEffect, useRef, useCallback } from 'react'
import type { Database } from '../../types/database'
import {
  useMealPlans,
  useDayContexts,
  useDayPlaceholders,
} from '../../hooks/useMealPlans'
import DayRow from './DayRow'

type Household = Database['public']['Tables']['households']['Row']

interface CalendarViewProps {
  household: Household
  currentRole: 'owner' | 'member' | 'guest' | null
}

const INITIAL_DAYS = 14
const LOAD_MORE_DAYS = 14

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function generateDateRange(start: Date, count: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    dates.push(toDateString(addDays(start, i)))
  }
  return dates
}

export default function CalendarView({ household, currentRole }: CalendarViewProps) {
  const today = useRef(new Date())
  today.current.setHours(0, 0, 0, 0)

  const [dayCount, setDayCount] = useState(INITIAL_DAYS)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const dates = generateDateRange(today.current, dayCount)
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

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
