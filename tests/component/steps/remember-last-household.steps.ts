import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'
import {
  pickInitialHousehold,
  lastHouseholdStorageKey,
} from '../../../src/lib/householdSelection'

const { Given, Then } = createBdd(test)

interface World {
  memberships: { id: string }[]
  stored: string | null
  storageKeys: Record<string, string>
}

const world: World = {
  memberships: [],
  stored: null,
  storageKeys: {},
}

function parseMemberships(value: string): { id: string }[] {
  if (!value.trim()) return []
  return value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => ({ id }))
}

Given('the user is a member of households {string}', async ({ page }, value: string) => {
  // The page fixture is required by playwright-bdd's parameter signature
  // even though this scenario is pure-logic. Touch it so the linter
  // doesn't flag it as unused.
  void page
  world.memberships = parseMemberships(value)
})

Given('the last household they used was {string}', async ({ page }, value: string) => {
  void page
  world.stored = value.trim() === '' ? null : value.trim()
})

Then('the household they should land in is {string}', async ({ page }, expected: string) => {
  void page
  const result = pickInitialHousehold(world.stored, world.memberships)
  if (expected === 'none') {
    expect(result).toBeNull()
  } else {
    expect(result?.id).toBe(expected)
  }
})

Given('the storage key for user {string}', async ({ page }, userId: string) => {
  void page
  world.storageKeys[userId] = lastHouseholdStorageKey(userId)
})

Then('the two storage keys should differ', async ({ page }) => {
  void page
  const values = Object.values(world.storageKeys)
  expect(values.length).toBeGreaterThanOrEqual(2)
  expect(new Set(values).size).toBe(values.length)
})

Then(
  'the storage key for user {string} should mention {string}',
  async ({ page }, userId: string, fragment: string) => {
    void page
    const key = world.storageKeys[userId]
    expect(key).toBeDefined()
    expect(key).toContain(fragment)
  },
)
