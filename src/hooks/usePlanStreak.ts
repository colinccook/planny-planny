import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toDateString, addDays } from '../lib/dates'

/** Number of consecutive days (starting from today) that have at least one meal planned. */
export function computeStreak(
  today: Date,
  plannedDates: Set<string>,
): number {
  let streak = 0
  let current = new Date(today)

  while (plannedDates.has(toDateString(current))) {
    streak++
    current = addDays(current, 1)
  }

  return streak
}

const LOOKAHEAD_DAYS = 90

export function usePlanStreak(householdId: string | undefined) {
  const today = new Date(new Date().setHours(0, 0, 0, 0))

  const startDate = toDateString(today)
  const endDate = toDateString(addDays(today, LOOKAHEAD_DAYS))

  return useQuery({
    queryKey: ['plan-streak', householdId, startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('date')
        .eq('household_id', householdId!)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      const plannedDates = new Set((data ?? []).map((row) => row.date))
      return computeStreak(today, plannedDates)
    },
    enabled: !!householdId,
  })
}
