import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Ingredient = Database['public']['Tables']['ingredients']['Row']
type IngredientInsert = Database['public']['Tables']['ingredients']['Insert']
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update']

export interface IngredientUsageStat {
  ingredient_id: string
  usage_count: number
  last_planned_date: string | null
}

export function useIngredients(householdId: string | undefined) {
  return useQuery({
    queryKey: ['ingredients', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Ingredient[]
    },
    enabled: !!householdId,
  })
}

export function useIngredientUsageStats(householdId: string | undefined) {
  return useQuery({
    queryKey: ['ingredient-usage-stats', householdId],
    queryFn: async () => {
      if (!householdId) return []

      // Join meal_plan_ingredients → meal_plans to get dates
      const { data, error } = await supabase
        .from('meal_plan_ingredients')
        .select('ingredient_id, meal_plans!inner(date)')
        .eq('meal_plans.household_id', householdId)

      if (error) throw error

      interface MpiRow { ingredient_id: string; meal_plans: { date: string } }
      const rows = (data ?? []) as unknown as MpiRow[]
      const statsMap = new Map<string, { count: number; lastDate: string | null }>()

      for (const row of rows) {
        const ingredientId = row.ingredient_id
        const date = row.meal_plans.date
        const existing = statsMap.get(ingredientId)

        if (!existing) {
          statsMap.set(ingredientId, { count: 1, lastDate: date })
        } else {
          existing.count += 1
          if (!existing.lastDate || date > existing.lastDate) {
            existing.lastDate = date
          }
        }
      }

      const stats: IngredientUsageStat[] = []
      for (const [ingredientId, { count, lastDate }] of statsMap) {
        stats.push({
          ingredient_id: ingredientId,
          usage_count: count,
          last_planned_date: lastDate,
        })
      }

      return stats
    },
    enabled: !!householdId,
  })
}

export function useCreateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ingredient: IngredientInsert) => {
      const { data, error } = await supabase
        .from('ingredients')
        .insert(ingredient)
        .select()
        .single()

      if (error) throw error
      return data as Ingredient
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ingredients', variables.household_id] })
    },
  })
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, householdId, updates }: {
      id: string
      householdId: string
      updates: IngredientUpdate
    }) => {
      const { data, error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data: data as Ingredient, householdId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ingredients', result.householdId] })
    },
  })
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { householdId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ingredients', result.householdId] })
    },
  })
}
