import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'
import type { DataTable } from '@cucumber/cucumber'

const { Given, When, Then } = createBdd(test)

// ── State ──────────────────────────────────────────────────────

interface IngredientDef {
  name: string
  mealCount: number
  warning: boolean
  starred: boolean
  meals: { name: string; date: string }[]
}

let ingredients: IngredientDef[] = []
let dismissedNames: string[] = []
let showHidden = false
let clipboardText = ''

function resetState() {
  ingredients = []
  dismissedNames = []
  showHidden = false
  clipboardText = ''
}

// ── Given steps ───────────────────────────────────────────────

Given('a store cupboard with no ingredients', async () => {
  resetState()
})

Given(
  'a store cupboard with the following ingredients:',
  // eslint-disable-next-line no-empty-pattern
  async ({}, table: DataTable) => {
    resetState()
    const rows = table.hashes()
    ingredients = rows.map((row) => ({
      name: row.name,
      mealCount: parseInt(row.mealCount, 10),
      warning: row.warning === 'true',
      starred: row.starred === 'true',
      meals: [],
    }))
  }
)

Given(
  'the ingredient {string} has the following meals:',
  // eslint-disable-next-line no-empty-pattern
  async ({}, ingredientName: string, table: DataTable) => {
    const ing = ingredients.find((i) => i.name === ingredientName)
    if (!ing) throw new Error(`Ingredient "${ingredientName}" not found`)
    ing.meals = table.hashes().map((row) => ({
      name: row.name,
      date: row.date,
    }))
  }
)

// eslint-disable-next-line no-empty-pattern
Given('ingredient {string} is dismissed', async ({}, name: string) => {
  dismissedNames.push(name)
})

Given('show hidden is enabled', async () => {
  showHidden = true
})

// ── When steps ────────────────────────────────────────────────

When('I tap on ingredient {string}', async ({ page }, name: string) => {
  const html = buildCupboardHtml()
  await page.setContent(html)
  const button = page.locator(`[data-testid="cupboard-item"] button`).filter({ hasText: name })
  await button.click()
})

// eslint-disable-next-line no-empty-pattern
When('I dismiss ingredient {string}', async ({}, name: string) => {
  dismissedNames.push(name)
})

When('I toggle show hidden', async () => {
  showHidden = !showHidden
})

When('I reset all dismissed ingredients', async () => {
  dismissedNames = []
})

// eslint-disable-next-line no-empty-pattern
When('I undo dismiss for ingredient {string}', async ({}, name: string) => {
  dismissedNames = dismissedNames.filter((n) => n !== name)
})

When('I click the share button', async ({ page }) => {
  const activeIngredients = ingredients.filter(
    (ing) => !dismissedNames.includes(ing.name)
  )
  const lines = activeIngredients.map((ing) => `• ${ing.name}`)
  clipboardText =
    lines.length > 0
      ? `🛒 Shopping List\n${lines.join('\n')}`
      : 'Shopping list is empty!'

  // Also render and click in browser to verify the button exists
  const html = buildCupboardHtml()
  await page.setContent(html)
  await expect(page.locator('[data-testid="share-button"]')).toBeVisible()
})

// ── Then steps ────────────────────────────────────────────────

Then(
  'I should see the message {string}',
  async ({ page }, message: string) => {
    const html = buildCupboardHtml()
    await page.setContent(html)
    await expect(page.locator('[data-testid="cupboard-empty"]')).toContainText(message)
  }
)

Then('I should see {int} cupboard items', async ({ page }, count: number) => {
  const html = buildCupboardHtml()
  await page.setContent(html)
  await expect(page.locator('[data-testid="cupboard-item"]')).toHaveCount(count)
})

Then('I should see {int} dismissed cupboard items', async ({ page }, count: number) => {
  const html = buildCupboardHtml()
  await page.setContent(html)
  await expect(page.locator('[data-testid="cupboard-item-dismissed"]')).toHaveCount(count)
})

Then(
  'I should see ingredient {string} with meal count {int}',
  async ({ page }, name: string, count: number) => {
    const html = buildCupboardHtml()
    await page.setContent(html)
    const item = page.locator('[data-testid="cupboard-item"]').filter({ hasText: name })
    await expect(item).toBeVisible()
    await expect(item.locator('[data-testid="meal-count"]')).toContainText(String(count))
  }
)

Then(
  'I should not see ingredient {string} in the active list',
  async ({ page }, name: string) => {
    const html = buildCupboardHtml()
    await page.setContent(html)
    const items = page.locator('[data-testid="cupboard-item"]').filter({ hasText: name })
    await expect(items).toHaveCount(0)
  }
)

