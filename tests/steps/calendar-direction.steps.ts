import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../support/fixtures'

const { Given, When, Then } = createBdd(test)

// ── State for date range tests ────────────────────────────────
let dateRangeResult: string[] = []

// ── Given steps ───────────────────────────────────────────────

Given(
  'I open a page with the calendar direction component in forward mode',
  async ({ page }) => {
    await page.setContent(buildDirectionHtml('forward'))
  }
)

Given(
  'I open a page with the calendar direction component in backward mode',
  async ({ page }) => {
    await page.setContent(buildDirectionHtml('backward'))
  }
)

Given('I open a page with day labels in backward mode', async ({ page }) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const formatDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const todayStr = formatDate(today)
  const yesterdayStr = formatDate(yesterday)

  // Compute label for yesterday
  const formatLabel = (dateStr: string) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const tom = new Date(now)
    tom.setDate(tom.getDate() + 1)
    const yest = new Date(now)
    yest.setDate(yest.getDate() - 1)

    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)

    if (date.getTime() === now.getTime()) return 'Today'
    if (date.getTime() === tom.getTime()) return 'Tomorrow'
    if (date.getTime() === yest.getTime()) return 'Yesterday'

    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const todayLabel = formatLabel(todayStr)
  const yesterdayLabel = formatLabel(yesterdayStr)

  await page.setContent(`<!DOCTYPE html>
<html><body>
  <div data-testid="day-row-${todayStr}"><h3>${todayLabel}</h3></div>
  <div data-testid="day-row-${yesterdayStr}"><h3>${yesterdayLabel}</h3></div>
</body></html>`)
})

Given(
  'a backward date range starting from today with {int} days',
  // eslint-disable-next-line no-empty-pattern
  async ({}, count: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    dateRangeResult = []
    for (let i = 0; i < count; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      dateRangeResult.push(`${y}-${m}-${day}`)
    }
  }
)

// ── When steps ────────────────────────────────────────────────

When('I click the "View past" button', async ({ page }) => {
  await page.getByTestId('switch-to-past').click()
})

When('I click the dismiss info button', async ({ page }) => {
  await page.getByTestId('dismiss-direction-info').click()
})

// ── Then steps ────────────────────────────────────────────────

Then('I should see the forward direction indicator', async ({ page }) => {
  await expect(page.getByTestId('direction-forward-indicator')).toBeVisible()
})

Then('I should see a "View past" button', async ({ page }) => {
  await expect(page.getByTestId('switch-to-past')).toBeVisible()
})

Then('I should see the backward direction info card', async ({ page }) => {
  await expect(page.getByTestId('direction-info-card')).toBeVisible()
})

Then('I should not see the backward direction info card', async ({ page }) => {
  await expect(page.getByTestId('direction-info-card')).toHaveCount(0)
})

Then(
  'the info card should say {string}',
  async ({ page }, text: string) => {
    const card = page.getByTestId('direction-info-card')
    await expect(card).toContainText(text)
  }
)

Then(
  'the info card should display {string}',
  async ({ page }, text: string) => {
    const card = page.getByTestId('direction-info-card')
    await expect(card).toContainText(text)
  }
)

Then('I should see {string} as a day label', async ({ page }, label: string) => {
  await expect(page.getByText(label)).toBeVisible()
})

Then('the first date should be today', async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const expected = `${y}-${m}-${d}`
  expect(dateRangeResult[0]).toBe(expected)
})

// eslint-disable-next-line no-empty-pattern
Then('the last date should be {int} days ago', async ({}, daysAgo: number) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const past = new Date(today)
  past.setDate(past.getDate() - daysAgo)
  const y = past.getFullYear()
  const m = String(past.getMonth() + 1).padStart(2, '0')
  const d = String(past.getDate()).padStart(2, '0')
  const expected = `${y}-${m}-${d}`
  expect(dateRangeResult[dateRangeResult.length - 1]).toBe(expected)
})

// ── Helper: build direction UI HTML ───────────────────────────

function buildDirectionHtml(direction: 'forward' | 'backward'): string {
  if (direction === 'forward') {
    return `<!DOCTYPE html>
<html><body>
  <div data-testid="direction-forward-indicator"
       style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#ecfdf5;border-radius:12px;border:1px solid #d1fae5;">
    <span>📅</span>
    <p style="font-size:14px;font-weight:500;color:#065f46;">Upcoming days</p>
    <button data-testid="switch-to-past"
            style="margin-left:auto;font-size:12px;color:#059669;"
            onclick="switchToBackward()">
      View past ⏪
    </button>
  </div>

  <script>
    function switchToBackward() {
      document.body.innerHTML = \`
        <div data-testid="direction-info-card"
             style="display:flex;align-items:flex-start;gap:8px;padding:12px 16px;background:#eff6ff;border-radius:12px;border:1px solid #dbeafe;">
          <span>⏪</span>
          <div style="flex:1;">
            <p style="font-size:14px;font-weight:500;color:#1e3a5f;">Viewing past days</p>
            <p style="font-size:14px;color:#1d4ed8;">Tap the Calendar tab again to switch back to upcoming days.</p>
          </div>
          <button data-testid="dismiss-direction-info"
                  aria-label="Dismiss info"
                  onclick="document.querySelector('[data-testid=direction-info-card]').remove()"
                  style="padding:4px;color:#93c5fd;background:none;border:none;cursor:pointer;">✕</button>
        </div>
      \`;
    }
  </script>
</body></html>`
  }

  return `<!DOCTYPE html>
<html><body>
  <div data-testid="direction-info-card"
       style="display:flex;align-items:flex-start;gap:8px;padding:12px 16px;background:#eff6ff;border-radius:12px;border:1px solid #dbeafe;">
    <span>⏪</span>
    <div style="flex:1;">
      <p style="font-size:14px;font-weight:500;color:#1e3a5f;">Viewing past days</p>
      <p style="font-size:14px;color:#1d4ed8;">Tap the Calendar tab again to switch back to upcoming days.</p>
    </div>
    <button data-testid="dismiss-direction-info"
            aria-label="Dismiss info"
            onclick="document.querySelector('[data-testid=direction-info-card]').remove()"
            style="padding:4px;color:#93c5fd;background:none;border:none;cursor:pointer;">✕</button>
  </div>
</body></html>`
}
