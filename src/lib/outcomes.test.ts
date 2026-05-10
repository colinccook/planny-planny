import { describe, it, expect } from 'vitest'
import { canRecordOutcomeOn, shouldShowYesterdayGhost } from './outcomes'
import type { MealOutcome } from '../hooks/useMealOutcomes'

function outcome(mealPlanId: string): MealOutcome {
  return {
    id: `o-${mealPlanId}`,
    meal_plan_id: mealPlanId,
    household_id: 'hh',
    status: 'as_planned',
    reason: null,
    note: null,
    recorded_by: null,
    created_at: '2026-05-10T00:00:00Z',
    updated_at: '2026-05-10T00:00:00Z',
  }
}

describe('canRecordOutcomeOn', () => {
  it('allows today', () => {
    expect(canRecordOutcomeOn('2026-05-10', '2026-05-10')).toBe(true)
  })
  it('allows past dates', () => {
    expect(canRecordOutcomeOn('2026-05-10', '2026-05-09')).toBe(true)
    expect(canRecordOutcomeOn('2026-05-10', '2025-12-31')).toBe(true)
  })
  it('blocks future dates', () => {
    expect(canRecordOutcomeOn('2026-05-10', '2026-05-11')).toBe(false)
    expect(canRecordOutcomeOn('2026-05-10', '2026-12-25')).toBe(false)
  })
})

describe('shouldShowYesterdayGhost', () => {
  const today = '2026-05-10'
  const yesterday = '2026-05-09'

  it('returns false when yesterday had no meals', () => {
    expect(
      shouldShowYesterdayGhost(today, new Map(), new Map()),
    ).toBe(false)
  })

  it('returns true when yesterday had meals and at least one has no outcome', () => {
    const meals = new Map([[yesterday, [{ id: 'm1' }, { id: 'm2' }]]])
    // m1 has an outcome but m2 does not
    const outcomes = new Map([['m1', outcome('m1')]])
    expect(shouldShowYesterdayGhost(today, meals, outcomes)).toBe(true)
  })

  it('returns false when every meal yesterday has an outcome', () => {
    const meals = new Map([[yesterday, [{ id: 'm1' }, { id: 'm2' }]]])
    const outcomes = new Map([
      ['m1', outcome('m1')],
      ['m2', outcome('m2')],
    ])
    expect(shouldShowYesterdayGhost(today, meals, outcomes)).toBe(false)
  })

  it('looks at the previous day, not today', () => {
    // Meals on today shouldn't trigger the ghost row — only yesterday.
    const meals = new Map([[today, [{ id: 'm1' }]]])
    expect(shouldShowYesterdayGhost(today, meals, new Map())).toBe(false)
  })
})
