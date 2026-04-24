import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../support/fixtures'

const { When, Then } = createBdd(test)

// --- Steps for the public-facing "What do these levels mean?" tray ---

Then('I should see the access levels link', async ({ page }) => {
  await expect(page.getByTestId('access-levels-link')).toBeVisible()
})

When('I open the access levels tray', async ({ page }) => {
  await page.getByTestId('access-levels-link').click()
})

Then('the access levels tray should be visible', async ({ page }) => {
  await expect(page.getByTestId('access-levels-list')).toBeVisible()
})

Then(
  'the access levels tray should describe the {string} level',
  async ({ page }, label: string) => {
    const list = page.getByTestId('access-levels-list')
    await expect(list).toBeVisible()
    // Each card renders the friendly label inside its chip.
    await expect(list.getByText(label, { exact: true }).first()).toBeVisible()
  },
)

const KEY_BY_LABEL: Record<string, string> = {
  Owner: 'owner',
  Member: 'member',
  'Honoured Guest': 'honoured_guest',
  'Voting Guest': 'voting_guest',
  'Public Link': 'public',
}

Then(
  'the {string} card should say it can {string}',
  async ({ page }, label: string, capability: string) => {
    const key = KEY_BY_LABEL[label]
    expect(key, `unknown access-level label "${label}"`).toBeTruthy()
    const card = page.getByTestId(`access-level-card-${key}`)
    await expect(card).toBeVisible()
    // The "can" bullets render with a ✓ prefix; the wording must
    // match exactly what `ACCESS_LEVELS` puts in `can`.
    await expect(card.getByText(capability, { exact: true })).toBeVisible()
  },
)

Then(
  'the {string} card should say it cannot {string}',
  async ({ page }, label: string, capability: string) => {
    const key = KEY_BY_LABEL[label]
    expect(key, `unknown access-level label "${label}"`).toBeTruthy()
    const card = page.getByTestId(`access-level-card-${key}`)
    await expect(card).toBeVisible()
    // The "cannot" bullets render with a ✗ prefix; same exact match.
    await expect(card.getByText(capability, { exact: true })).toBeVisible()
  },
)
