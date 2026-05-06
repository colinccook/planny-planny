import HeaderCountBadge from '../ui/HeaderCountBadge'
import DayContextBadge from './DayContextBadge'
import type { Database } from '../../types/database'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']

interface DayHeaderStripProps {
  date: string
  household: Household
  contexts: DayContext[]
  placeholderLabel: string | null
  todoCount: number
  ideaCount: number
}

/**
 * The little row of badges that sits at the top of a day:
 * household composition + theme + per-section count badges.
 *
 * Pure presentational — owns no state, fetches no data. Pulled out of
 * `DayDetailView` so the parent's layout stays scannable.
 */
export default function DayHeaderStrip({
  date,
  household,
  contexts,
  placeholderLabel,
  todoCount,
  ideaCount,
}: DayHeaderStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <DayContextBadge
        defaultAdults={household.default_adults}
        defaultChildren={household.default_children}
        defaultBabies={household.default_babies}
        contexts={contexts}
      />
      {placeholderLabel && (
        <span className="text-sm italic text-emerald-500">{placeholderLabel}</span>
      )}
      {todoCount > 0 && (
        <HeaderCountBadge
          icon="✅"
          count={todoCount}
          ariaLabel={`${todoCount} todo ${todoCount === 1 ? 'item' : 'items'}`}
          variant="subtle"
          testId={`day-todo-badge-${date}`}
        />
      )}
      {ideaCount > 0 && (
        <HeaderCountBadge
          icon="💡"
          count={ideaCount}
          ariaLabel={`${ideaCount} ${ideaCount === 1 ? 'idea' : 'ideas'}`}
          variant="subtle"
          testId={`day-idea-badge-${date}`}
        />
      )}
    </div>
  )
}
