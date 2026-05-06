import { describe, it, expect, vi } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys, invalidateAfter } from './queryKeys'

function mockClient() {
  return { invalidateQueries: vi.fn() } as unknown as QueryClient
}

describe('queryKeys', () => {
  it('always anchors keys on the household id', () => {
    expect(queryKeys.mealPlans('hh', '2026-01-01', '2026-01-07')).toEqual([
      'meal-plans',
      'hh',
      '2026-01-01',
      '2026-01-07',
    ])
    expect(queryKeys.mealPlans('hh')).toEqual(['meal-plans', 'hh'])
    expect(queryKeys.ingredients('hh')).toEqual(['ingredients', 'hh'])
    expect(queryKeys.planStreak('hh', '2026-01-01')).toEqual([
      'plan-streak',
      'hh',
      '2026-01-01',
    ])
  })

  it('builds reactions keys from optional segments', () => {
    expect(queryKeys.reactions('hh')).toEqual(['reactions', 'hh'])
    expect(queryKeys.reactions('hh', 'meal_idea')).toEqual([
      'reactions',
      'hh',
      'meal_idea',
    ])
    expect(queryKeys.reactions('hh', 'meal_idea', ['a', 'b'])).toEqual([
      'reactions',
      'hh',
      'meal_idea',
      'a',
      'b',
    ])
  })

  it('builds the global memberships key', () => {
    expect(queryKeys.myHouseholds()).toEqual(['my-households'])
    expect(queryKeys.myHouseholds('user-1')).toEqual(['my-households', 'user-1'])
  })
})

describe('invalidateAfter (dependency graph)', () => {
  it('meal_plans → meal-plans + plan-streak', () => {
    const qc = mockClient()
    invalidateAfter(qc, 'meal_plans', 'hh-1')
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['meal-plans', 'hh-1'] })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['plan-streak', 'hh-1'] })
  })

  it('meal_ideas → meal-ideas + reactions on meal_idea', () => {
    const qc = mockClient()
    invalidateAfter(qc, 'meal_ideas', 'hh-1')
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['meal-ideas', 'hh-1'] })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reactions', 'hh-1', 'meal_idea'],
    })
  })

  it('meal_plan_ingredients fans out to meal-plans + usage stats', () => {
    const qc = mockClient()
    invalidateAfter(qc, 'meal_plan_ingredients', 'hh-1')
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['meal-plan-ingredients', 'hh-1'],
    })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['meal-plans', 'hh-1'] })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ingredient-usage-stats', 'hh-1'],
    })
  })

  it('households update also invalidates membership listing', () => {
    const qc = mockClient()
    invalidateAfter(qc, 'households', 'hh-1')
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['household', 'hh-1'] })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['my-households'] })
  })

  it('household_members → members + my-households', () => {
    const qc = mockClient()
    invalidateAfter(qc, 'household_members', 'hh-1')
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['household-members', 'hh-1'],
    })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['my-households'] })
  })

  it('ingredients → ingredients + usage stats', () => {
    const qc = mockClient()
    invalidateAfter(qc, 'ingredients', 'hh-1')
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['ingredients', 'hh-1'] })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ingredient-usage-stats', 'hh-1'],
    })
  })
})
