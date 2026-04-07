import { createBdd } from 'playwright-bdd';
import { test } from '../support/fixtures';

const { Given, Then } = createBdd(test);

Given('I navigate to a day detail page', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/calendar/2026-04-06');
});

Then('I should see the day detail heading', async ({ page }) => {
  const heading = page.locator('h1');
  await heading.waitFor({ state: 'visible', timeout: 5000 });
});
