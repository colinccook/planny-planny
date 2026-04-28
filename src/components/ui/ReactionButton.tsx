import { useEffect, useRef, useState } from 'react'
import Tray from './Tray'

export interface ReactionOption {
  emoji: string
  label: string
}

export interface Reactor {
  id: string
  displayName: string
  emoji: string
  isCurrentUser?: boolean
}

interface ReactionButtonProps {
  options: ReactionOption[]
  reactors: Reactor[]
  currentUserEmoji: string | null
  onReact: (emoji: string) => void | Promise<void>
  onUnreact: () => void | Promise<void>
  disabled?: boolean
  testId?: string
  targetLabel?: string
  size?: 'sm' | 'md'
}

const LONG_PRESS_MS = 500

export default function ReactionButton({
  options,
  reactors,
  currentUserEmoji,
  onReact,
  onUnreact,
  disabled = false,
  testId,
  targetLabel = 'this',
  size = 'md',
}: ReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [showReactors, setShowReactors] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  const hasReacted = currentUserEmoji !== null
  const count = reactors.length
  const displayEmoji = hasReacted
    ? currentUserEmoji
    : (options[0]?.emoji ?? '👍')

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handlePointerDown = () => {
    longPressFired.current = false
    clearLongPress()
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      setShowReactors(true)
    }, LONG_PRESS_MS)
  }

  const handlePointerUp = () => {
    clearLongPress()
  }

  const handlePointerCancel = () => {
    clearLongPress()
    longPressFired.current = true
  }

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    if (disabled) return
    if (hasReacted) {
      void onUnreact()
      return
    }
    if (options.length === 1) {
      void onReact(options[0].emoji)
      return
    }
    setShowPicker((open) => !open)
  }

  const handlePickEmoji = (emoji: string) => {
    setShowPicker(false)
    void onReact(emoji)
  }

  const TOUCH_TARGET = 'min-h-[44px] min-w-[44px]'
  const padding = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'
  const baseClass = `inline-flex items-center gap-1 rounded-full border transition-colors ${TOUCH_TARGET} ${padding} select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`

  const unreactedClass =
    'border-dashed border-gray-300 bg-gray-50 text-gray-400 grayscale hover:bg-gray-100'
  const reactedClass =
    'border-solid border-indigo-400 bg-indigo-100 font-semibold text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-200'

  const buttonClass = `${baseClass} ${hasReacted ? reactedClass : unreactedClass}`

  const ariaLabel = hasReacted
    ? `You reacted ${currentUserEmoji} to ${targetLabel}. Tap to remove, long press to see who reacted.`
    : `React to ${targetLabel}. Tap to ${options.length === 1 ? 'add ' + options[0].label : 'pick a reaction'}, long press to see who reacted.`

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={buttonClass}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={testId}
        data-state={hasReacted ? 'reacted' : 'unreacted'}
      >
        <span aria-hidden="true">{displayEmoji}</span>
        {count > 0 && (
          <span
            className={hasReacted ? 'font-bold' : ''}
            data-testid={testId ? `${testId}-count` : undefined}
          >
            {count}
          </span>
        )}
      </button>

      {showPicker && options.length > 1 && (
        <div
          role="menu"
          aria-label="Pick a reaction"
          data-testid={testId ? `${testId}-picker` : 'reaction-picker'}
          className="absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt.emoji}
              type="button"
              onClick={() => handlePickEmoji(opt.emoji)}
              className={`inline-flex ${TOUCH_TARGET} items-center justify-center rounded-full text-lg hover:bg-gray-100`}
              aria-label={opt.label}
            >
              {opt.emoji}
            </button>
          ))}
        </div>
      )}

      <Tray
        isOpen={showReactors}
        onClose={() => setShowReactors(false)}
        title="Reactions"
        description={
          reactors.length === 0
            ? 'Nobody has reacted yet.'
            : `${reactors.length} ${reactors.length === 1 ? 'person has' : 'people have'} reacted.`
        }
      >
        {reactors.length === 0 ? (
          <p
            className="text-sm text-gray-500"
            data-testid={testId ? `${testId}-reactors-empty` : 'reactors-empty'}
          >
            No reactions yet.
          </p>
        ) : (
          <ul
            className="divide-y divide-gray-100"
            data-testid={testId ? `${testId}-reactors-list` : 'reactors-list'}
          >
            {reactors.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2">
                <span className="text-xl" aria-hidden="true">
                  {r.emoji}
                </span>
                <span className="text-sm text-gray-800">
                  {r.displayName}
                  {r.isCurrentUser ? ' (you)' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tray>
    </div>
  )
}
