import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from '../../support/fixtures';

const { Then } = createBdd(test);

Then('the viewport should allow user scaling', async ({ page }) => {
  const content = await page.getAttribute('meta[name="viewport"]', 'content');
  expect(content).not.toContain('user-scalable=no');
  expect(content).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/);
});

Then('the viewport should use viewport-fit cover', async ({ page }) => {
  const content = await page.getAttribute('meta[name="viewport"]', 'content');
  expect(content).toContain('viewport-fit=cover');
});

Then('the page should not contain an app header', async ({ page }) => {
  await expect(page.locator('header')).toHaveCount(0);
});

Then('I should not see a plan streak counter', async ({ page }) => {
  await expect(page.getByLabel(/planning streak/)).toHaveCount(0);
});
