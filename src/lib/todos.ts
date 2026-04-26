// Pure helpers for the todo-items feature. Kept separate from
// the data-fetching hooks in `src/hooks/useTodos.ts` so the
// rolling-incomplete logic can be unit-tested without pulling in
// the Supabase client.

import type { Database } from '../types/database'

export type TodoItem = Database['public']['Tables']['todo_items']['Row']

/**
 * Decide whether a single todo should appear on a given day.
 *
 * Rules (matching the issue):
 *   • A *completed* todo only ever appears on its `completed_on`
 *     date — once crossed off it is pinned to that day forever.
 *   • An *incomplete* todo with `date >= today` shows on its own
 *     scheduled `date` (it's "planned for that future day").
 *   • An *incomplete* todo with `date < today` rolls forward and
 *     shows only on `today` — the user never sees it sitting
 *     stale on a past day.
 *   • A *private* todo (user_id set) is only visible to its
 *     owner; household-level todos (user_id null) are visible to
 *     every member of the household.
 */
export function todoBelongsOnDay(
  todo: Pick<TodoItem, 'date' | 'completed_on' | 'user_id'>,
  day: string,
  today: string,
  currentUserId: string | null | undefined,
): boolean {
  if (todo.user_id !== null && todo.user_id !== currentUserId) return false
  if (todo.completed_on !== null) return todo.completed_on === day
  if (todo.date >= today) return todo.date === day
  return day === today
}

/**
 * Group todos by the day they should currently be displayed on,
 * applying the rolling-incomplete rule. Returns a Map keyed by
 * `YYYY-MM-DD`. Days without todos are absent from the map.
 */
export function groupTodosByDay(
  todos: TodoItem[],
  days: string[],
  today: string,
  currentUserId: string | null | undefined,
): Map<string, TodoItem[]> {
  const byDay = new Map<string, TodoItem[]>()
  for (const day of days) {
    const matching = todos.filter((t) =>
      todoBelongsOnDay(t, day, today, currentUserId),
    )
    if (matching.length > 0) byDay.set(day, matching)
  }
  return byDay
}
