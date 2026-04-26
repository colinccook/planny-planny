import { describe, it, expect } from 'vitest'
import { pickInitialHousehold, lastHouseholdStorageKey } from './householdSelection'

describe('pickInitialHousehold', () => {
  const h1 = { id: 'h1' }
  const h2 = { id: 'h2' }
  const h3 = { id: 'h3' }

  it('returns null when the user has no memberships', () => {
    expect(pickInitialHousehold('h1', [])).toBeNull()
    expect(pickInitialHousehold(null, [])).toBeNull()
  })

  it('returns the stored household when it is still a membership', () => {
    expect(pickInitialHousehold('h2', [h1, h2, h3])).toBe(h2)
  })

  it('falls back to the first household when the stored id is not a current membership', () => {
    expect(pickInitialHousehold('gone', [h1, h2])).toBe(h1)
  })

  it('falls back to the first household when nothing is stored', () => {
    expect(pickInitialHousehold(null, [h1, h2])).toBe(h1)
    expect(pickInitialHousehold(undefined, [h1, h2])).toBe(h1)
    expect(pickInitialHousehold('', [h1, h2])).toBe(h1)
  })

  it('preserves stored selection even when it is not the first household', () => {
    // Regression: don't accidentally reorder/normalise to "first".
    expect(pickInitialHousehold('h3', [h1, h2, h3])).toBe(h3)
  })
})

describe('lastHouseholdStorageKey', () => {
  it('is scoped per user so accounts do not leak ids to each other', () => {
    expect(lastHouseholdStorageKey('user-a')).not.toBe(lastHouseholdStorageKey('user-b'))
    expect(lastHouseholdStorageKey('user-a')).toContain('user-a')
  })
})
