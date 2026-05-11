import { useMemo } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import { invalidateAfter, queryKeys } from '../lib/queryKeys'
import { playSoundIfEnabled } from '../lib/sounds'
import { useAuth } from './useAuth'

export type MealOutcome = Database['public']['Tables']['meal_outcomes']['Row']
export type MealOutcomeStatus = MealOutcome['status']
export type MealOutcomeReason = NonNullable<MealOutcome['reason']>

/** All five reason codes in canonical order — used to render the
 *  vertical selector in the OutcomeTray and to keep the JS list
 *  in sync with the DB CHECK constraint. */
export const OUTCOME_REASONS: readonly MealOutcomeReason[] = [
  'no_shopping',
  'ate_out',
  'unexpected_event',
  'didnt_fancy_it',
  'other',
] as const

/** Friendly label for a reason. Co-located with the codes so a
 *  new reason added to the enum forces a TypeScript exhaustiveness
 *  check here too. */
export const OUTCOME_REASON_LABELS: Record<MealOutcomeReason, string> = {
  no_shopping: "We didn't do food shopping",
  ate_out: 'We went out for a meal instead',
  unexpected_event: 'We had an unexpected event',
  didnt_fancy_it: "We didn't fancy what we'd planned",
  other: 'Other',
}

/**
 * Fetch every outcome for meals in `[startDate, endDate]` for the
 * household. Returns a `Map<mealPlanId, MealOutcome>` for O(1) lookup
 * by the meal card (the calendar renders hundreds of cards, so a list
 * scan per card would be wasteful).
 */
export function useMealOutcomes(
  householdId: string | undefined,
  startDate: string,
  endDate: string,
) {
  const query = useQuery({
    queryKey: queryKeys.mealOutcomes(householdId, startDate, endDate),
    queryFn: async (): Promise<MealOutcome[]> => {
      if (!householdId) return []
      // Join through meal_plans so we can filter by date — the
      // outcomes table itself only knows the meal_plan_id.
      const { data, error } = await supabase
        .from('meal_outcomes')
        .select('*, meal_plans!inner(date)')
        .eq('household_id', householdId)
        .gte('meal_plans.date', startDate)
        .lte('meal_plans.date', endDate)

      if (error) throw error
      // Strip the joined meal_plans column — callers only need the
      // outcome row itself, and keeping it on the cached value would
      // mean every consumer has to know about it.
      type Joined = MealOutcome & { meal_plans?: unknown }
      return ((data ?? []) as Joined[]).map(({ meal_plans, ...rest }) => {
        void meal_plans
        return rest as MealOutcome
      })
    },
    enabled: !!householdId,
  })

  const byMealPlanId = useMemo(() => {
    const map = new Map<string, MealOutcome>()
    for (const o of query.data ?? []) map.set(o.meal_plan_id, o)
    return map
  }, [query.data])

  return { ...query, byMealPlanId }
}

interface UpsertOutcomeArgs {
  mealPlanId: string
  householdId: string
  status: MealOutcomeStatus
  reason?: MealOutcomeReason | null
  note?: string | null
}

/**
 * Insert or update a single meal outcome. Optimistically updates every
 * cached outcomes window for the household so the meal card flips into
 * its happy/neutral state in the same frame as the tap.
 *
 * The realtime echo from Supabase will overwrite the optimistic value
 * with the canonical row (including server-set `id`, `created_at`,
 * `recorded_by`) — see the invalidation path in
 * `src/lib/queryKeys.ts → INVALIDATIONS.meal_outcomes`.
 */
export function useUpsertMealOutcome() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      mealPlanId,
      householdId,
      status,
      reason,
      note,
    }: UpsertOutcomeArgs) => {
      const row = {
        meal_plan_id: mealPlanId,
        household_id: householdId,
        status,
        // Mirror the DB CHECK: as_planned must clear reason+note.
        reason: status === 'as_planned' ? null : (reason ?? null),
        note: status === 'as_planned' ? null : (note ?? null),
        recorded_by: user?.id ?? null,
      }
      const { data, error } = await supabase
        .from('meal_outcomes')
        .upsert(row, { onConflict: 'meal_plan_id' })
        .select('*')
        .single()
      if (error) throw error
      return data as MealOutcome
    },
    onMutate: async (vars) => {
      // Sound: celebrate "as planned" with the warm chime,
      // acknowledge "did not happen" with a softer pop. We deliberately
      // don't play anything on the realtime echo (the household sound
      // map keeps echo updates very gentle) — this is the local intent.
      if (vars.status === 'as_planned') playSoundIfEnabled('done')
      else playSoundIfEnabled('pop')

      const optimistic: MealOutcome = {
        id: `optimistic-${vars.mealPlanId}`,
        meal_plan_id: vars.mealPlanId,
        household_id: vars.householdId,
        status: vars.status,
        reason: vars.status === 'as_planned' ? null : (vars.reason ?? null),
        note: vars.status === 'as_planned' ? null : (vars.note ?? null),
        recorded_by: user?.id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const snapshots = patchOutcomeInCache(
        queryClient,
        vars.householdId,
        vars.mealPlanId,
        optimistic,
      )
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) {
        queryClient.setQueryData(key, prev)
      }
    },
    onSettled: (_data, _err, vars) => {
      invalidateAfter(queryClient, 'meal_outcomes', vars.householdId)
    },
  })
}

interface DeleteOutcomeArgs {
  mealPlanId: string
  householdId: string
}

export function useDeleteMealOutcome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ mealPlanId }: DeleteOutcomeArgs) => {
      const { error } = await supabase
        .from('meal_outcomes')
        .delete()
        .eq('meal_plan_id', mealPlanId)
      if (error) throw error
    },
    onMutate: async ({ mealPlanId, householdId }) => {
      const snapshots = removeOutcomeFromCache(queryClient, householdId, mealPlanId)
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) {
        queryClient.setQueryData(key, prev)
      }
    },
    onSettled: (_data, _err, vars) => {
      invalidateAfter(queryClient, 'meal_outcomes', vars.householdId)
    },
  })
}

// ── Optimistic helpers ──────────────────────────────────────
//
// Update every cached outcomes window for the household. Returns the
// previous values so onError can roll back to a perfect snapshot.

type Snapshot = [QueryKey, MealOutcome[] | undefined]

function patchOutcomeInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  householdId: string,
  mealPlanId: string,
  next: MealOutcome,
): Snapshot[] {
  const snapshots: Snapshot[] = []
  const queries = queryClient.getQueriesData<MealOutcome[]>({
    queryKey: queryKeys.mealOutcomes(householdId),
  })
  for (const [key, value] of queries) {
    snapshots.push([key, value])
    const replaced = (value ?? []).filter((o) => o.meal_plan_id !== mealPlanId)
    queryClient.setQueryData<MealOutcome[]>(key, [...replaced, next])
  }
  return snapshots
}

function removeOutcomeFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  householdId: string,
  mealPlanId: string,
): Snapshot[] {
  const snapshots: Snapshot[] = []
  const queries = queryClient.getQueriesData<MealOutcome[]>({
    queryKey: queryKeys.mealOutcomes(householdId),
  })
  for (const [key, value] of queries) {
    snapshots.push([key, value])
    queryClient.setQueryData<MealOutcome[]>(
      key,
      (value ?? []).filter((o) => o.meal_plan_id !== mealPlanId),
    )
  }
  return snapshots
}
