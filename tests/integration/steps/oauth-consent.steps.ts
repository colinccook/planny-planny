import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { Then } = createBdd(test)

Then(
  'I should be redirected to login with OAuth authorization id {string}',
  async ({ page }, authorizationId: string) => {
    await expect(page).toHaveURL(/\/login\?/)
    const redirect = new URL(page.url()).searchParams.get('redirect')
    expect(redirect).toBe(`/oauth/consent?authorization_id=${authorizationId}`)
  },
)

Then('I should see an invalid OAuth authorization request', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Invalid request' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText(
    'The authorization request is missing its identifier.',
  )
})
