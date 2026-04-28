import { useState } from 'react'
import {
  useCompleteTodo,
  useCreateTodo,
  useDeleteTodo,
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
}

/**
 * Editable todo strip rendered at the top of the day detail
 * view. Owners, members and honoured guests can:
 *   • add a new todo (household-level by default; tick the
 *     "Just for me" box to make it private),
 *   • tick a todo off (stamps `completed_on` with `date`),
 *   • un-tick a todo (clears completion),
 *   • press the "×" to delete it permanently.
 *
 * Voting guests and public viewers see nothing.
 */
export default function TodoList({
  householdId,
  date,
  today,
  todos,
  currentRole,
}: TodoListProps) {
  const { user } = useAuth()
  const canManage = canManageTodos(currentRole)
  const create = useCreateTodo()
  const complete = useCompleteTodo()
  const reopen = useReopenTodo()
  const remove = useDeleteTodo()

  const [title, setTitle] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  const handleAdd = async () => {
    const trimmed = title.trim()
    if (!trimmed || !user) return
    await create.mutateAsync({
      household_id: householdId,
      date,
      title: trimmed,
      user_id: isPrivate ? user.id : null,
      created_by: user.id,
    })
    setTitle('')
  }

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

              {canActOnRow && (
                <button
                  type="button"
                  onClick={() => remove.mutate({ id: todo.id, householdId })}
                  className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-500"
                  aria-label={`Delete todo "${todo.title}"`}
                  data-testid={`todo-delete-${todo.id}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleAdd()
          }}
          className="space-y-2"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a todo…"
              className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              data-testid={`todo-input-${date}`}
            />
            <button
              type="submit"
              disabled={!title.trim() || create.isPending}
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
              data-testid={`todo-add-${date}`}
            >
              {create.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              data-testid={`todo-private-${date}`}
              className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Just for me (private)
          </label>
        </form>
      )}
    </section>
  )
}
