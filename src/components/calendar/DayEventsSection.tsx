import { useState } from 'react'
import type { Database } from '../../types/database'
import { useDeleteDayContext } from '../../hooks/useMealPlans'
import DayContextForm from './DayContextForm'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']

interface DayEventsSectionProps {
  date: string
  household: Household
  contexts: DayContext[]
  canEdit: boolean
}

/**
 * Events list + edit-in-place + add-event button. Owns its own
 * `editingContextId` and `showAddEventForm` local state because both are
 * inline forms (no overlay) and they don't need to coordinate with any
 * other section.
 */
export default function DayEventsSection({
  date,
  household,
  contexts,
  canEdit,
}: DayEventsSectionProps) {
  const [editingContextId, setEditingContextId] = useState<string | null>(null)
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const deleteCtx = useDeleteDayContext()

  return (
    <>
      {contexts.length > 0 && (
        <div className="space-y-2" data-testid="events-list">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Events
          </h4>
          {contexts.map((ctx) =>
            editingContextId === ctx.id ? (
              <DayContextForm
                key={ctx.id}
                householdId={household.id}
                date={date}
                existing={ctx}
                household={household}
                onClose={() => setEditingContextId(null)}
              />
            ) : (
              <EventCard
                key={ctx.id}
                context={ctx}
                canEdit={canEdit}
                onEdit={() => setEditingContextId(ctx.id)}
                onDelete={() => deleteCtx.mutate({ id: ctx.id, householdId: household.id })}
              />
            ),
          )}
        </div>
      )}

      {showAddEventForm && (
        <DayContextForm
          householdId={household.id}
          date={date}
          household={household}
          onClose={() => setShowAddEventForm(false)}
        />
      )}

      {canEdit && !showAddEventForm && (
        <button
          type="button"
          onClick={() => setShowAddEventForm(true)}
          className="w-full rounded-lg border-2 border-dashed border-amber-200 py-2.5 text-sm font-medium text-amber-600 transition-colors hover:border-amber-400 hover:bg-amber-50"
          data-testid="add-event-button"
        >
          + Add event
        </button>
      )}
    </>
  )
}

interface EventCardProps {
  context: DayContext
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

function EventCard({ context, canEdit, onEdit, onDelete }: EventCardProps) {
  const changes: string[] = []
  const accessibleChanges: string[] = []
  if (context.extra_adults !== 0) {
    const sign = context.extra_adults > 0 ? '+' : ''
    changes.push(`${sign}${context.extra_adults} 🧑`)
    accessibleChanges.push(`${sign}${context.extra_adults} adults`)
  }
  if (context.extra_children !== 0) {
    const sign = context.extra_children > 0 ? '+' : ''
    changes.push(`${sign}${context.extra_children} 🧒`)
    accessibleChanges.push(`${sign}${context.extra_children} children`)
  }
  if (context.extra_babies !== 0) {
    const sign = context.extra_babies > 0 ? '+' : ''
    changes.push(`${sign}${context.extra_babies} 👶`)
    accessibleChanges.push(`${sign}${context.extra_babies} babies`)
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-100"
      data-testid={`event-card-${context.id}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">
          {context.event_name || 'Headcount change'}
        </p>
        {changes.length > 0 && (
          <p
            className="mt-0.5 text-xs text-gray-500"
            aria-label={accessibleChanges.join(', ')}
          >
            {changes.join('  ')}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1.5 text-gray-400 hover:bg-amber-100 hover:text-gray-600"
            aria-label={`Edit ${context.event_name || 'event'}`}
            data-testid={`edit-event-${context.id}`}
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
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            aria-label={`Delete ${context.event_name || 'event'}`}
            data-testid={`delete-event-${context.id}`}
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
