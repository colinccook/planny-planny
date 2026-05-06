import {
  useCompleteTodo,
  useReopenTodo,
  type TodoItem,
} from '../../hooks/useTodos'
import { useAuth } from '../../hooks/useAuth'
import { canManageTodos, type Audience } from '../../lib/permissions'

interface TodoListProps {
  householdId: string
  /** The day this list is being rendered for — completed todos will
   *  be pinned to this date when ticked off. */
  date: string
  /** Today's date string in `YYYY-MM-DD` (local). Used both to
   *  show "rolled forward" hints and for completion stamps. */
  today: string
  todos: TodoItem[]
  currentRole: Audience
  /** Open the full-screen Todo view in "create" mode. */
  onAddTodo: () => void
  /** Open the full-screen Todo view in "edit" mode for the given todo. */
  onEditTodo: (todoId: string) => void
}

/**
 * Editable todo strip rendered at the top of the day detail
 * view. Owners, members and honoured guests can:
 *   • tap "Add a todo" to open the full-screen Todo view in
 *     create mode (set name, due date, optional note, private
 *     flag),
 *   • tap a todo's name to open the same view in edit mode
 *     (rename, reschedule, attach a note, delete),
 *   • tap the checkbox to tick / un-tick a todo.
 *
 * Voting guests and public viewers see the list read-only.
 */
export default function TodoList({
  householdId,
  date,
  today,
  todos,
  currentRole,
  onAddTodo,
  onEditTodo,
}: TodoListProps) {
  const { user } = useAuth()
  const canManage = canManageTodos(currentRole)
  const complete = useCompleteTodo()
  const reopen = useReopenTodo()

  if (!canManage && todos.length === 0) {
    // Non-managers don't see the "add" UI, and there's nothing
    // to display either.
    return null
  }

  return (
    <section
      data-testid={`todo-list-${date}`}
      className="space-y-2 rounded-xl bg-emerald-50/40 p-3 ring-1 ring-emerald-100"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        ✅ Todo
      </h4>

      {todos.length === 0 && (
        <p className="text-sm text-gray-500">Nothing to do (yet).</p>
      )}

      <ul className="space-y-1.5" data-testid={`todo-items-${date}`}>
        {todos.map((todo) => {
          const isComplete = todo.completed_on !== null
          const isPrivateRow = todo.user_id !== null
          // An incomplete todo whose original date is in the
          // past is being rolled forward to today.
          const rolledForward =
            !isComplete && todo.date < today && date === today
          const canActOnRow =
            canManage && (todo.user_id === null || todo.user_id === user?.id)

          return (
            <li
              key={todo.id}
              data-testid={`todo-item-${todo.id}`}
              data-complete={isComplete ? 'true' : 'false'}
              data-private={isPrivateRow ? 'true' : 'false'}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-emerald-100"
            >
              <button
                type="button"
                onClick={() => {
                  if (!canActOnRow) return
                  if (isComplete) {
                    reopen.mutate({ id: todo.id, householdId })
                  } else {
                    complete.mutate({
                      id: todo.id,
                      householdId,
                      completedOn: today,
                    })
                  }
                }}
                disabled={!canActOnRow}
                aria-label={
                  isComplete
                    ? `Mark "${todo.title}" as not done`
                    : `Mark "${todo.title}" as done`
                }
                aria-pressed={isComplete}
                data-testid={`todo-toggle-${todo.id}`}
                className={`inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${canActOnRow ? '' : 'cursor-not-allowed opacity-60'}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                    isComplete
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300 bg-white text-transparent'
                  }`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </button>

              {canActOnRow ? (
                <button
                  type="button"
                  onClick={() => onEditTodo(todo.id)}
                  className={`min-w-0 flex-1 rounded text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isComplete ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                  aria-label={`Open todo "${todo.title}"`}
                  data-testid={`todo-open-${todo.id}`}
                >
                  {todo.title}
                  {isPrivateRow && (
                    <span
                      className="ml-1.5 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700"
                      aria-label="Private reminder, only visible to you"
                    >
                      Private
                    </span>
                  )}
                  {rolledForward && (
                    <span
                      className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-400"
                      aria-label={`Rolled forward from ${todo.date}`}
                    >
                      rolled
                    </span>
                  )}
                </button>
              ) : (
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    isComplete ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                >
                  {todo.title}
                  {isPrivateRow && (
                    <span
                      className="ml-1.5 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700"
                      aria-label="Private reminder, only visible to you"
                    >
                      Private
                    </span>
                  )}
                  {rolledForward && (
                    <span
                      className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-400"
                      aria-label={`Rolled forward from ${todo.date}`}
                    >
                      rolled
                    </span>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {canManage && (
        <button
          type="button"
          onClick={onAddTodo}
          className="w-full rounded-lg border-2 border-dashed border-emerald-200 py-3 text-sm font-medium text-emerald-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
          data-testid={`todo-add-${date}`}
        >
          + Add a todo
        </button>
      )}
    </section>
  )
}
