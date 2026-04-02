import { createBdd } from 'playwright-bdd';
import { test } from '../support/fixtures';

const { When } = createBdd(test);

When('I visit {string} without being logged in', async ({ page }, url: string) => {
  await page.context().clearCookies();
  await page.goto(url);
});
