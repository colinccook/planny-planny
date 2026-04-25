import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../support/fixtures'

const { Given, When, Then } = createBdd(test)

// ── Helpers ─────────────────────────────────────────────────────

function buildPagerHtml(initialDate: string, mealCount = 0): string {
  const meals = Array.from({ length: mealCount }, (_, i) => i + 1)
  const mealsHtml = meals
    .map(
      (n) => `
        <div class="meal" data-meal-card="true" data-meal-id="meal-${n}"
             data-testid="meal-card-${n}"
             style="height:60px;background:#ecfdf5;border:1px solid #d1fae5;
                    border-radius:8px;padding:8px;margin:8px;">Meal ${n}</div>`,
    )
    .join('')

  // The pager mimics the production behaviour:
  //  - finger-following translateX
  //  - threshold 70px
  //  - swipes inside [data-meal-card] don't change day; instead they
  //    mark the next/prev meal as "active"
  return `<!DOCTYPE html>
<html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; }
    #pager { position: relative; min-height: 100vh; touch-action: pan-y;
             will-change: transform; }
    #date-label { padding: 16px; font-weight: bold; font-size: 18px; }
    .meal.active { outline: 2px solid #10b981; }
  </style>
</head><body>
  <div id="pager" data-testid="day-swipe-container">
    <div id="date-label" data-testid="day-date-label">${initialDate}</div>
    ${mealsHtml}
  </div>

  <script>
    const THRESHOLD = 70;
    const VERTICAL_RATIO = 0.7;
    const LOCK = 8;
    const pager = document.getElementById('pager');
    const dateLabel = document.getElementById('date-label');

    function getAdjacent(dateStr, offset) {
      const [y,m,d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m-1, d);
      dt.setDate(dt.getDate() + offset);
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth()+1).padStart(2,'0');
      const dd = String(dt.getDate()).padStart(2,'0');
      return yy + '-' + mm + '-' + dd;
    }

    let active = false, sx=0, sy=0, lx=0, mode='pending', target='day', mealEl=null;

    function findMealAncestor(node) {
      let cur = node;
      while (cur && cur !== pager) {
        if (cur.dataset && cur.dataset.mealCard === 'true') return cur;
        cur = cur.parentElement;
      }
      return null;
    }

    pager.addEventListener('touchstart', function(e){
      if (e.touches.length !== 1) return;
      active = true; mode = 'pending'; target = 'day'; mealEl = null;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; lx = sx;
      const m = findMealAncestor(e.target);
      if (m) { target = 'meal'; mealEl = m; }
    }, { passive: true });

    pager.addEventListener('touchmove', function(e){
      if (!active || e.touches.length !== 1) return;
      const t = e.touches[0]; lx = t.clientX;
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (mode === 'pending') {
        if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
        if (Math.abs(dy) > Math.abs(dx) * VERTICAL_RATIO && Math.abs(dy) > Math.abs(dx)) {
          mode = 'vertical';
        } else if (Math.abs(dx) > Math.abs(dy)) {
          mode = 'horizontal';
        } else { return; }
      }
      if (mode === 'horizontal' && target === 'day') {
        pager.style.transform = 'translate3d(' + dx + 'px,0,0)';
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });

    pager.addEventListener('touchend', function(){
      if (!active) return;
      const dx = lx - sx;
      pager.style.transition = 'transform 220ms';
      pager.style.transform = 'translate3d(0,0,0)';
      setTimeout(function(){ pager.style.transition = ''; }, 230);

      if (mode === 'horizontal' && Math.abs(dx) >= THRESHOLD) {
        if (target === 'day') {
          const offset = dx < 0 ? 1 : -1;
          dateLabel.textContent = getAdjacent(dateLabel.textContent, offset);
        } else if (target === 'meal' && mealEl) {
          const meals = Array.from(document.querySelectorAll('[data-meal-card="true"]'));
          const idx = meals.indexOf(mealEl);
          const targetIdx = dx < 0 ? idx + 1 : idx - 1;
          const next = meals[targetIdx] || meals[idx];
          meals.forEach(function(el){ el.classList.remove('active'); });
          next.classList.add('active');
        }
      } else {
        // tiny / non-horizontal — make sure no meal stays "active" from
        // a previous attempt? Actually leave active state untouched.
      }
      active = false;
    });
  </script>
</body></html>`
}

async function dispatchSwipe(
  page: import('@playwright/test').Page,
  selector: string,
  dx: number,
  dy: number,
) {
  const handle = page.locator(selector)
  const box = await handle.boundingBox()
  if (!box) throw new Error('Element ' + selector + ' has no bounding box')
  const x = box.x + Math.min(box.width / 2, 100)
  const y = box.y + Math.min(box.height / 2, 30)

  // Walk through several touchmove events so the pager's direction-lock
  // kicks in the same way it would on a real device.
  await handle.dispatchEvent('touchstart', {
    touches: [{ clientX: x, clientY: y, identifier: 0 }],
  })
  const steps = 6
  for (let i = 1; i <= steps; i++) {
    const fx = x + (dx * i) / steps
    const fy = y + (dy * i) / steps
    await handle.dispatchEvent('touchmove', {
      touches: [{ clientX: fx, clientY: fy, identifier: 0 }],
    })
  }
  await handle.dispatchEvent('touchend', {
    changedTouches: [{ clientX: x + dx, clientY: y + dy, identifier: 0 }],
  })
  await page.waitForTimeout(50)
}

// ── Given ───────────────────────────────────────────────────────

Given(
  'I open a page with a swipeable day pager on {string}',
  async ({ page }, date: string) => {
    await page.setContent(buildPagerHtml(date, 0))
  },
)

Given(
  'I open a page with a swipeable day pager on {string} with {int} meals',
  async ({ page }, date: string, mealCount: number) => {
    await page.setContent(buildPagerHtml(date, mealCount))
  },
)

// ── When ────────────────────────────────────────────────────────

When('I swipe left across the day content', async ({ page }) => {
  await dispatchSwipe(page, '[data-testid="day-swipe-container"]', -180, 0)
})

When('I swipe right across the day content', async ({ page }) => {
  await dispatchSwipe(page, '[data-testid="day-swipe-container"]', 180, 0)
})

When('I do a tiny horizontal nudge across the day content', async ({ page }) => {
  await dispatchSwipe(page, '[data-testid="day-swipe-container"]', 20, 0)
})

When('I drag vertically across the day content', async ({ page }) => {
  await dispatchSwipe(page, '[data-testid="day-swipe-container"]', 0, 200)
})

When('I swipe left on the first meal card', async ({ page }) => {
  await dispatchSwipe(page, '[data-testid="meal-card-1"]', -180, 0)
})

When('I swipe right on the first meal card', async ({ page }) => {
  await dispatchSwipe(page, '[data-testid="meal-card-1"]', 180, 0)
})

// ── Then ────────────────────────────────────────────────────────

Then('the pager should show {string}', async ({ page }, date: string) => {
  await expect(page.getByTestId('day-date-label')).toHaveText(date)
})

Then(
  'the {word} meal card should be the active meal',
  async ({ page }, ordinal: string) => {
    const map: Record<string, number> = { first: 1, second: 2, third: 3 }
    const idx = map[ordinal]
    if (!idx) throw new Error('Unknown ordinal: ' + ordinal)
    await expect(page.getByTestId('meal-card-' + idx)).toHaveClass(/active/)
  },
)
