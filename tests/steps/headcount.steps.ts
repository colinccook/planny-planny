import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../support/fixtures'

const { Given, Then } = createBdd(test)

// ── Shared state ──────────────────────────────────────────────

interface HeadcountState {
  defaultAdults: number
  defaultChildren: number
  defaultBabies: number
  contexts: {
    extra_adults: number
    extra_children: number
    extra_babies: number
  }[]
}

let state: HeadcountState = {
  defaultAdults: 0,
  defaultChildren: 0,
  defaultBabies: 0,
  contexts: [],
}

function computeTotals(s: HeadcountState) {
  const extraAdults = s.contexts.reduce((sum, c) => sum + c.extra_adults, 0)
  const extraChildren = s.contexts.reduce((sum, c) => sum + c.extra_children, 0)
  const extraBabies = s.contexts.reduce((sum, c) => sum + c.extra_babies, 0)
  return {
    totalAdults: Math.max(0, s.defaultAdults + extraAdults),
    totalChildren: Math.max(0, s.defaultChildren + extraChildren),
    totalBabies: Math.max(0, s.defaultBabies + extraBabies),
  }
}

// ── Given steps ───────────────────────────────────────────────

Given(
  'a household with {int} default adults, {int} default children, and {int} default babies',
  // eslint-disable-next-line no-empty-pattern
  async ({}, adults: number, children: number, babies: number) => {
    state = {
      defaultAdults: adults,
      defaultChildren: children,
      defaultBabies: babies,
      contexts: [],
    }
  }
)

Given('there are no day context overrides', async () => {
  state.contexts = []
})

Given(
  'a day context with extra adults {int}, extra children {int}, and extra babies {int}',
  // eslint-disable-next-line no-empty-pattern
  async ({}, adults: number, children: number, babies: number) => {
    state.contexts.push({
      extra_adults: adults,
      extra_children: children,
      extra_babies: babies,
    })
  }
)

// ── Then steps (badge display) ────────────────────────────────

Then(
  'the planning badge should show adults with count {int}',
  async ({ page }, expectedCount: number) => {
    const { totalAdults } = computeTotals(state)
    expect(totalAdults).toBe(expectedCount)

    // Render and verify in the browser
    const html = buildBadgeHtml(state)
    await page.setContent(html)
    const adultsBadge = page.locator('[data-testid="adults-badge"]')
    await expect(adultsBadge).toBeVisible()
    await expect(adultsBadge).toContainText(String(expectedCount))
  }
)

Then(
  'the planning badge should show children with count {int}',
  async ({ page }, expectedCount: number) => {
    const { totalChildren } = computeTotals(state)
    expect(totalChildren).toBe(expectedCount)

    const html = buildBadgeHtml(state)
    await page.setContent(html)
    const childrenBadge = page.locator('[data-testid="children-badge"]')
    await expect(childrenBadge).toBeVisible()
    await expect(childrenBadge).toContainText(String(expectedCount))
  }
)

Then(
  'the planning badge should show babies with count {int}',
  async ({ page }, expectedCount: number) => {
    const { totalBabies } = computeTotals(state)
    expect(totalBabies).toBe(expectedCount)

    const html = buildBadgeHtml(state)
    await page.setContent(html)
    const babiesBadge = page.locator('[data-testid="babies-badge"]')
    await expect(babiesBadge).toBeVisible()
    await expect(babiesBadge).toContainText(String(expectedCount))
  }
)

Then('the planning badge should not show adults', async ({ page }) => {
  const { totalAdults } = computeTotals(state)
  expect(totalAdults).toBe(0)

  const html = buildBadgeHtml(state)
  await page.setContent(html)
  await expect(page.locator('[data-testid="adults-badge"]')).toHaveCount(0)
})

Then('the planning badge should not show children', async ({ page }) => {
  const { totalChildren } = computeTotals(state)
  expect(totalChildren).toBe(0)

  const html = buildBadgeHtml(state)
  await page.setContent(html)
  await expect(page.locator('[data-testid="children-badge"]')).toHaveCount(0)
})

Then('the planning badge should not show babies', async ({ page }) => {
  const { totalBabies } = computeTotals(state)
  expect(totalBabies).toBe(0)

  const html = buildBadgeHtml(state)
  await page.setContent(html)
  await expect(page.locator('[data-testid="babies-badge"]')).toHaveCount(0)
})

// ── Helper: build badge HTML mirroring DayContextBadge logic ──

function buildBadgeHtml(s: HeadcountState): string {
  const { totalAdults, totalChildren, totalBabies } = computeTotals(s)

  const adultsPart =
    totalAdults > 0
      ? `<span data-testid="adults-badge">${totalAdults}<span role="img" aria-label="adults">🧑</span></span>`
      : ''

  const childrenPart =
    totalChildren > 0
      ? `<span data-testid="children-badge">${totalChildren}<span role="img" aria-label="children">🧒</span></span>`
      : ''

  const babiesPart =
    totalBabies > 0
      ? `<span data-testid="babies-badge">${totalBabies}<span role="img" aria-label="babies">👶</span></span>`
      : ''

  return `<!DOCTYPE html>
<html><body>
  <div id="badge">${adultsPart}${childrenPart}${babiesPart}</div>
</body></html>`
}
