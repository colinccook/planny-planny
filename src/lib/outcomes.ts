import { getAdjacentDate, toDateString } from './dates'
import type { MealOutcome } from '../hooks/useMealOutcomes'

/**
 * Given today's date string, the meals planned for yesterday, and the
 * outcome map for the calendar window, decide whether the calendar
 * should prepend a "Yesterday — how did these go?" ghost row.
 *
 * Show the ghost when:
 *   • there is at least one meal planned for yesterday, AND
 *   • at least one of those meals has no outcome recorded yet.
 *
 * Hide the ghost when:
 *   • yesterday had no meals planned (nothing to ask about), OR
 *   • every yesterday meal already has an outcome (we have our answer).
 *
 * Pure function so it's covered by a Vitest unit test independently of
 * the React tree — see calendar/CalendarView.tsx for the call site.
 */
export function shouldShowYesterdayGhost(
  today: string,
  mealsByDate: ReadonlyMap<string, readonly { id: string }[]>,
  outcomesByMealId: ReadonlyMap<string, MealOutcome>,
): boolean {
  const yesterday = getAdjacentDate(today, -1)
  const yesterdayMeals = mealsByDate.get(yesterday) ?? []
  if (yesterdayMeals.length === 0) return false
  return yesterdayMeals.some((m) => !outcomesByMealId.has(m.id))
}

/**
 * Whether the outcome button should be shown for a meal on a given
 * date. Outcome can only be recorded on past or current days — even
 * editors can't pre-record a future meal.
 *
 * Comparison is a pure string compare on YYYY-MM-DD so it is
 * unaffected by time-of-day, JS Date oddities, or DST transitions.
 */
export function canRecordOutcomeOn(today: string, mealDate: string): boolean {
  return mealDate <= today
}

/** Convenience: today's YYYY-MM-DD in local time. Re-exported so call
 *  sites don't reach for `new Date()` directly. */
export function todayString(): string {
  return toDateString(new Date())
}