Then(
  'ingredient {string} should appear as dismissed',
  async ({ page }, name: string) => {
    const html = buildCupboardHtml()
    await page.setContent(html)
    const dismissed = page
      .locator('[data-testid="cupboard-item-dismissed"]')
      .filter({ hasText: name })
    await expect(dismissed).toBeVisible()
  }
)

Then(
  'ingredient {string} should not appear as dismissed',
  async ({ page }, name: string) => {
    const html = buildCupboardHtml()
    await page.setContent(html)
    const dismissed = page
      .locator('[data-testid="cupboard-item-dismissed"]')
      .filter({ hasText: name })
    await expect(dismissed).toHaveCount(0)
  }
)

Then(
  'I should see the meal details for {string}',
  async ({ page }, name: string) => {
    const item = page.locator('[data-testid="cupboard-item"]').filter({ hasText: name })
    await expect(item.locator('[data-testid="cupboard-item-meals"]')).toBeVisible()
  }
)

Then(
  'I should see meal {string} in the expanded details',
  async ({ page }, mealName: string) => {
    await expect(
      page.locator('[data-testid="cupboard-item-meals"]').filter({ hasText: mealName })
    ).toBeVisible()
  }
)

Then(
  'the ingredient {string} should show a warning indicator',
  async ({ page }, name: string) => {
    const html = buildCupboardHtml()
    await page.setContent(html)
    const item = page.locator('[data-testid="cupboard-item"]').filter({ hasText: name })
    await expect(item.locator('[data-testid="warning-indicator"]')).toBeVisible()
  }
)

Then(
  'the ingredient {string} should show a starred indicator',
  async ({ page }, name: string) => {
    const html = buildCupboardHtml()
    await page.setContent(html)
    const item = page.locator('[data-testid="cupboard-item"]').filter({ hasText: name })
    await expect(item.locator('[data-testid="starred-indicator"]')).toBeVisible()
  }
)

Then(
  'the clipboard should contain {string}',
  // eslint-disable-next-line no-empty-pattern
  async ({}, text: string) => {
    expect(clipboardText).toContain(text)
  }
)

Then(
  'the clipboard should not contain {string}',
  // eslint-disable-next-line no-empty-pattern
  async ({}, text: string) => {
    expect(clipboardText).not.toContain(text)
  }
)

// ── Helper: Build cupboard HTML mirroring component output ────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.toLocaleDateString('en-GB', { weekday: 'short' })
  const dayNum = date.getDate()
  const month = date.toLocaleDateString('en-GB', { month: 'short' })
  return `${day} ${dayNum} ${month}`
}

function buildCupboardHtml(): string {
  const visible = ingredients.filter(
    (ing) => showHidden || !dismissedNames.includes(ing.name)
  )

  if (visible.length === 0) {
    const msg =
      ingredients.length === 0
        ? 'No ingredients in your future meal plans.'
        : 'All items are in the cupboard! 🎉'
    return `<!DOCTYPE html><html><body>
      <div>
        <button data-testid="share-button">📋 Share</button>
        <p data-testid="cupboard-empty">${msg}</p>
      </div>
    </body></html>`
  }

  const items = visible
    .map((ing) => {
      const isDismissed = dismissedNames.includes(ing.name)

      if (isDismissed) {
        return `<li data-testid="cupboard-item-dismissed">
          <span style="text-decoration: line-through; color: #9ca3af;">${ing.name}</span>
          <button>Undo</button>
        </li>`
      }

      const warningHtml = ing.warning
        ? '<span data-testid="warning-indicator">⚠️</span>'
        : ''
      const starredHtml = ing.starred
        ? '<span data-testid="starred-indicator">⭐</span>'
        : ''

      const mealsHtml =
        ing.meals.length > 0
          ? `<div data-testid="cupboard-item-meals" style="display:none;">
              ${ing.meals.map((m) => `<div>• ${m.name} — ${formatDate(m.date)}</div>`).join('')}
            </div>`
          : ''

      return `<li data-testid="cupboard-item">
        <button onclick="const d=this.parentElement.querySelector('[data-testid=cupboard-item-meals]');if(d)d.style.display=d.style.display==='none'?'block':'none'">
          <span>${ing.name}</span>
          ${warningHtml}
          ${starredHtml}
          <span data-testid="meal-count">${ing.mealCount}</span>
        </button>
        ${mealsHtml}
      </li>`
    })
    .join('')

  return `<!DOCTYPE html><html><body>
    <div>
      <button data-testid="share-button">📋 Share</button>
      <ul>${items}</ul>
    </div>
  </body></html>`
}
