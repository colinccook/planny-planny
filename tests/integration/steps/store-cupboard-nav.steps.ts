import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { When } = createBdd(test)

// Real-app navigation step used by the store-cupboard integration features.
// The harness-driven steps that exercise the in-step HTML fixture live in
// `tests/component/steps/store-cupboard.steps.ts`.

When('I navigate to the store cupboard page', async ({ page }) => {
  await page.goto('/store-cupboard')
})
