import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import { invalidateAfter, queryKeys } from '../lib/queryKeys'

type MealIdea = Database['public']['Tables']['meal_ideas']['Row']
type MealIdeaInsert = Database['public']['Tables']['meal_ideas']['Insert']
type Reaction = Database['public']['Tables']['reactions']['Row']
type ReactionInsert = Database['public']['Tables']['reactions']['Insert']

export interface ReactionWithProfile extends Reaction {
  profiles: {
    display_name: string
    avatar_url: string | null
  } | null
}

export function useMealIdeas(
  householdId: string | undefined,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: queryKeys.mealIdeas(householdId, startDate, endDate),
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('meal_ideas')
        .select('*')
        .eq('household_id', householdId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as MealIdea[]
    },
    enabled: !!householdId,
  })
}

export function useCreateMealIdea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (idea: MealIdeaInsert) => {
      const { data, error } = await supabase
        .from('meal_ideas')
        .insert(idea)
        .select()
        .single()

      if (error) throw error
      return data as MealIdea
    },
    onSuccess: (_data, variables) => {
      invalidateAfter(queryClient, 'meal_ideas', variables.household_id)
    },
  })
}

export function useDeleteMealIdea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from('meal_ideas').delete().eq('id', id)
      if (error) throw error
      return { householdId }
    },
    onSuccess: ({ householdId }) => {
      invalidateAfter(queryClient, 'meal_ideas', householdId)
    },
  })
}

export function useReactions(
  householdId: string | undefined,
  targetType: string,
  targetIds: string[],
) {
  const stableTargetIds = useMemo(
    () => [...targetIds].sort((a, b) => a.localeCompare(b)),
    [targetIds],
  )

  return useQuery({
    queryKey: queryKeys.reactions(householdId, targetType, stableTargetIds),
    queryFn: async () => {
      if (!householdId || stableTargetIds.length === 0) return []
      const { data, error } = await supabase
        .from('reactions')
        .select('*, profiles(display_name, avatar_url)')
        .eq('household_id', householdId)
        .eq('target_type', targetType)
        .in('target_id', stableTargetIds)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as ReactionWithProfile[]
    },
    enabled: !!householdId,
  })
}

// ── Optimistic helper ───────────────────────────────────────
//
// Reactions are the highest-frequency mutation in the app — every tap on a
// thumbs-up triggers one. Waiting for the round-trip before the UI reacts
// makes the app feel laggy on flaky mobile connections, so we apply the
// change to the cache immediately, send the request in the background, and
// roll back if the server rejects it.
//
// We only touch cache entries whose key actually contains the mutated
// `targetId` — keys are `['reactions', hh, targetType, ...targetIds]` and
// reacting to one idea must NOT optimistically appear in a sibling cache
// that doesn't track this idea (e.g. a different day's view).

interface ReactionCacheCtx {
  /** Snapshots of every reactions cache entry we touched, for rollback. */
  previous: [unknown[], ReactionWithProfile[] | undefined][]
}

/** Predicate: this reactions cache entry's key includes `targetId`. */
function reactionKeyTouchesTarget(
  key: readonly unknown[],
  targetId: string,
): boolean {
  // key shape: ['reactions', hh, targetType, ...targetIds]
  return key.length > 3 && key.slice(3).includes(targetId)
}

async function withReactionsCacheEdit(
  qc: ReturnType<typeof useQueryClient>,
  householdId: string,
  targetType: string,
  targetId: string,
  edit: (existing: ReactionWithProfile[]) => ReactionWithProfile[],
): Promise<ReactionCacheCtx> {
  const filter = {
    queryKey: queryKeys.reactions(householdId, targetType),
    predicate: (q: { queryKey: readonly unknown[] }) =>
      reactionKeyTouchesTarget(q.queryKey, targetId),
  }

  // Cancel in-flight reactions queries that overlap our target *and await
  // them*. `cancelQueries` is async; without the await a slow fetch can
  // resolve after the snapshot below and overwrite the optimistic state.
  await qc.cancelQueries(filter)

  // Snapshot every matching cache entry *before* we mutate it, so that
  // `onError` can put each one back exactly where it was.
  const previous = qc
    .getQueryCache()
    .findAll(filter)
    .map((q): [unknown[], ReactionWithProfile[] | undefined] => [
      q.queryKey as unknown[],
      q.state.data as ReactionWithProfile[] | undefined,
    ])

  qc.setQueriesData<ReactionWithProfile[]>(filter, (old) =>
    old ? edit(old) : old,
  )

  return { previous }
}

function rollbackReactions(
  qc: ReturnType<typeof useQueryClient>,
  ctx: ReactionCacheCtx | undefined,
): void {
  if (!ctx) return
  for (const [key, data] of ctx.previous) {
    qc.setQueryData(key, data)
  }
}

export function useUpsertReaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reaction: ReactionInsert) => {
      const { data, error } = await supabase
        .from('reactions')
        .upsert(reaction, {
          onConflict: 'household_id,target_type,target_id,emoji,user_id',
          ignoreDuplicates: true,
        })
        .select()
        .single()

      if (error) throw error
      return data as Reaction
    },
    onMutate: async (variables) => {
      const placeholder: ReactionWithProfile = {
        id: `optimistic-${variables.user_id}-${variables.target_id}-${variables.emoji}`,
        household_id: variables.household_id,
        target_type: variables.target_type,
        target_id: variables.target_id,
        emoji: variables.emoji,
        user_id: variables.user_id,
        created_at: new Date().toISOString(),
        profiles: null,
      }
      return await withReactionsCacheEdit(
        queryClient,
        variables.household_id,
        variables.target_type,
        variables.target_id,
        (existing) => {
          // Don't double-add: if the same (user, target, emoji) is already
          // present we leave the cache alone — the upsert is idempotent.
          const already = existing.some(
            (r) =>
              r.user_id === variables.user_id &&
              r.target_id === variables.target_id &&
              r.emoji === variables.emoji,
          )
          return already ? existing : [...existing, placeholder]
        },
      )
    },
    onError: (_err, _variables, context) => {
      rollbackReactions(queryClient, context)
    },
    onSettled: (_data, _err, variables) => {
      // Re-sync with the server to swap our optimistic placeholder for the
      // real row (with a server-issued id, real timestamp, joined profile).
      // Narrow to the touched target_type so we don't force a sibling
      // reactions query (e.g. meal_plan reactions while we tapped a
      // meal_idea reaction) to refetch on every tap.
      queryClient.invalidateQueries({
        queryKey: queryKeys.reactions(variables.household_id, variables.target_type),
      })
    },
  })
}

export function useDeleteReaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      householdId,
      targetType,
      targetId,
      emoji,
      userId,
    }: {
      householdId: string
      targetType: string
      targetId: string
      emoji: string
      userId: string
    }) => {
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('household_id', householdId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('emoji', emoji)
        .eq('user_id', userId)

      if (error) throw error
      return { householdId, targetType }
    },
    onMutate: async (variables) => {
      return await withReactionsCacheEdit(
        queryClient,
        variables.householdId,
        variables.targetType,
        variables.targetId,
        (existing) =>
          existing.filter(
            (r) =>
              !(
                r.user_id === variables.userId &&
                r.target_id === variables.targetId &&
                r.emoji === variables.emoji
              ),
          ),
      )
    },
    onError: (_err, _variables, context) => {
      rollbackReactions(queryClient, context)
    },
    onSettled: (_data, _err, variables) => {
      // Narrow to the touched target_type — see useUpsertReaction.
      queryClient.invalidateQueries({
        queryKey: queryKeys.reactions(variables.householdId, variables.targetType),
      })
    },
  })
}
