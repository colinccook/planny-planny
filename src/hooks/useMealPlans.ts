import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type MealPlan = Database['public']['Tables']['meal_plans']['Row']
type MealPlanInsert = Database['public']['Tables']['meal_plans']['Insert']
type MealPlanUpdate = Database['public']['Tables']['meal_plans']['Update']
type MealPlanIngredient = Database['public']['Tables']['meal_plan_ingredients']['Row']
type Ingredient = Database['public']['Tables']['ingredients']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']
type DayContextInsert = Database['public']['Tables']['day_contexts']['Insert']
type DayContextUpdate = Database['public']['Tables']['day_contexts']['Update']
type DayPlaceholder = Database['public']['Tables']['day_placeholders']['Row']

export type MealPlanIngredientWithDetails = MealPlanIngredient & {
  ingredients: Ingredient
}

export type MealPlanWithIngredients = MealPlan & {
  meal_plan_ingredients: MealPlanIngredientWithDetails[]
}

// ── Meal Plans ──────────────────────────────────────────────

export function useMealPlans(
  householdId: string | undefined,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['meal-plans', householdId, startDate, endDate],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, meal_plan_ingredients(*, ingredients(*))')
        .eq('household_id', householdId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as MealPlanWithIngredients[]
    },
    enabled: !!householdId,
  })
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plan: MealPlanInsert) => {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert(plan)
        .select('*, meal_plan_ingredients(*, ingredients(*))')
        .single()

      if (error) throw error
      return data as MealPlanWithIngredients
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['meal-plans', variables.household_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['plan-streak', variables.household_id],
      })
    },
  })
}

export function useUpdateMealPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      ...updates
    }: MealPlanUpdate & { id: string; householdId: string }) => {
      const { data, error } = await supabase
        .from('meal_plans')
        .update(updates)
        .eq('id', id)
        .select('*, meal_plan_ingredients(*, ingredients(*))')
        .single()

      if (error) throw error
      return { data: data as MealPlanWithIngredients, householdId }
    },
    onSuccess: ({ householdId }) => {
      queryClient.invalidateQueries({
        queryKey: ['meal-plans', householdId],
      })
      queryClient.invalidateQueries({
        queryKey: ['plan-streak', householdId],
      })
    },
  })
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      householdId,
    }: {
      id: string
      householdId: string
    }) => {
      const { error } = await supabase.from('meal_plans').delete().eq('id', id)
      if (error) throw error
      return { householdId }
    },
    onSuccess: ({ householdId }) => {
      queryClient.invalidateQueries({
        queryKey: ['meal-plans', householdId],
      })
      queryClient.invalidateQueries({
        queryKey: ['plan-streak', householdId],
      })
    },
  })
}

export function useCopyMealPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      meal,
      targetDate,
      move,
    }: {
      meal: MealPlanWithIngredients
      targetDate: string
      move: boolean
    }) => {
      // Create the copy
      const { data: newMeal, error: createError } = await supabase
        .from('meal_plans')
        .insert({
          household_id: meal.household_id,
          date: targetDate,
          title: meal.title,
          description: meal.description,
        })
        .select()
        .single()

      if (createError) throw createError

      // Copy ingredient links
      const ingredientIds = meal.meal_plan_ingredients.map(
        (mpi) => mpi.ingredient_id,
      )
      if (ingredientIds.length > 0) {
        const rows = ingredientIds.map((id) => ({
          meal_plan_id: newMeal.id,
          ingredient_id: id,
        }))
        const { error: ingError } = await supabase
          .from('meal_plan_ingredients')
          .insert(rows)
        if (ingError) throw ingError
      }

      // If move, delete the original
      if (move) {
        const { error: deleteError } = await supabase
          .from('meal_plans')
          .delete()
          .eq('id', meal.id)
        if (deleteError) throw deleteError
      }

      return { householdId: meal.household_id }
    },
    onSuccess: ({ householdId }) => {
      queryClient.invalidateQueries({
        queryKey: ['meal-plans', householdId],
      })
      queryClient.invalidateQueries({
        queryKey: ['plan-streak', householdId],
      })
      queryClient.invalidateQueries({
        queryKey: ['ingredient-usage-stats', householdId],
      })
    },
  })
}

