import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { useState } from 'react'
import {
  useCalendarScrollMemory,
  clearCalendarScrollMemory,
} from './useCalendarScrollMemory'

interface ProbeProps {
  initialDayCount?: number
  ready: boolean
  onState?: (dayCount: number) => void
}

function Probe({ initialDayCount = 14, ready, onState }: ProbeProps) {
  const [dayCount, setDayCount] = useState(initialDayCount)

  useCalendarScrollMemory({ dayCount, setDayCount, ready })

  // Surface dayCount to the test via a side-effect.
  onState?.(dayCount)

  return <div data-testid="probe">{dayCount}</div>
}

describe('useCalendarScrollMemory', () => {
  beforeEach(() => {
    sessionStorage.clear()
    // Make the document tall enough to scroll. jsdom doesn't lay out, so
    // we stub scrollHeight/innerHeight directly.
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      get: () => 5000,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    })
    window.scrollTo = vi.fn((x: number | ScrollToOptions, y?: number) => {
      const top = typeof x === 'number' ? (y ?? 0) : (x.top ?? 0)
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        writable: true,
        value: top,
      })
    }) as unknown as typeof window.scrollTo
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    })
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('persists scroll position when the user scrolls', async () => {
    render(<Probe ready={true} />)

    // Simulate scrolling to 500.
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 500,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })

    const raw = sessionStorage.getItem('planny:calendarScroll')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw ?? '{}') as { scrollY: number; dayCount: number }
    expect(parsed.scrollY).toBe(500)
    expect(parsed.dayCount).toBe(14)
  })

  it('restores scroll position and dayCount on mount once data is ready', async () => {
    sessionStorage.setItem(
      'planny:calendarScroll',
      JSON.stringify({ scrollY: 1200, dayCount: 28, savedAt: Date.now() }),
    )

    let observedDayCount = 0
    render(
      <Probe
        ready={true}
        onState={(dc) => {
          observedDayCount = dc
        }}
      />,
    )

    // dayCount should bump to the stored 28 immediately on mount.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(observedDayCount).toBe(28)

    // window.scrollTo should have been invoked with the stored y.
    await act(async () => {
      // Two rAF beats so the restore loop's scrollTo can fire.
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })
    expect(window.scrollTo).toHaveBeenCalled()
    expect(window.scrollY).toBe(1200)
  })

  it('does not restore scroll until the ready flag flips to true', async () => {
    sessionStorage.setItem(
      'planny:calendarScroll',
      JSON.stringify({ scrollY: 900, dayCount: 28, savedAt: Date.now() }),
    )

    const { rerender } = render(<Probe ready={false} />)
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })
    // Still at 0 because data isn't ready — even though dayCount was bumped.
    expect(window.scrollY).toBe(0)

    // Now flip ready true (e.g. queries resolved from cache).
    rerender(<Probe ready={true} />)
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })
    expect(window.scrollY).toBe(900)
  })

  it('ignores stored snapshots older than 5 minutes', async () => {
    sessionStorage.setItem(
      'planny:calendarScroll',
      JSON.stringify({
        scrollY: 700,
        dayCount: 28,
        savedAt: Date.now() - 10 * 60 * 1000,
      }),
    )

    let observedDayCount = 0
    render(
      <Probe
        ready={true}
        onState={(dc) => {
          observedDayCount = dc
        }}
      />,
    )
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })
    // Stale snapshot should be ignored — dayCount stays at the initial.
    expect(observedDayCount).toBe(14)
    expect(window.scrollY).toBe(0)
  })

  it('clearCalendarScrollMemory wipes the stored snapshot', () => {
    sessionStorage.setItem(
      'planny:calendarScroll',
      JSON.stringify({ scrollY: 100, dayCount: 14, savedAt: Date.now() }),
    )
    clearCalendarScrollMemory()
    expect(sessionStorage.getItem('planny:calendarScroll')).toBeNull()
  })
})
