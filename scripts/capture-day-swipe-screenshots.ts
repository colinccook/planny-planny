import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'docs', 'screenshots')

// These are visual mock-ups of the new behaviour rendered with hand-rolled
// HTML so the screenshots are self-contained and reproducible without a
// running Supabase backend. They render at the same mobile viewport
// (390×844) the rest of the docs use.
async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  })

  // ── Day view with swipe affordance ────────────────────────────
  const dayPage = await ctx.newPage()
  await dayPage.setContent(`<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; }
      body { background: #f9fafb; }
      header { background: #059669; color: white; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
      header .back { font-size: 18px; }
      h1 { font-size: 18px; font-weight: 700; }
      .day { padding: 16px; transform: translateX(-30px); transition: transform 200ms; }
      .badge { display: inline-flex; align-items: center; gap: 6px; background: #f3f4f6; padding: 6px 10px; border-radius: 999px; font-size: 13px; color: #374151; margin-bottom: 12px; }
      .section-title { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin: 16px 0 8px; }
      .meal { background: #ecfdf5; border-radius: 10px; padding: 12px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
      .meal h3 { font-size: 15px; color: #064e3b; }
      .meal p { font-size: 13px; color: #047857; margin-top: 2px; }
      .ghost { position: absolute; right: -380px; top: 0; width: 360px; opacity: .5; }
      .swipe-hint { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(17,24,39,.8); color: white; padding: 8px 14px; border-radius: 999px; font-size: 13px; }
    </style>
  </head><body>
    <header><span class="back">←</span><h1>Mon, April 20</h1></header>
    <div class="day">
      <div class="badge">👨‍👩‍👧 2 adults · 1 child</div>
      <div class="section-title">Meal plans</div>
      <div class="meal"><h3>Chicken fajitas</h3><p>Onion · Pepper · Lime</p></div>
      <div class="meal"><h3>Salad with halloumi</h3><p>Tomato · Cucumber</p></div>
    </div>
    <div class="swipe-hint">← Swipe to next day · Swipe to previous day →</div>
  </body></html>`)
  await dayPage.waitForTimeout(300)
  await dayPage.screenshot({ path: path.join(outDir, 'day-swipe-mobile.png') })
  console.log('✓ day-swipe-mobile')

  // ── Return to today button ────────────────────────────────────
  const returnPage = await ctx.newPage()
  await returnPage.setContent(`<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; }
      body { background: #f9fafb; padding: 12px; padding-bottom: 100px; }
      header { background: #059669; color: white; padding: 14px 16px; margin: -12px -12px 12px; }
      h1 { font-size: 18px; font-weight: 700; }
      .day { background: white; padding: 12px; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
      .day h2 { font-size: 14px; color: #6b7280; font-weight: 600; }
      .day .name { font-size: 16px; color: #111827; font-weight: 700; margin: 4px 0; }
      .day .meal { font-size: 14px; color: #047857; }
      .return-btn { position: fixed; left: 50%; bottom: 80px; transform: translateX(-50%); background: #059669; color: white; padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: 14px; box-shadow: 0 8px 24px rgba(0,0,0,.2); display: flex; align-items: center; gap: 6px; }
      .tabbar { position: fixed; left: 0; right: 0; bottom: 0; height: 64px; background: white; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-around; }
      .tab { font-size: 12px; color: #6b7280; }
      .tab.active { color: #059669; }
    </style>
  </head><body>
    <header><h1>Planny Planny 🔥 6</h1></header>
    <div class="day"><h2>Tue · May 5</h2><div class="name">Roast lamb</div><div class="meal">+ 1 idea</div></div>
    <div class="day"><h2>Wed · May 6</h2><div class="name">Pasta night</div></div>
    <div class="day"><h2>Thu · May 7</h2><div class="name">Stir fry</div></div>
    <div class="day"><h2>Fri · May 8</h2><div class="name">Pizza</div></div>
    <div class="day"><h2>Sat · May 9</h2><div class="name">Curry</div></div>
    <div class="day"><h2>Sun · May 10</h2><div class="name">Sunday roast</div></div>
    <div class="return-btn">↑ Return to today</div>
    <div class="tabbar">
      <div class="tab active">📅 Calendar</div>
      <div class="tab">🥕 Ingredients</div>
      <div class="tab">⚙️ Settings</div>
    </div>
  </body></html>`)
  await returnPage.waitForTimeout(300)
  await returnPage.screenshot({ path: path.join(outDir, 'return-to-today-mobile.png') })
  console.log('✓ return-to-today-mobile')

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
