import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from '../../support/fixtures';

const { Then } = createBdd(test);

/**
 * Outcomes — the headline metric.
 *
 * Heavy data-driven assertions for the outcome tray flow live in the
 * BDD component suite (and Vitest). At the integration level we just
 * need to confirm that:
 *   - the day-detail route (where outcomes live) remains protected
 *     for anonymous visitors,
 *   - the welcome screen renders without crashing whether or not
 *     the public stat RPC has any data, and
 *   - the headline is hidden — not zeroed — on a fresh database.
 */
Then('the successful meals headline should not be visible', async ({ page }) => {
  await expect(page.getByTestId('successful-meals-headline')).toHaveCount(0);
});
