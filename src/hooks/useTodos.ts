import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import { groupTodosByDay, type TodoItem } from '../lib/todos'

export type { TodoItem } from '../lib/todos'
export { groupTodosByDay, todoBelongsOnDay } from '../lib/todos'

type TodoItemInsert = Database['public']['Tables']['todo_items']['Insert']

/**
 * Fetch every todo for the household that could possibly show
 * up in the visible window:
 *   • all incomplete todos with a date on or before `endDate`
 *     (so the rolling-into-today rule can apply), and
 *   • all completed todos whose completion date falls inside
 *     the window.
 *
 * Filtering and per-day grouping happens client-side via
 * `groupTodosByDay`; this keeps the queries simple and lets the
 * realtime subscription invalidate a single cache entry.
 */
export function useTodos(
  householdId: string | undefined,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ['todo-items', householdId, startDate, endDate],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('todo_items')
        .select('*')
        .eq('household_id', householdId)
        .or(
          `and(completed_on.is.null,date.lte.${endDate}),and(completed_on.gte.${startDate},completed_on.lte.${endDate})`,
        )
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as TodoItem[]
    },
    enabled: !!householdId,
  })
}

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (todo: TodoItemInsert) => {
      const { data, error } = await supabase
        .from('todo_items')
        .insert(todo)
        .select()
        .single()

      if (error) throw error
      return data as TodoItem
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['todo-items', variables.household_id],
      })
    },
  })
}

interface CompleteTodoArgs {
  id: string
  householdId: string
  /** YYYY-MM-DD — the day the user ticked the todo off. */
  completedOn: string
}

export function useCompleteTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, completedOn }: CompleteTodoArgs) => {
      const { data, error } = await supabase
        .from('todo_items')
        .update({
          completed_on: completedOn,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as TodoItem
    },
    onSuccess: (_data, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['todo-items', householdId] })
    },
  })
}

interface ReopenTodoArgs {
  id: string
  householdId: string
}

export function useReopenTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: ReopenTodoArgs) => {
      const { data, error } = await supabase
        .from('todo_items')
        .update({ completed_on: null, completed_at: null })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as TodoItem
    },
    onSuccess: (_data, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['todo-items', householdId] })
    },
  })
}

interface DeleteTodoArgs {
  id: string
  householdId: string
}

export function useDeleteTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: DeleteTodoArgs) => {
      const { error } = await supabase.from('todo_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['todo-items', householdId] })
    },
  })
}

// ── Client-side grouping ────────────────────────────────────

/** Stable, memoisation-friendly grouping for React components. */
export function useGroupedTodos(
  todos: TodoItem[],
  days: string[],
  today: string,
  currentUserId: string | null | undefined,
): Map<string, TodoItem[]> {
  const daysKey = days.join('|')
  const todoIdsKey = todos.map((t) => t.id).join('|')
  // Re-derive when any member of the input changes.
  return useMemo(
    () => groupTodosByDay(todos, days, today, currentUserId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todoIdsKey, daysKey, today, currentUserId],
  )
}
