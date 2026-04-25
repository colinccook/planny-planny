import { describe, it, expect } from 'vitest'
import { getAdjacentDate, daysBetween } from './dates'

describe('getAdjacentDate', () => {
  it('returns the next day', () => {
    expect(getAdjacentDate('2026-04-20', 1)).toBe('2026-04-21')
  })

  it('returns the previous day', () => {
    expect(getAdjacentDate('2026-04-20', -1)).toBe('2026-04-19')
  })

  it('rolls over month boundaries', () => {
    expect(getAdjacentDate('2026-04-30', 1)).toBe('2026-05-01')
    expect(getAdjacentDate('2026-05-01', -1)).toBe('2026-04-30')
  })

  it('rolls over year boundaries', () => {
    expect(getAdjacentDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(getAdjacentDate('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('handles leap day', () => {
    expect(getAdjacentDate('2024-02-28', 1)).toBe('2024-02-29')
    expect(getAdjacentDate('2024-03-01', -1)).toBe('2024-02-29')
  })

  it('supports zero offset', () => {
    expect(getAdjacentDate('2026-04-20', 0)).toBe('2026-04-20')
  })
})

describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetween('2026-04-20', '2026-04-20')).toBe(0)
  })

  it('returns positive for a future date', () => {
    expect(daysBetween('2026-04-20', '2026-04-27')).toBe(7)
  })

  it('returns negative for a past date', () => {
    expect(daysBetween('2026-04-27', '2026-04-20')).toBe(-7)
  })

  it('handles month rollovers', () => {
    expect(daysBetween('2026-04-30', '2026-05-02')).toBe(2)
  })
})
