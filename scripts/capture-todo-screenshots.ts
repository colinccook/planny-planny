import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'docs', 'screenshots')

// Hand-rolled HTML mock-ups so the screenshots are
// self-contained — they show the new Todo + idea badges and the
// in-day editable todo list at mobile viewport (390×844).
async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  })

  // ── Calendar view with idea + todo badges ───────────────────
  const calendar = await ctx.newPage()
  await calendar.setContent(`<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; }
      body { background: #f9fafb; padding: 12px; padding-bottom: 100px; }
      header { background: #059669; color: white; padding: 14px 16px; margin: -12px -12px 12px; display: flex; align-items: center; gap: 10px; }
      h1 { font-size: 18px; font-weight: 700; flex: 1; }
      .pill { background: #047857; color: white; padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; }
      .day { background: white; padding: 12px; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
      .day-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .day-head h2 { font-size: 16px; color: #111827; font-weight: 700; }
      .day-head .date { font-size: 13px; color: #6b7280; }
      .badge-subtle { background: #ecfdf5; color: #065f46; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1px solid #d1fae5; }
      .meal { font-size: 14px; color: #047857; margin-top: 6px; }
      .empty { font-size: 14px; color: #9ca3af; margin-top: 6px; font-style: italic; }
      .tabbar { position: fixed; left: 0; right: 0; bottom: 0; height: 64px; background: white; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-around; }
      .tab { font-size: 12px; color: #6b7280; }
      .tab.active { color: #059669; }
    </style>
  </head><body>
    <header><h1>Planny Planny</h1><span class="pill">🔥 6</span></header>

    <div class="day">
      <div class="day-head">
        <h2>Today</h2>
        <span class="date">· Sun, Apr 26</span>
        <span class="badge-subtle">✅ 2</span>
        <span class="badge-subtle">💡 1</span>
      </div>
      <div class="meal">Roast chicken</div>
    </div>

    <div class="day">
      <div class="day-head">
        <h2>Tomorrow</h2>
        <span class="date">· Mon, Apr 27</span>
        <span class="badge-subtle">✅ 1</span>
      </div>
      <div class="meal">Leftover roast</div>
    </div>

    <div class="day">
      <div class="day-head">
        <h2>Tue</h2>
        <span class="date">· Apr 28</span>
        <span class="badge-subtle">💡 3</span>
      </div>
      <p class="empty">No meals planned</p>
    </div>

    <div class="day">
      <div class="day-head">
        <h2>Wed</h2>
        <span class="date">· Apr 29</span>
      </div>
      <div class="meal">Chickpea curry</div>
    </div>

    <div class="tabbar">
      <div class="tab active">📅 Calendar</div>
      <div class="tab">🥕 Cupboard</div>
      <div class="tab">⚙️ Settings</div>
    </div>
  </body></html>`)
  await calendar.waitForTimeout(200)
  await calendar.screenshot({
    path: path.join(outDir, 'todo-ideas-badges-calendar.png'),
  })
  console.log('✓ todo-ideas-badges-calendar')

  // ── Day detail view with editable todo list ─────────────────
  const day = await ctx.newPage()
  await day.setContent(`<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; }
      body { background: #f9fafb; }
      header { background: #059669; color: white; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
      header .back { font-size: 18px; }
      h1 { font-size: 18px; font-weight: 700; flex: 1; }
      .body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
      .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .pill-people { background: #f3f4f6; padding: 5px 10px; border-radius: 999px; font-size: 13px; color: #374151; }
      .badge-subtle { background: #ecfdf5; color: #065f46; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1px solid #d1fae5; }
      .todos { background: rgba(236,253,245,.4); border: 1px solid #d1fae5; padding: 12px; border-radius: 14px; }
      .todos h4 { font-size: 11px; color: #047857; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; font-weight: 700; }
      .todo { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #d1fae5; padding: 9px 12px; border-radius: 10px; margin-bottom: 6px; }
      .check { width: 22px; height: 22px; border: 2px solid #d1d5db; border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: transparent; font-weight: 700; }
      .check.done { background: #059669; border-color: #059669; color: white; }
      .text { flex: 1; font-size: 14px; color: #111827; }
      .text.done { color: #9ca3af; text-decoration: line-through; }
      .private-pill { background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; margin-left: 6px; vertical-align: middle; }
      .roll-pill { color: #9ca3af; font-size: 10px; text-transform: uppercase; margin-left: 6px; }
      .x { color: #d1d5db; font-size: 16px; padding: 2px 6px; }
      .add-row { display: flex; gap: 8px; margin-top: 8px; }
      .add-row input { flex: 1; padding: 9px 12px; border: 1px solid #a7f3d0; border-radius: 10px; font-size: 14px; background: white; }
      .add-row button { background: #059669; color: white; padding: 9px 18px; border: 0; border-radius: 10px; font-weight: 600; font-size: 14px; }
      .checkbox-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4b5563; margin-top: 6px; }
      .section-title { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin-top: 4px; }
      .meal { background: #ecfdf5; border-radius: 10px; padding: 12px; }
      .meal h3 { font-size: 15px; color: #064e3b; }
      .meal p { font-size: 13px; color: #047857; margin-top: 2px; }
    </style>
  </head><body>
    <header><span class="back">←</span><h1>Today · Sun, Apr 26</h1></header>
    <div class="body">
      <div class="row">
        <span class="pill-people">2🧑 1🧒</span>
        <span class="badge-subtle">✅ 3</span>
        <span class="badge-subtle">💡 1</span>
      </div>

      <div class="todos">
        <h4>✅ Todo</h4>
        <div class="todo">
          <div class="check"></div>
          <div class="text">Defrost chicken<span class="roll-pill">rolled</span></div>
          <div class="x">×</div>
        </div>
        <div class="todo">
          <div class="check"></div>
          <div class="text">Buy bread<span class="private-pill">Private</span></div>
          <div class="x">×</div>
        </div>
        <div class="todo">
          <div class="check done">✓</div>
          <div class="text done">Take bins out</div>
          <div class="x">×</div>
        </div>
        <div class="add-row">
          <input placeholder="Add a todo…" />
          <button>Add</button>
        </div>
        <label class="checkbox-row"><input type="checkbox" /> Just for me (private)</label>
      </div>

      <div class="section-title">Meals</div>
      <div class="meal"><h3>Roast chicken</h3><p>Potatoes · Carrots · Gravy</p></div>
    </div>
  </body></html>`)
  await day.waitForTimeout(200)
  await day.screenshot({
    path: path.join(outDir, 'todo-list-day-view.png'),
  })
  console.log('✓ todo-list-day-view')

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
