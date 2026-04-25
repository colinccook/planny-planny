import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { Given, Then } = createBdd(test)

// --- Public sharing steps ---

Given('I navigate to a shared household page with an invalid token', async ({ page }) => {
  await page.goto('/shared/invalid-token-12345')
})

Then('I should see an error message', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Not Found' })).toBeVisible()
  await expect(
    page.getByText('Shared plan not found or sharing has been disabled.')
  ).toBeVisible()
})
