import { useEffect, useState, type ReactNode } from 'react'
import { useSwipe } from '../../hooks/useSwipe'

interface SwipeableDayProps {
  /** YYYY-MM-DD; used as React key so child mounts fresh per day. */
  date: string
  /** Direction the new view should slide in from (incoming animation). */
  enterFrom: 'left' | 'right' | null
  /** Called when the user completes a left swipe (= advance to next day). */
  onSwipeLeft: () => void
  /** Called when the user completes a right swipe (= go to previous day). */
  onSwipeRight: () => void
  /** Called when the user swipes a meal card horizontally. */
  onMealSwipe: (direction: 'left' | 'right', mealId: string) => void
  children: ReactNode
}

const SWIPE_THRESHOLD = 70

/**
 * Wraps the day detail content in a touch-driven horizontal pager:
 *   • follows the finger with translateX while dragging,
 *   • commits on release past the threshold,
 *   • plays a slide-in animation when arriving from a swipe,
 *   • forwards meal-card swipes to `onMealSwipe` so meals can have
 *     their own gesture without changing the day.
 */
export default function SwipeableDay({
  date,
  enterFrom,
  onSwipeLeft,
  onSwipeRight,
  onMealSwipe,
  children,
}: SwipeableDayProps) {
  const { ref, dragX, isDragging } = useSwipe<HTMLDivElement>({
    threshold: SWIPE_THRESHOLD,
    onSwipe: (dir) => {
      if (dir === 'left') onSwipeLeft()
      else onSwipeRight()
    },
    onMealSwipe,
  })

  // Replay the entrance animation whenever the date changes. We track the
  // "previous date we animated" in a ref, so when it differs we briefly
  // start at the off-screen offset before the rAF flips us in.
  const [animKey, setAnimKey] = useState(date)
  const [entered, setEntered] = useState(enterFrom == null)

  if (animKey !== date) {
    // Setting state during render to reset the animation atomically with
    // the date change — recommended pattern from React docs for resetting
    // state when a prop changes.
    setAnimKey(date)
    setEntered(enterFrom == null)
  }

  useEffect(() => {
    if (entered) return
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [entered, animKey])

  // Choose the initial transform for the entrance animation.
  let initialTranslate = 0
  if (!entered && enterFrom === 'right') initialTranslate = window.innerWidth || 400
  if (!entered && enterFrom === 'left') initialTranslate = -(window.innerWidth || 400)

  const translate = isDragging ? dragX : initialTranslate
  const transitionStyle = isDragging
    ? 'none'
    : 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)'

  return (
    <div
      ref={ref}
      data-testid="day-swipe-container"
      style={{
        transform: `translate3d(${translate}px, 0, 0)`,
        transition: transitionStyle,
        // touch-action allows vertical pan but lets us preventDefault on
        // horizontal moves to stop browser swipe-back.
        touchAction: 'pan-y',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}
