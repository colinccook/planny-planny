import { useEffect, useRef } from 'react'

interface CalendarScrollState {
  scrollY: number
  dayCount: number
  /** Wall-clock timestamp the snapshot was taken, used to expire stale state. */
  savedAt: number
}

const STORAGE_KEY = 'planny:calendarScroll'
// State older than this is considered stale (e.g. picked up after a long
// session break or after switching households). We only really care about
// "I just dipped into a day and came back".
const STALE_AFTER_MS = 5 * 60 * 1000
const RESTORE_GUARD_MS = 1500

function readStored(): CalendarScrollState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CalendarScrollState
    if (typeof parsed.scrollY !== 'number' || typeof parsed.dayCount !== 'number') {
      return null
    }
    if (Date.now() - (parsed.savedAt ?? 0) > STALE_AFTER_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeStored(state: CalendarScrollState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // sessionStorage can be unavailable (private mode quotas, SSR-ish
    // environments). Silently no-op — scroll memory is a nice-to-have.
  }
}

export function clearCalendarScrollMemory() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

interface UseCalendarScrollMemoryArgs {
  dayCount: number
  setDayCount: (next: number) => void
  ready: boolean
}

/**
 * Persists the calendar's scroll position and rendered day count to
 * sessionStorage so coming back from a day detail view restores you to
 * the same place. Saves on scroll (throttled via rAF) and on unmount.
 */
export function useCalendarScrollMemory({
  dayCount,
  setDayCount,
  ready,
}: UseCalendarScrollMemoryArgs) {
  const restoredRef = useRef(false)
  const pendingScrollY = useRef<number | null>(null)
  const restoringUntil = useRef(0)

  // Restore on mount: bump dayCount first so enough rows are rendered to
  // accommodate the scroll position, then apply scrollY after layout.
  useEffect(() => {
    if (restoredRef.current) return
    const stored = readStored()
    if (!stored) {
      restoredRef.current = true
      return
    }
    if (stored.dayCount > dayCount) {
      setDayCount(stored.dayCount)
    }
    pendingScrollY.current = stored.scrollY
    restoringUntil.current = Date.now() + RESTORE_GUARD_MS
    restoredRef.current = true
  }, [dayCount, setDayCount])

  // Apply pending scroll once the rendered content is tall enough.
  useEffect(() => {
    if (!ready || pendingScrollY.current == null) return
    const target = pendingScrollY.current
    let cancelled = false
    const tryScroll = () => {
      if (cancelled) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max >= target - 1 || Date.now() > restoringUntil.current) {
        window.scrollTo(0, Math.min(target, Math.max(0, max)))
        pendingScrollY.current = null
        return
      }
      requestAnimationFrame(tryScroll)
    }
    requestAnimationFrame(tryScroll)
    return () => {
      cancelled = true
    }
  }, [ready, dayCount])

  // Persist on scroll (rAF-throttled) and on unmount.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        // Don't persist while we're still restoring — otherwise the
        // restored scroll position can be overwritten by the scroll
        // events triggered by the restore itself.
        if (pendingScrollY.current != null) return
        writeStored({
          scrollY: window.scrollY,
          dayCount,
          savedAt: Date.now(),
        })
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      writeStored({
        scrollY: window.scrollY,
        dayCount,
        savedAt: Date.now(),
      })
    }
  }, [dayCount])
}
