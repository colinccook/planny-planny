import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/supabase', () => {
  const mockFrom = vi.fn()
  return {
    supabase: {
      from: mockFrom,
    },
  }
})

import { computeStreak } from './usePlanStreak'
import { toDateString, addDays } from '../lib/dates'

function dateSet(...offsets: number[]): Set<string> {
  const today = new Date(2026, 3, 4) // April 4, 2026
  const set = new Set<string>()
  for (const offset of offsets) {
    set.add(toDateString(addDays(today, offset)))
  }
  return set
}

describe('computeStreak', () => {
  const today = new Date(2026, 3, 4) // April 4, 2026

  it('returns 0 when no days are planned', () => {
    expect(computeStreak(today, new Set())).toBe(0)
  })

  it('returns 1 when only today is planned', () => {
    expect(computeStreak(today, dateSet(0))).toBe(1)
  })

  it('returns consecutive days from today', () => {
    // today, tomorrow, day after
    expect(computeStreak(today, dateSet(0, 1, 2))).toBe(3)
  })

  it('stops at the first gap', () => {
    // today and day-after-tomorrow, but NOT tomorrow
    expect(computeStreak(today, dateSet(0, 2))).toBe(1)
  })

  it('returns 0 when today is not planned even if tomorrow is', () => {
    expect(computeStreak(today, dateSet(1, 2, 3))).toBe(0)
  })

  it('handles a long streak', () => {
    const offsets = Array.from({ length: 30 }, (_, i) => i)
    expect(computeStreak(today, dateSet(...offsets))).toBe(30)
  })
})
