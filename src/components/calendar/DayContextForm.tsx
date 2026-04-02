import { useState, type FormEvent } from 'react'
import {
  useCreateDayContext,
  useUpdateDayContext,
  useDeleteDayContext,
} from '../../hooks/useMealPlans'
import type { Database } from '../../types/database'

type DayContext = Database['public']['Tables']['day_contexts']['Row']

interface DayContextFormProps {
  householdId: string
  date: string
  existing?: DayContext
  onClose: () => void
}

export default function DayContextForm({
  householdId,
  date,
  existing,
  onClose,
}: DayContextFormProps) {
  const [eventName, setEventName] = useState(existing?.event_name ?? '')
  const [extraAdults, setExtraAdults] = useState(existing?.extra_adults ?? 0)
  const [extraChildren, setExtraChildren] = useState(existing?.extra_children ?? 0)

  const createCtx = useCreateDayContext()
  const updateCtx = useUpdateDayContext()
  const deleteCtx = useDeleteDayContext()

  const isPending = createCtx.isPending || updateCtx.isPending || deleteCtx.isPending

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (existing) {
      await updateCtx.mutateAsync({
        id: existing.id,
        householdId,
        event_name: eventName.trim() || null,
        extra_adults: extraAdults,
        extra_children: extraChildren,
      })
    } else {
      await createCtx.mutateAsync({
        household_id: householdId,
        date,
        event_name: eventName.trim() || null,
        extra_adults: extraAdults,
        extra_children: extraChildren,
      })
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!existing) return
    await deleteCtx.mutateAsync({ id: existing.id, householdId })
    onClose()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-emerald-200 bg-white p-3 shadow-sm"
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="event-name" className="block text-sm font-medium text-gray-700">
            Event
          </label>
          <input
            id="event-name"
            type="text"
            placeholder="e.g. Mum visiting"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="extra-adults" className="block text-sm font-medium text-gray-700">
              Extra adults
            </label>
            <input
              id="extra-adults"
              type="number"
              min={-99}
              max={99}
              value={extraAdults}
              onChange={(e) => setExtraAdults(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="extra-children" className="block text-sm font-medium text-gray-700">
              Extra children
            </label>
            <input
              id="extra-children"
              type="number"
              min={-99}
              max={99}
              value={extraChildren}
              onChange={(e) => setExtraChildren(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : existing ? 'Update' : 'Add context'}
          </button>
        </div>
      </div>
    </form>
  )
}
