import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type DayPlaceholder = Database['public']['Tables']['day_placeholders']['Row']
type DayPlaceholderInsert = Database['public']['Tables']['day_placeholders']['Insert']

export function useDayPlaceholders(householdId: string | undefined) {
  return useQuery<DayPlaceholder[]>({
    queryKey: ['day-placeholders', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('day_placeholders')
        .select('*')
        .eq('household_id', householdId)
        .order('day_of_week', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}

export function useUpsertDayPlaceholder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (placeholder: DayPlaceholderInsert) => {
      const { data, error } = await supabase
        .from('day_placeholders')
        .upsert(placeholder, { onConflict: 'household_id,day_of_week' })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['day-placeholders', variables.household_id],
      })
    },
  })
}

export function useDeleteDayPlaceholder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from('day_placeholders').delete().eq('id', id)

      if (error) throw error
      return householdId
    },
    onSuccess: (householdId) => {
      queryClient.invalidateQueries({
        queryKey: ['day-placeholders', householdId],
      })
    },
  })
}
