import { useRef, useState, type ReactNode } from 'react'

interface SwipeableRowProps {
  children: ReactNode
  onDismiss: () => void
  disabled?: boolean
}

const SWIPE_THRESHOLD = 80

export default function SwipeableRow({ children, onDismiss, disabled }: SwipeableRowProps) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
    setSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping || disabled) return
    currentX.current = e.touches[0].clientX
    const diff = startX.current - currentX.current
    // Only allow left swipe (positive diff)
    const clampedOffset = Math.max(0, Math.min(diff, 200))
    setOffsetX(clampedOffset)
  }

  const handleTouchEnd = () => {
    if (!swiping || disabled) return
    setSwiping(false)

    if (offsetX >= SWIPE_THRESHOLD) {
      setDismissed(true)
      // Wait for animation before calling callback
      setTimeout(() => onDismiss(), 300)
    } else {
      setOffsetX(0)
    }
  }

  return (
    <div className="relative overflow-hidden" data-testid="swipeable-row">
      {/* Background revealed on swipe */}
      <div className="absolute inset-0 flex items-center justify-end bg-emerald-500 px-4">
        <span className="text-sm font-medium text-white">In Cupboard ✓</span>
      </div>

      {/* Foreground content */}
      <div
        className="relative bg-white transition-transform"
        style={{
          transform: dismissed
            ? 'translateX(-100%)'
            : `translateX(-${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
