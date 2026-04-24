import { ACCESS_LEVELS, type AccessLevelInfo } from '../../lib/permissions'

interface AccessLevelCardProps {
  level: AccessLevelInfo
  /** Optional accent color suffix (e.g. 'emerald'). When omitted
   *  a neutral slate look is used — handy for read-only contexts
   *  like the "What do these levels mean?" tray. */
  selected?: boolean
  /** When provided, the card renders as a button. */
  onSelect?: () => void
  /** Disable selection (e.g. while saving). */
  disabled?: boolean
}

const KEY_STYLES: Record<string, { ring: string; bg: string; chip: string }> = {
  owner: { ring: 'ring-emerald-500', bg: 'bg-emerald-50', chip: 'bg-emerald-100 text-emerald-800' },
  member: { ring: 'ring-blue-500', bg: 'bg-blue-50', chip: 'bg-blue-100 text-blue-800' },
  honoured_guest: { ring: 'ring-amber-500', bg: 'bg-amber-50', chip: 'bg-amber-100 text-amber-800' },
  voting_guest: { ring: 'ring-purple-500', bg: 'bg-purple-50', chip: 'bg-purple-100 text-purple-800' },
  public: { ring: 'ring-gray-500', bg: 'bg-gray-50', chip: 'bg-gray-100 text-gray-800' },
}

export function AccessLevelCard({
  level,
  selected = false,
  onSelect,
  disabled = false,
}: AccessLevelCardProps) {
  const styles = KEY_STYLES[level.key] ?? KEY_STYLES.public
  const isInteractive = !!onSelect

  const body = (
    <>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${styles.chip}`}
        >
          {level.label}
        </span>
        {selected && (
          <span className="text-xs font-medium text-emerald-700" aria-label="Current level">
            ✓ Current
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-700">{level.summary}</p>
      <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
        {level.can.map((item) => (
          <li key={item} className="flex gap-1">
            <span aria-hidden>✓</span>
            <span>{item}</span>
          </li>
        ))}
        {level.cannot.map((item) => (
          <li key={item} className="flex gap-1 text-gray-400">
            <span aria-hidden>✗</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </>
  )

  const baseClasses = `block w-full rounded-lg border border-gray-200 p-3 text-left transition-colors ${
    selected ? `${styles.bg} ring-2 ${styles.ring}` : 'bg-white'
  }`

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`${baseClasses} hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60`}
        data-testid={`access-level-option-${level.key}`}
      >
        {body}
      </button>
    )
  }

  return (
    <div className={baseClasses} data-testid={`access-level-card-${level.key}`}>
      {body}
    </div>
  )
}

interface AccessLevelsListProps {
  /** When set, the matching card is highlighted as the current level. */
  currentKey?: string
  /** Optional handler — when provided each card renders as a button. */
  onSelect?: (key: string) => void
  disabled?: boolean
  /** Limit which levels are shown (useful when changing a role —
   *  you can't, for example, demote yourself from owner here). */
  filter?: (level: AccessLevelInfo) => boolean
}

export default function AccessLevelsList({
  currentKey,
  onSelect,
  disabled,
  filter,
}: AccessLevelsListProps) {
  const levels = filter ? ACCESS_LEVELS.filter(filter) : ACCESS_LEVELS
  return (
    <div className="space-y-2" data-testid="access-levels-list">
      {levels.map((level) => (
        <AccessLevelCard
          key={level.key}
          level={level}
          selected={currentKey === level.key}
          onSelect={onSelect ? () => onSelect(level.key) : undefined}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
