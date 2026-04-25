import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { Given, When, Then } = createBdd(test)

const STORAGE_KEY = 'planny:calendarScroll'
const RETURN_TO_TODAY_THRESHOLD_PX = 800

function buildCalendarHtml(dayCount: number): string {
  const rows = Array.from({ length: dayCount }, (_, i) => i)
    .map(
      (i) => `
      <a class="row" data-testid="day-row-${i}" href="#day-${i}"
         style="display:block;height:80px;background:#fff;border:1px solid #e5e7eb;
                border-radius:12px;margin:8px;padding:12px;color:inherit;
                text-decoration:none;">
        Day ${i}
      </a>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; background: #f9fafb; padding-bottom: 80px; }
    #return-btn { position: fixed; left: 50%; transform: translateX(-50%);
      bottom: 64px; padding: 10px 20px; background: #059669; color: #fff;
      border: none; border-radius: 999px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,.15); }
    #return-btn.hidden { display: none; }
  </style>
</head><body>
  <div id="calendar">${rows}</div>
  <button id="return-btn" class="hidden" data-testid="return-to-today-button">Return to today</button>

  <script>
    const STORAGE_KEY = ${JSON.stringify(STORAGE_KEY)};
    const THRESHOLD = ${RETURN_TO_TODAY_THRESHOLD_PX};
    const btn = document.getElementById('return-btn');

    function update() {
      if (window.scrollY > THRESHOLD) btn.classList.remove('hidden');
      else btn.classList.add('hidden');
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          scrollY: window.scrollY, dayCount: ${dayCount}, savedAt: Date.now(),
        }));
      } catch (_) {}
    }
    window.addEventListener('scroll', update, { passive: true });
    update();

    btn.addEventListener('click', function(){
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
      window.scrollTo({ top: 0, behavior: 'auto' });
      btn.classList.add('hidden');
    });

    // Restore on load if there's a saved snapshot. Keep trying for a
    // couple of frames in case the layout hasn't grown tall enough yet.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.scrollY === 'number') {
          let attempts = 0;
          const tryRestore = function(){
            attempts++;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (max >= parsed.scrollY - 1 || attempts > 30) {
              window.scrollTo(0, Math.min(parsed.scrollY, Math.max(0, max)));
              update();
              return;
            }
            requestAnimationFrame(tryRestore);
          };
          requestAnimationFrame(tryRestore);
        }
      }
    } catch (_) {}
  </script>
</body></html>`
}

// ── Given ───────────────────────────────────────────────────────

Given('I open a page with a stub calendar of {int} days', async ({ page }, count: number) => {
  // Need a real origin (not about:blank) so sessionStorage is accessible.
  // The app dev server returns the SPA shell which includes the same origin
  // we'll be on after setContent.
  await page.goto('/login')
  await page.evaluate(() => {
    try { sessionStorage.clear() } catch { /* noop */ }
  })
  await page.setContent(buildCalendarHtml(count))
})

// ── When ────────────────────────────────────────────────────────

When('I scroll the calendar to {int} pixels', async ({ page }, y: number) => {
  // Make sure the layout has settled enough that the page is actually
  // tall enough to scroll to the target before we try.
  await page.waitForFunction(
    (target) => document.documentElement.scrollHeight - window.innerHeight >= target,
    y,
    { timeout: 2000 },
  )
  await page.evaluate((target) => {
    window.scrollTo(0, target)
    // window.scrollTo() doesn't always dispatch a scroll event
    // synchronously in headless chromium, so trigger one ourselves.
    window.dispatchEvent(new Event('scroll'))
  }, y)
  await page.waitForTimeout(100)
})

When('I click the return-to-today button', async ({ page }) => {
  await page.getByTestId('return-to-today-button').click()
  await page.waitForTimeout(50)
})

// ── Then ────────────────────────────────────────────────────────

Then('I should not see the return-to-today button', async ({ page }) => {
  await expect(page.getByTestId('return-to-today-button')).toBeHidden()
})

Then('I should see the return-to-today button', async ({ page }) => {
  await expect(page.getByTestId('return-to-today-button')).toBeVisible()
})

Then('the calendar should be scrolled to the top', async ({ page }) => {
  const y = await page.evaluate(() => window.scrollY)
  expect(y).toBe(0)
})

Then(
  'the saved calendar scroll position should be {int} pixels',
  async ({ page }, expected: number) => {
    const stored = await page.evaluate(() => {
      const raw = sessionStorage.getItem('planny:calendarScroll')
      return raw ? (JSON.parse(raw) as { scrollY: number }).scrollY : null
    })
    expect(stored).not.toBeNull()
    expect(Math.abs((stored ?? 0) - expected)).toBeLessThanOrEqual(2)
  },
)
