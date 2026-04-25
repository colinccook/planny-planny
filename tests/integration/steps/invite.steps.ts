import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { When, Then } = createBdd(test)

// --- Invite link steps ---

When('I navigate to an invite link with token {string}', async ({ page }, token: string) => {
  await page.goto(`/invite/${token}`)
})

Then('I should be redirected to the registration page', async ({ page }) => {
  await expect(page).toHaveURL(/\/register(\?|$)/)
})

Then(
  'the registration page URL should preserve the invite redirect for token {string}',
  async ({ page }, token: string) => {
    // The current URL must include the redirect query pointing back at the
    // invite path so the user lands on the Join page after creating an account.
    const url = new URL(page.url())
    expect(url.pathname).toMatch(/\/register$/)
    expect(url.searchParams.get('redirect')).toBe(`/invite/${token}`)
  },
)

Then('the page URL should contain {string}', async ({ page }, fragment: string) => {
  expect(page.url()).toContain(fragment)
})

Then('the page URL should not be the SPA fallback', async ({ page }) => {
  // The bug being guarded against: the share link omitted the base path and
  // landed on a 404 / GitHub Pages fallback. We detect that by ensuring the
  // app actually rendered React content (the <div id="root"> is non-empty).
  const rootHasContent = await page.evaluate(() => {
    const root = document.getElementById('root')
    return !!root && root.children.length > 0
  })
  expect(rootHasContent).toBe(true)
})
