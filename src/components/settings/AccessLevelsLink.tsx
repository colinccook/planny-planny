import { useState } from 'react'
import Tray from '../ui/Tray'
import AccessLevelsList from './AccessLevelsList'

interface AccessLevelsLinkProps {
  /** Optional override label for the trigger button. */
  label?: string
  /** Visual style of the trigger. `link` is an inline text link
   *  (default), `button` is a small pill-style button. */
  variant?: 'link' | 'button'
}

export default function AccessLevelsLink({
  label = 'What do these levels mean?',
  variant = 'link',
}: AccessLevelsLinkProps) {
  const [open, setOpen] = useState(false)

  const triggerClasses =
    variant === 'button'
      ? 'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100'
      : 'inline-flex items-center gap-1 text-xs font-medium text-emerald-600 underline-offset-2 hover:underline'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClasses}
        data-testid="access-levels-link"
      >
        <span aria-hidden>ℹ️</span>
        <span>{label}</span>
      </button>
      <Tray
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Access Levels"
        description="Who can do what in your household"
      >
        <AccessLevelsList />
        <p className="mt-3 text-xs text-gray-500">
          Tap a household member on the Members card to change
          their level.
        </p>
      </Tray>
    </>
  )
}
