import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from '../support/fixtures';

const { Then } = createBdd(test);

Then('the viewport should have user-scalable disabled', async ({ page }) => {
  const content = await page.getAttribute('meta[name="viewport"]', 'content');
  expect(content).toContain('user-scalable=no');
});

Then('the viewport should use viewport-fit cover', async ({ page }) => {
  const content = await page.getAttribute('meta[name="viewport"]', 'content');
  expect(content).toContain('viewport-fit=cover');
});
