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
// We update *every* `['reactions', householdId, targetType, ...]` cache
// entry (the target-id sub-array is part of the key, so different views
// have different keys). TanStack Query's predicate filter lets us match
// them all in one pass.

interface ReactionCacheCtx {
  /** Snapshots of every reactions cache entry we touched, for rollback. */
  previous: [unknown[], ReactionWithProfile[] | undefined][]
}

function withReactionsCacheEdit(
  qc: ReturnType<typeof useQueryClient>,
  householdId: string,
  targetType: string,
  edit: (existing: ReactionWithProfile[]) => ReactionWithProfile[],
): ReactionCacheCtx {
  // Cancel any in-flight reactions queries so they don't overwrite our
  // optimistic snapshot when they resolve.
  qc.cancelQueries({ queryKey: queryKeys.reactions(householdId, targetType) })

  // Snapshot every matching cache entry *before* we mutate it, so that
  // `onError` can put each one back exactly where it was.
  const previous = qc
    .getQueryCache()
    .findAll({ queryKey: queryKeys.reactions(householdId, targetType) })
    .map((q): [unknown[], ReactionWithProfile[] | undefined] => [
      q.queryKey as unknown[],
      q.state.data as ReactionWithProfile[] | undefined,
    ])

  qc.setQueriesData<ReactionWithProfile[]>(
    { queryKey: queryKeys.reactions(householdId, targetType) },
    (old) => (old ? edit(old) : old),
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
      return withReactionsCacheEdit(
        queryClient,
        variables.household_id,
        variables.target_type,
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
      invalidateAfter(queryClient, 'reactions', variables.household_id)
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
      return withReactionsCacheEdit(
        queryClient,
        variables.householdId,
        variables.targetType,
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
      invalidateAfter(queryClient, 'reactions', variables.householdId)
    },
  })
}
