import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'

interface TrayProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

const DISMISS_THRESHOLD = 80

type Phase = 'closed' | 'mounted' | 'open' | 'closing'

export default function Tray({ isOpen, onClose, title, description, children }: TrayProps) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [phase, setPhase] = useState<Phase>(isOpen ? 'open' : 'closed')
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStartY = useRef(0)

  // Derive mount/animate state from prop changes (during render, not in effect)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen && (phase === 'closed' || phase === 'closing')) {
      setPhase('mounted')
    } else if (!isOpen && (phase === 'mounted' || phase === 'open')) {
      setPhase('closing')
    }
  }

  // Animation timing: mounted → open (after paint), closing → closed (after transition)
  useEffect(() => {
    if (phase === 'mounted') {
      let cancelled = false
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setPhase('open')
        })
      })
      return () => {
        cancelled = true
      }
    }
    if (phase === 'closing') {
      const timer = setTimeout(() => {
        setPhase('closed')
        setDragY(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [phase])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setDragging(true)
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return
      const dy = e.touches[0].clientY - touchStartY.current
      if (dy > 0) setDragY(dy)
    },
    [dragging],
  )

  const onTouchEnd = useCallback(() => {
    setDragging(false)
    if (dragY > DISMISS_THRESHOLD) {
      onClose()
    }
    setDragY(0)
  }, [dragY, onClose])

  if (phase === 'closed') return null

  const isAnimatedIn = phase === 'open'

  const trayTransform = isAnimatedIn
    ? dragY > 0
      ? `translateY(${dragY}px)`
      : 'translateY(0)'
    : 'translateY(-100%)'

  const trayTransition = dragging ? 'none' : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)'

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${isAnimatedIn ? 'opacity-40' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
        data-testid="tray-backdrop"
      />

      {/* Tray panel */}
      <div
        className="absolute inset-x-0 top-0 flex max-h-[90vh] flex-col rounded-b-2xl bg-white shadow-2xl"
        style={{ transform: trayTransform, transition: trayTransition }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-testid="tray-panel"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close tray"
            data-testid="tray-close-button"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">{children}</div>

        {/* Drag handle */}
        <div className="flex justify-center py-3" data-testid="tray-handle">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
      </div>
    </div>
  )
}