// ── Meal Plan Ingredients ────────────────────────────────────

export function useSetMealIngredients() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      mealPlanId,
      householdId,
      ingredientIds,
    }: {
      mealPlanId: string
      householdId: string
      ingredientIds: string[]
    }) => {
      // Remove existing ingredient links
      const { error: deleteError } = await supabase
        .from('meal_plan_ingredients')
        .delete()
        .eq('meal_plan_id', mealPlanId)

      if (deleteError) throw deleteError

      // Insert new ingredient links
      if (ingredientIds.length > 0) {
        const rows = ingredientIds.map((id) => ({
          meal_plan_id: mealPlanId,
          ingredient_id: id,
        }))
        const { error: insertError } = await supabase
          .from('meal_plan_ingredients')
          .insert(rows)

        if (insertError) throw insertError
      }

      return { householdId }
    },
    onSuccess: ({ householdId }) => {
      queryClient.invalidateQueries({
        queryKey: ['meal-plans', householdId],
      })
      queryClient.invalidateQueries({
        queryKey: ['ingredient-usage-stats', householdId],
      })
    },
  })
}

// ── Day Contexts ────────────────────────────────────────────

export function useDayContexts(
  householdId: string | undefined,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['day-contexts', householdId, startDate, endDate],
    queryFn: async () => {
      if (!householdId) return []
      // Fetch all contexts that overlap with [startDate, endDate].
      // A multi-day context (end_date set) overlaps when:
      //   ctx.date <= endDate AND ctx.end_date >= startDate
      // A single-day context (end_date null) is treated as end_date = date, so:
      //   ctx.date <= endDate AND ctx.date >= startDate
      // Combined filter:
      //   date <= endDate AND (end_date >= startDate OR (end_date IS NULL AND date >= startDate))
      const { data, error } = await supabase
        .from('day_contexts')
        .select('*')
        .eq('household_id', householdId)
        .lte('date', endDate)
        .or(`end_date.gte.${startDate},and(end_date.is.null,date.gte.${startDate})`)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as DayContext[]
    },
    enabled: !!householdId,
  })
}

export function useCreateDayContext() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ctx: DayContextInsert) => {
      const { data, error } = await supabase
        .from('day_contexts')
        .insert(ctx)
        .select()
        .single()

      if (error) throw error
      return data as DayContext
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['day-contexts', variables.household_id],
      })
    },
  })
}

export function useUpdateDayContext() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      ...updates
    }: DayContextUpdate & { id: string; householdId: string }) => {
      const { data, error } = await supabase
        .from('day_contexts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data: data as DayContext, householdId }
    },
    onSuccess: ({ householdId }) => {
      queryClient.invalidateQueries({
        queryKey: ['day-contexts', householdId],
      })
    },
  })
}

export function useDeleteDayContext() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      householdId,
    }: {
      id: string
      householdId: string
    }) => {
      const { error } = await supabase.from('day_contexts').delete().eq('id', id)
      if (error) throw error
      return { householdId }
    },
    onSuccess: ({ householdId }) => {
      queryClient.invalidateQueries({
        queryKey: ['day-contexts', householdId],
      })
    },
  })
}

// ── Day Placeholders ────────────────────────────────────────

export function useDayPlaceholders(householdId: string | undefined) {
  return useQuery({
    queryKey: ['day-placeholders', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('day_placeholders')
        .select('*')
        .eq('household_id', householdId)

      if (error) throw error
      return (data ?? []) as DayPlaceholder[]
    },
    enabled: !!householdId,
  })
}
