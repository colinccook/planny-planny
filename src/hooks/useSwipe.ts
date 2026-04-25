import { useEffect, useRef, useState } from 'react'

/**
 * Direction of a completed horizontal swipe gesture.
 * - `left`  — finger moved right→left (e.g. "next")
 * - `right` — finger moved left→right (e.g. "previous")
 */
export type SwipeDirection = 'left' | 'right'

interface UseSwipeOptions {
  /** Minimum horizontal distance in px before a swipe counts as completed. */
  threshold?: number
  /**
   * Maximum ratio of vertical to horizontal movement allowed for the gesture
   * to be treated as a swipe. Above this it's treated as a vertical scroll.
   */
  maxVerticalRatio?: number
  /**
   * Called when a horizontal swipe completes (release past threshold).
   * The dragX delta resets to 0 immediately afterwards.
   */
  onSwipe?: (direction: SwipeDirection) => void
  /**
   * Called when the user starts a horizontal-feeling drag on a meal card
   * (an element marked with `data-meal-card="true"`). The day-level swipe
   * is suppressed for this gesture and the consumer can do something else
   * (e.g. snap to the next meal).
   */
  onMealSwipe?: (direction: SwipeDirection, mealId: string) => void
  /** Disable all gesture handling. */
  disabled?: boolean
}

interface UseSwipeReturn<T extends HTMLElement> {
  ref: React.RefObject<T | null>
  /** Live horizontal drag offset (px) while the finger is down. */
  dragX: number
  /** True between touchstart and touchend of an active horizontal gesture. */
  isDragging: boolean
}

const DEFAULT_THRESHOLD = 60
const DEFAULT_VERTICAL_RATIO = 0.7
// Below this absolute movement we don't yet commit to "horizontal" mode —
// keeps small touches from hijacking taps and scroll.
const DIRECTION_LOCK_DISTANCE = 8

/**
 * Touch-driven horizontal swipe detection with finger-following transform.
 * Designed for mobile day-pager UX:
 *   • Free vertical scrolling unless the finger clearly moves horizontally.
 *   • Gestures starting on `[data-meal-card]` route through `onMealSwipe`
 *     instead of `onSwipe`, so meals can have their own swipe behaviour
 *     without changing the day.
 *   • Returns a `dragX` so the caller can render a follow-the-finger
 *     translateX while the gesture is in progress.
 */
export function useSwipe<T extends HTMLElement>(
  options: UseSwipeOptions = {},
): UseSwipeReturn<T> {
  const {
    threshold = DEFAULT_THRESHOLD,
    maxVerticalRatio = DEFAULT_VERTICAL_RATIO,
    onSwipe,
    onMealSwipe,
    disabled = false,
  } = options

  const ref = useRef<T | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Mutable gesture state kept in a ref so the listeners stay stable.
  const stateRef = useRef<{
    active: boolean
    startX: number
    startY: number
    lastX: number
    mode: 'pending' | 'horizontal' | 'vertical'
    target: 'day' | 'meal'
    mealId: string | null
  }>({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    mode: 'pending',
    target: 'day',
    mealId: null,
  })

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return

    const findMealAncestor = (node: EventTarget | null): HTMLElement | null => {
      let cur = node as HTMLElement | null
      while (cur && cur !== el) {
        if (cur.dataset && cur.dataset.mealCard === 'true') return cur
        cur = cur.parentElement
      }
      return null
    }

    const handleStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      const mealEl = findMealAncestor(e.target)
      stateRef.current = {
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        mode: 'pending',
        target: mealEl ? 'meal' : 'day',
        mealId: mealEl?.dataset.mealId ?? null,
      }
    }

    const handleMove = (e: TouchEvent) => {
      const s = stateRef.current
      if (!s.active || e.touches.length !== 1) return
      const t = e.touches[0]
      const dx = t.clientX - s.startX
      const dy = t.clientY - s.startY
      s.lastX = t.clientX

      if (s.mode === 'pending') {
        if (Math.abs(dx) < DIRECTION_LOCK_DISTANCE && Math.abs(dy) < DIRECTION_LOCK_DISTANCE) {
          return
        }
        if (Math.abs(dy) > Math.abs(dx) * maxVerticalRatio && Math.abs(dy) > Math.abs(dx)) {
          s.mode = 'vertical'
        } else if (Math.abs(dx) > Math.abs(dy)) {
          s.mode = 'horizontal'
          // Only the day-level swipe gets the live transform; meal
          // swipes just snap on release.
          if (s.target === 'day') {
            setIsDragging(true)
          }
        } else {
          // Ambiguous so far — wait for more movement.
          return
        }
      }

      if (s.mode === 'horizontal' && s.target === 'day') {
        setDragX(dx)
        // Prevent the page from scrolling sideways while we drag.
        if (e.cancelable) e.preventDefault()
      }
    }

    const handleEnd = () => {
      const s = stateRef.current
      if (!s.active) return
      const dx = s.lastX - s.startX

      if (s.mode === 'horizontal') {
        if (Math.abs(dx) >= threshold) {
          const direction: SwipeDirection = dx < 0 ? 'left' : 'right'
          if (s.target === 'meal' && s.mealId && onMealSwipe) {
            onMealSwipe(direction, s.mealId)
          } else if (s.target === 'day' && onSwipe) {
            onSwipe(direction)
          }
        }
      }

      stateRef.current.active = false
      setDragX(0)
      setIsDragging(false)
    }

    el.addEventListener('touchstart', handleStart, { passive: true })
    el.addEventListener('touchmove', handleMove, { passive: false })
    el.addEventListener('touchend', handleEnd)
    el.addEventListener('touchcancel', handleEnd)

    return () => {
      el.removeEventListener('touchstart', handleStart)
      el.removeEventListener('touchmove', handleMove)
      el.removeEventListener('touchend', handleEnd)
      el.removeEventListener('touchcancel', handleEnd)
    }
  }, [disabled, maxVerticalRatio, onMealSwipe, onSwipe, threshold])

  return { ref, dragX, isDragging }
}
