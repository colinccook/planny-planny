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

// iOS Safari auto-zooms the viewport when a form control with a computed
// font-size below 16px is focused, and the zoom sticks after the keyboard
// closes — see docs/drs/dr-018-mobile-viewport-and-zoom.md.
Then('every form field should render at 16 pixels or larger', async ({ page }) => {
  const fields = page.locator('input, textarea, select');
  const count = await fields.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const fontSize = await fields
      .nth(i)
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
});

Then('no gesture-blocking listeners should be registered', async ({ page }) => {
  const html = await page.content();
  expect(html).not.toContain('gesturestart');
  expect(html).not.toContain('gesturechange');
});

Then('the page should not contain an app header', async ({ page }) => {
  await expect(page.locator('header')).toHaveCount(0);
});

Then('I should not see a plan streak counter', async ({ page }) => {
  await expect(page.getByLabel(/planning streak/)).toHaveCount(0);
});
