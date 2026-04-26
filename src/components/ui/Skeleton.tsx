/**
 * Reusable skeleton building blocks for loading states.
 * All blocks use Tailwind's `animate-pulse` for the throbbing effect.
 *
 * Strategy: pages compose these blocks into a layout-matched
 * `XSkeleton()` placeholder and cross-fade to the real content with
 * `<AnimatePresence>`. Leaf feature components stay pure renderers of
 * loaded data and do not own their own skeletons.
 *
 * See `docs/skeleton-strategy.md` for the full rationale and checklist.
 */
import { clsx } from 'clsx'

interface SkeletonBlockProps {
  className?: string
}

/** A single pulsing placeholder rectangle. */
export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div className={clsx('animate-pulse rounded bg-gray-200', className)} />
  )
}

/** A card-shaped pulsing skeleton with configurable inner lines. */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="space-y-2 p-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded bg-gray-200 ${i === 0 ? 'w-1/2' : 'w-3/4'}`}
          />
        ))}
      </div>
    </div>
  )
}

/** Skeleton that mimics a DayRow card from the calendar. */
export function SkeletonDayRow() {
  return (
    <div className="animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-4 w-12 rounded bg-gray-200" />
        <div className="ml-auto h-4 w-4 rounded bg-gray-100" />
      </div>
      <div className="px-4 pb-3">
        <div className="h-10 rounded-lg bg-gray-100" />
      </div>
    </div>
  )
}

/** Skeleton that mimics a settings card (heading + line). */
export function SkeletonSettingsCard() {
  return (
    <div className="animate-pulse rounded-lg bg-white p-4 shadow">
      <div className="mb-2 h-4 w-32 rounded bg-gray-200" />
      <div className="h-3 w-48 rounded bg-gray-100" />
    </div>
  )
}

/** Skeleton that mimics a form field tile (label + value). */
export function SkeletonFormField() {
  return (
    <div className="animate-pulse rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-2 h-3 w-20 rounded bg-gray-200" />
      <div className="h-5 w-36 rounded bg-gray-100" />
    </div>
  )
}

/** Skeleton that mimics a meal card in the day detail view. */
export function SkeletonMealCard() {
  return (
    <div className="animate-pulse rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-2 h-5 w-40 rounded bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-gray-100" />
        <div className="h-6 w-20 rounded-full bg-gray-100" />
      </div>
    </div>
  )
}
