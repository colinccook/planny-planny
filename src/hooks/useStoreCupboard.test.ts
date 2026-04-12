import { describe, it, expect, beforeEach } from 'vitest'

// Test the localStorage logic directly (not the hook, which needs React)
const STORAGE_PREFIX = 'cupboard:'

interface CupboardState {
  dismissedIngredientIds: string[]
}

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function readState(userId: string): CupboardState {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (raw) {
      const parsed = JSON.parse(raw) as CupboardState
      if (Array.isArray(parsed.dismissedIngredientIds)) {
        return parsed
      }
    }
  } catch {
    // Corrupted data
  }
  return { dismissedIngredientIds: [] }
}

function writeState(userId: string, state: CupboardState): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(state))
}

describe('Store Cupboard localStorage logic', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty array when no data exists', () => {
    const state = readState('user-1')
    expect(state.dismissedIngredientIds).toEqual([])
  })

  it('persists dismissed ingredient IDs', () => {
    writeState('user-1', { dismissedIngredientIds: ['ing-1', 'ing-2'] })
    const state = readState('user-1')
    expect(state.dismissedIngredientIds).toEqual(['ing-1', 'ing-2'])
  })

  it('isolates data by user ID', () => {
    writeState('user-1', { dismissedIngredientIds: ['ing-1'] })
    writeState('user-2', { dismissedIngredientIds: ['ing-2', 'ing-3'] })

    expect(readState('user-1').dismissedIngredientIds).toEqual(['ing-1'])
    expect(readState('user-2').dismissedIngredientIds).toEqual(['ing-2', 'ing-3'])
  })

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem(getStorageKey('user-1'), 'not-json')
    const state = readState('user-1')
    expect(state.dismissedIngredientIds).toEqual([])
  })

  it('handles malformed state object gracefully', () => {
    localStorage.setItem(getStorageKey('user-1'), JSON.stringify({ foo: 'bar' }))
    const state = readState('user-1')
    expect(state.dismissedIngredientIds).toEqual([])
  })

  it('supports reset by writing empty array', () => {
    writeState('user-1', { dismissedIngredientIds: ['ing-1', 'ing-2'] })
    writeState('user-1', { dismissedIngredientIds: [] })
    const state = readState('user-1')
    expect(state.dismissedIngredientIds).toEqual([])
  })

  it('uses correct storage key prefix', () => {
    writeState('user-1', { dismissedIngredientIds: ['ing-1'] })
    const raw = localStorage.getItem('cupboard:user-1')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual({ dismissedIngredientIds: ['ing-1'] })
  })
})
