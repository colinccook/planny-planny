import type { ReactNode } from 'react'

/**
 * The little pill-shaped count badge used in two places:
 *
 *   • the global header — `🔥 {streak}` (the planning streak),
 *   • each day on the calendar / day view — `💡 {n}` for ideas
 *     and `✅ {n}` for todo items.
 *
 * Keeping a single component here means that if we ever rework
 * the look (or add motion/colours) the header flame and the
 * per-day badges stay in step.
 */
export interface HeaderCountBadgeProps {
  /** Emoji or icon shown to the left of the count. */
  icon: ReactNode
  /** The number to display. Set `hideWhenZero` to skip render. */
  count: number
  /** Accessible label, e.g. "3 todo items". */
  ariaLabel: string
  /** Skip rendering when `count` is 0. Defaults to true. */
  hideWhenZero?: boolean
  /** Visual variant — `header` is the bright on-emerald look used
   *  in the AppShell, `subtle` is the gentle pill used inline on
   *  cards next to the day title. */
  variant?: 'header' | 'subtle'
  /** Optional test id for selectors in BDD/component tests. */
  testId?: string
  /** Optional click handler — render as a button when supplied. */
  onClick?: () => void
}

const VARIANT_CLASSES: Record<NonNullable<HeaderCountBadgeProps['variant']>, string> = {
  header: 'bg-emerald-700 text-white',
  subtle: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
}

export default function HeaderCountBadge({
  icon,
  count,
  ariaLabel,
  hideWhenZero = true,
  variant = 'header',
  testId,
  onClick,
}: HeaderCountBadgeProps) {
  if (hideWhenZero && count === 0) return null

  const className = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${VARIANT_CLASSES[variant]}`

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <span aria-hidden="true">{icon}</span> {count}
      </button>
    )
  }

  return (
    <span
      className={className}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <span aria-hidden="true">{icon}</span> {count}
    </span>
  )
}
