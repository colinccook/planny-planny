import { useMemo, useState } from 'react'
import FullScreenView from '../ui/FullScreenView'
import Tray from '../ui/Tray'
import {
  useCompleteTodo,
  useCreateTodo,
  useDeleteTodo,
  useReopenTodo,
  useUpdateTodo,
  type TodoItem,
} from '../../hooks/useTodos'
import { useMealPlans } from '../../hooks/useMealPlans'
import { useAuth } from '../../hooks/useAuth'
import { addDays, toDateString } from '../../lib/dates'

interface TodoDetailViewProps {
  householdId: string
  /** Day the user navigated from — used to anchor the date picker
   *  list and as the default day for new todos. */
  date: string
  /** When provided, edit this todo. Otherwise the view is in
   *  "create" mode. */
  existingTodo?: TodoItem
  onBack: () => void
  onSaved: () => void
}

function formatDateLabel(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

/**
 * Full-screen Todo view — open this from the day list to edit a
 * todo (rename, reschedule, attach a note, mark done, delete) or
 * to create a new one (in "create" mode the delete button is
 * hidden and Save inserts a new row).
 */
export default function TodoDetailView({
  householdId,
  date,
  existingTodo,
  onBack,
  onSaved,
}: TodoDetailViewProps) {
  const { user } = useAuth()
  const isEditing = !!existingTodo

  const [title, setTitle] = useState(existingTodo?.title ?? '')
  const [note, setNote] = useState(existingTodo?.note ?? '')
  const [scheduledDate, setScheduledDate] = useState(existingTodo?.date ?? date)
  const [isPrivate, setIsPrivate] = useState(
    existingTodo ? existingTodo.user_id !== null : false,
  )

  const [showTitleTray, setShowTitleTray] = useState(false)
  const [showNoteTray, setShowNoteTray] = useState(false)
  const [showDateTray, setShowDateTray] = useState(false)

  const create = useCreateTodo()
  const update = useUpdateTodo()
  const remove = useDeleteTodo()
  const complete = useCompleteTodo()
  const reopen = useReopenTodo()

  const isComplete = !!existingTodo?.completed_on
  const isPending =
    create.isPending || update.isPending || remove.isPending

  // 14-day date picker, anchored to today, that also shows the
  // meals planned for each day so you can pick where to slot the
  // todo in.
  const dates = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result: string[] = []
    for (let i = 0; i < 14; i++) {
      result.push(toDateString(addDays(today, i)))
    }
    // If the todo is currently pinned to a past day (e.g. an
    // older completed todo), surface that day too so the user can
    // see the existing pick.
    if (existingTodo && !result.includes(existingTodo.date)) {
      result.unshift(existingTodo.date)
    }
    return result
  }, [existingTodo])

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]
  const { data: allMeals = [] } = useMealPlans(
    householdId,
    startDate,
    endDate,
  )

  const mealsByDate = useMemo(() => {
    const map = new Map<string, { id: string; title: string }[]>()
    for (const m of allMeals) {
      const existing = map.get(m.date) ?? []
      existing.push({ id: m.id, title: m.title })
      map.set(m.date, existing)
    }
    return map
  }, [allMeals])

  const handleSave = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !user) return
    const trimmedNote = note.trim() || null

    if (existingTodo) {
      await update.mutateAsync({
        id: existingTodo.id,
        householdId,
        title: trimmedTitle,
        date: scheduledDate,
        note: trimmedNote,
      })
    } else {
      await create.mutateAsync({
        household_id: householdId,
        date: scheduledDate,
        title: trimmedTitle,
        note: trimmedNote,
        user_id: isPrivate ? user.id : null,
        created_by: user.id,
      })
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!existingTodo) return
    await remove.mutateAsync({ id: existingTodo.id, householdId })
    onSaved()
  }

  const handleToggleComplete = () => {
    if (!existingTodo) return
    if (isComplete) {
      reopen.mutate({ id: existingTodo.id, householdId })
    } else {
      complete.mutate({
        id: existingTodo.id,
        householdId,
        completedOn: toDateString(new Date()),
      })
    }
  }

  return (
    <FullScreenView
      title={isEditing ? 'Edit Todo' : 'Add Todo'}
      onBack={onBack}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1 space-y-3">
          {/* Done toggle (only when editing) */}
          {isEditing && (
            <button
              type="button"
              onClick={handleToggleComplete}
              aria-pressed={isComplete}
              className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
              data-testid="todo-detail-done-toggle"
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              <span className="text-sm font-medium text-gray-900">
                {isComplete ? 'Done — tap to reopen' : 'Mark as done'}
              </span>
            </button>
          )}

          {/* Title field */}
          <button
            type="button"
            onClick={() => setShowTitleTray(true)}
            className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
            data-testid="todo-title-field"
          >
            <p className="text-xs font-medium text-gray-500">Todo</p>
            <p
              className={`mt-1 text-base ${title ? 'font-semibold text-gray-900' : 'text-gray-400'}`}
            >
              {title || 'What needs doing?'}
            </p>
          </button>

          {/* Date field */}
          <button
            type="button"
            onClick={() => setShowDateTray(true)}
            className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
            data-testid="todo-date-field"
          >
            <p className="text-xs font-medium text-gray-500">Due</p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {formatDateLabel(scheduledDate)}
            </p>
          </button>

          {/* Note field */}
          <button
            type="button"
            onClick={() => setShowNoteTray(true)}
            className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
            data-testid="todo-note-field"
          >
            <p className="text-xs font-medium text-gray-500">Note</p>
            <p
              className={`mt-1 text-sm ${note ? 'whitespace-pre-wrap text-gray-900' : 'text-gray-400'}`}
            >
              {note || 'Optional note'}
            </p>
          </button>

          {/* Private toggle (only meaningful when creating —
              changing visibility on an existing todo would
              violate the RLS rule that pairs user_id with the
              creator). */}
          {!isEditing && (
            <label
              className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
              data-testid="todo-private-field"
            >
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                data-testid="todo-private-checkbox"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Just for me
                </span>
                <p className="text-xs text-gray-500">
                  Private — only you can see this reminder.
                </p>
              </div>
            </label>
          )}

          {isEditing && existingTodo?.user_id !== null && (
            <p
              className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700"
              data-testid="todo-private-badge"
            >
              Private — only you can see this reminder.
            </p>
          )}
        </div>

        {/* Save button */}
        <div className="mt-6 space-y-3 pb-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !title.trim()}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            data-testid="todo-save-button"
          >
            {isPending ? 'Saving…' : isEditing ? 'Update Todo' : 'Save Todo'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="w-full rounded-xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              data-testid="todo-delete-button"
            >
              Delete Todo
            </button>
          )}
        </div>
      </div>

      {/* Title Tray */}
      <Tray
        isOpen={showTitleTray}
        onClose={() => setShowTitleTray(false)}
        title="What needs doing?"
        description="Give your todo a short name"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Buy milk"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          autoFocus
          data-testid="todo-title-input"
        />
      </Tray>

      {/* Note Tray */}
      <Tray
        isOpen={showNoteTray}
        onClose={() => setShowNoteTray(false)}
        title="Optional note"
        description="Add any extra details for this todo"
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. The blue carton from the corner shop"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          autoFocus
          data-testid="todo-note-input"
        />
      </Tray>

      {/* Date Tray — same pattern as CopyMealTray so users see
          the meals planned for each day while picking. */}
      <Tray
        isOpen={showDateTray}
        onClose={() => setShowDateTray(false)}
        title="When is it due?"
        description="Pick a day"
      >
        <div
          className="max-h-[60vh] space-y-1.5 overflow-y-auto pb-2"
          data-testid="todo-date-picker-list"
        >
          {dates.map((dateStr) => {
            const dayMeals = mealsByDate.get(dateStr) ?? []
            const isSelected = dateStr === scheduledDate
            const isPast = dateStr < toDateString(new Date())
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => {
                  setScheduledDate(dateStr)
                  setShowDateTray(false)
                }}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-emerald-100 ring-2 ring-emerald-500'
                    : 'bg-white ring-1 ring-gray-100 hover:bg-gray-50'
                }`}
                data-testid={`todo-date-option-${dateStr}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatDateLabel(dateStr)}
                    {isPast && (
                      <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        past
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-medium text-emerald-600">
                      ✓ Selected
                    </span>
                  )}
                </div>
                {dayMeals.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayMeals.map((m) => (
                      <span
                        key={m.id}
                        className="inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-gray-600"
                      >
                        {m.title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-gray-400">
                    No meals planned
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </Tray>
    </FullScreenView>
  )
}
