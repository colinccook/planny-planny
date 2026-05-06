import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import { groupTodosByDay, type TodoItem } from '../lib/todos'
import { invalidateAfter, queryKeys } from '../lib/queryKeys'

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
    queryKey: queryKeys.todoItems(householdId, startDate, endDate),
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
      invalidateAfter(queryClient, 'todo_items', variables.household_id)
    },
  })
}

// ── Optimistic helpers for tick / un-tick ───────────────────
//
// Marking a todo done is a high-frequency one-tap interaction; we want the
// UI to flip instantly rather than wait for the round-trip. We update every
// cached todo-items list for the household, snapshot the previous value
// for rollback, then re-sync from the server when the mutation settles.

interface TodoCacheCtx {
  previous: [unknown[], TodoItem[] | undefined][]
}

async function patchTodoInCache(
  qc: ReturnType<typeof useQueryClient>,
  householdId: string,
  todoId: string,
  patch: Partial<TodoItem>,
): Promise<TodoCacheCtx> {
  // `cancelQueries` is async — without awaiting it a slow in-flight fetch
  // can resolve after we mutate the cache below and overwrite the
  // optimistic state, leaving the checkbox flipping back briefly.
  await qc.cancelQueries({ queryKey: queryKeys.todoItems(householdId) })

  // Snapshot every matching cache entry *before* mutating, so `onError`
  // can put each one back exactly as it was.
  const previous = qc
    .getQueryCache()
    .findAll({ queryKey: queryKeys.todoItems(householdId) })
    .map((q): [unknown[], TodoItem[] | undefined] => [
      q.queryKey as unknown[],
      q.state.data as TodoItem[] | undefined,
    ])

  qc.setQueriesData<TodoItem[]>(
    { queryKey: queryKeys.todoItems(householdId) },
    (old) => (old ? old.map((t) => (t.id === todoId ? { ...t, ...patch } : t)) : old),
  )

  return { previous }
}

function rollbackTodos(
  qc: ReturnType<typeof useQueryClient>,
  ctx: TodoCacheCtx | undefined,
): void {
  if (!ctx) return
  for (const [key, data] of ctx.previous) {
    qc.setQueryData(key, data)
  }
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
    onMutate: ({ id, householdId, completedOn }) =>
      patchTodoInCache(queryClient, householdId, id, {
        completed_on: completedOn,
        completed_at: new Date().toISOString(),
      }),
    onError: (_err, _variables, context) => rollbackTodos(queryClient, context),
    onSettled: (_data, _err, { householdId }) => {
      invalidateAfter(queryClient, 'todo_items', householdId)
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
    onMutate: ({ id, householdId }) =>
      patchTodoInCache(queryClient, householdId, id, {
        completed_on: null,
        completed_at: null,
      }),
    onError: (_err, _variables, context) => rollbackTodos(queryClient, context),
    onSettled: (_data, _err, { householdId }) => {
      invalidateAfter(queryClient, 'todo_items', householdId)
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
      invalidateAfter(queryClient, 'todo_items', householdId)
    },
  })
}

// ── Update ──────────────────────────────────────────────────
//
// Used by the full-screen Todo view to edit a todo's title,
// reschedule it to a different day, and add/remove the optional
// note. Deliberately separate from `useCompleteTodo`/`useReopenTodo`
// — those are one-tap optimistic flips for the list, this one is
// a deliberate save action from the detail view.

interface UpdateTodoArgs {
  id: string
  householdId: string
  title: string
  date: string
  note: string | null
}

export function useUpdateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, title, date, note }: UpdateTodoArgs) => {
      const { data, error } = await supabase
        .from('todo_items')
        .update({ title, date, note })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as TodoItem
    },
    onSuccess: (_data, { householdId }) => {
      invalidateAfter(queryClient, 'todo_items', householdId)
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
  // Key on every field that can affect grouping or row rendering.
  // Crucially, this includes `completed_on` so ticking / un-ticking
  // a todo invalidates the cached grouping — otherwise the memo
  // would return the previous Map (which still contains the
  // pre-toggle TodoItem objects) and the UI would appear stuck
  // until the component is remounted (i.e. a manual refresh).
  const todosKey = todos
    .map(
      (t) =>
        `${t.id}:${t.date}:${t.completed_on ?? ''}:${t.user_id ?? ''}:${t.title}`,
    )
    .join('|')
  // Re-derive when any member of the input changes.
  return useMemo(
    () => groupTodosByDay(todos, days, today, currentUserId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todosKey, daysKey, today, currentUserId],
  )
}
