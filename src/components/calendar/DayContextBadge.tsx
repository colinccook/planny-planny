import type { Database } from '../../types/database'

type DayContext = Database['public']['Tables']['day_contexts']['Row']

interface DayContextBadgeProps {
  defaultAdults: number
  defaultChildren: number
  defaultBabies: number
  contexts: DayContext[]
  onEdit?: () => void
}

export default function DayContextBadge({
  defaultAdults,
  defaultChildren,
  defaultBabies,
  contexts,
  onEdit,
}: DayContextBadgeProps) {
  const extraAdults = contexts.reduce((sum, c) => sum + c.extra_adults, 0)
  const extraChildren = contexts.reduce((sum, c) => sum + c.extra_children, 0)
  const extraBabies = contexts.reduce((sum, c) => sum + c.extra_babies, 0)
  const totalAdults = Math.max(0, defaultAdults + extraAdults)
  const totalChildren = Math.max(0, defaultChildren + extraChildren)
  const totalBabies = Math.max(0, defaultBabies + extraBabies)
  const events = contexts.filter((c) => c.event_name).map((c) => c.event_name!)

  const content = (
    <>
      <span className="inline-flex items-center gap-1 text-gray-600">
        {totalAdults > 0 && (
          <span>
            {totalAdults}
            <span role="img" aria-label="adults">🧑</span>
          </span>
        )}
        {totalChildren > 0 && (
          <span>
            {totalChildren}
            <span role="img" aria-label="children">🧒</span>
          </span>
        )}
        {totalBabies > 0 && (
          <span>
            {totalBabies}
            <span role="img" aria-label="babies">👶</span>
          </span>
        )}
      </span>

      {events.map((event, i) => (
        <span
          key={i}
          className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
        >
          {event}
        </span>
      ))}
    </>
  )

  if (onEdit) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        {content}
      </button>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      {content}
    </span>
  )
}
