import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

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
    queryKey: ['meal-ideas', householdId, startDate, endDate],
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
      queryClient.invalidateQueries({
        queryKey: ['meal-ideas', variables.household_id],
      })
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
      queryClient.invalidateQueries({
        queryKey: ['meal-ideas', householdId],
      })
      queryClient.invalidateQueries({
        queryKey: ['reactions', householdId, 'meal_idea'],
      })
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
    queryKey: ['reactions', householdId, targetType, ...stableTargetIds],
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reactions', variables.household_id, variables.target_type],
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
    onSuccess: ({ householdId, targetType }) => {
      queryClient.invalidateQueries({
        queryKey: ['reactions', householdId, targetType],
      })
    },
  })
}
