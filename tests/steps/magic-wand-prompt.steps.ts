import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../support/fixtures'

const { Given, When, Then } = createBdd(test)

// ── State ────────────────────────────────────────────────────
interface HouseholdState {
  adults: number
  children: number
  babies: number
}
interface EventState {
  name: string
  extraAdults: number
}

let household: HouseholdState = { adults: 2, children: 0, babies: 0 }
let dateLabel = 'Monday, 14 April'
let dayTheme: string | null = null
let event: EventState | null = null
let suggestedIngredients: string[] = []
let isGuest = false
let hasMeals = true

function resetState() {
  household = { adults: 2, children: 0, babies: 0 }
  dateLabel = 'Monday, 14 April'
  dayTheme = null
  event = null
  suggestedIngredients = []
  isGuest = false
  hasMeals = true
}

function buildPromptText(): string {
  const totalAdults = household.adults + (event?.extraAdults ?? 0)
  const lines: string[] = []

  lines.push(`I need a meal idea for ${dateLabel}.`)
  lines.push('')

  const parts: string[] = []
  if (totalAdults > 0) parts.push(`${totalAdults} adult${totalAdults !== 1 ? 's' : ''}`)
  if (household.children > 0) parts.push(`${household.children} child${household.children !== 1 ? 'ren' : ''}`)
  if (household.babies > 0) parts.push(`${household.babies} weaning bab${household.babies !== 1 ? 'ies' : 'y'}`)
  lines.push(`I'm cooking for ${parts.join(', ')}.`)

  if (event) {
    lines.push(`There's an event on this day: ${event.name}.`)
  }

  if (dayTheme) {
    lines.push(`The theme for this day is "${dayTheme}" — please take this into consideration.`)
  }

  lines.push('')
  lines.push('I want something easy that takes under 30 minutes to prepare.')
  lines.push('')
  lines.push('Please keep the meal healthy and whole-ingredient based. Prioritise flavour that is appropriate for children.')
  if (household.babies > 0) {
    lines.push('Include guidance on what a weaning baby could have from this meal (soft textures, no added salt/sugar, age-appropriate portions).')
  }

  if (suggestedIngredients.length > 0) {
    lines.push('')
    lines.push(`You can include these ingredients as a priority: ${suggestedIngredients.join(', ')}.`)
    lines.push('But any other whole ingredients can be used too, so long as they are appropriate for the household members at the time.')
  }

  lines.push('')
  lines.push('Please suggest 2–3 meal ideas with a brief description and key ingredients for each.')

  return lines.join('\n')
}

function buildPageHtml(opts: { trayOpen: boolean } = { trayOpen: false }): string {
  const canEdit = !isGuest
  const promptText = buildPromptText()

  const themeHtml = dayTheme
    ? `<label data-testid="theme-toggle" style="display:flex;align-items:center;gap:8px;font-size:14px;color:#374151;">
        <input type="checkbox" checked data-testid="theme-checkbox"
          onchange="handleThemeToggle(this)" />
        Include day theme: &ldquo;${dayTheme}&rdquo;
      </label>`
    : ''

  const ingredientsNote = suggestedIngredients.length > 0
    ? `<p style="font-size:12px;color:#6b7280;margin-top:4px;">Suggesting: ${suggestedIngredients.join(', ')}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui, sans-serif; }
  body { background: #f9fafb; padding: 16px; }
  .empty { text-align: center; padding: 32px 0; }
  .empty p { color: #9ca3af; }
  .wand-btn { margin-top: 16px; display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; background: #faf5ff; color: #7e22ce; font-size: 14px; font-weight: 500; border: none; cursor: pointer; }
  .tray-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50; }
  .tray-backdrop.open { display: block; }
  .tray { display: none; position: fixed; top: 0; left: 0; right: 0; max-height: 90vh; background: white; border-radius: 0 0 16px 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); z-index: 51; padding: 16px; overflow-y: auto; }
  .tray.open { display: block; }
  .tray h2 { font-size: 18px; font-weight: 700; color: #111827; }
  .tray .desc { font-size: 14px; color: #6b7280; margin-top: 4px; }
  .toggle-group { display: flex; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 8px; }
  .toggle-btn { flex: 1; padding: 8px 12px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; background: white; color: #4b5563; }
  .toggle-btn.active { background: #059669; color: white; }
  .toggle-btn:first-child { border-radius: 8px 0 0 8px; }
  .toggle-btn:last-child { border-radius: 0 8px 8px 0; }
  textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 14px; color: #374151; resize: vertical; margin-top: 8px; }
  .copy-btn { width: 100%; padding: 12px; border-radius: 8px; background: #059669; color: white; font-size: 14px; font-weight: 600; border: none; cursor: pointer; margin-top: 12px; }
  .copy-btn.copied { background: #d1fae5; color: #047857; }
  label { font-size: 12px; font-weight: 600; color: #4b5563; display: block; margin-top: 12px; }
</style>
</head>
<body>
  <h1 style="font-size:20px;font-weight:600;margin-bottom:16px;">${dateLabel}</h1>

  ${!hasMeals ? `
  <div class="empty">
    <p>No meals planned yet</p>
    ${canEdit ? `<button class="wand-btn" data-testid="magic-wand-button" onclick="openTray()">
      <span style="font-size:18px;">🪄</span> Get AI meal suggestions
    </button>` : ''}
  </div>
  ` : ''}

  <div class="tray-backdrop ${opts.trayOpen ? 'open' : ''}" data-testid="tray-backdrop" onclick="closeTray()"></div>
  <div class="tray ${opts.trayOpen ? 'open' : ''}" data-testid="ai-prompt-tray" role="dialog" aria-modal="true">
    <h2>🪄 AI Meal Suggestions</h2>
    <p class="desc">Generate a prompt to get meal ideas from AI</p>

    <div data-testid="meal-prompt-generator" style="margin-top:12px;">
      <p style="font-size:14px;color:#6b7280;">
        This creates a prompt you can paste into ChatGPT or another AI assistant to get
        meal suggestions tailored to your household.
      </p>

      <label style="margin-top:12px;">How much time do you have?</label>
      <div class="toggle-group" data-testid="complexity-toggle">
        <button class="toggle-btn active" data-testid="complexity-easy" onclick="setComplexity('easy', this)">⚡ Easy (under 30 min)</button>
        <button class="toggle-btn" data-testid="complexity-complicated" onclick="setComplexity('complicated', this)">👨‍🍳 Involved (30+ min)</button>
      </div>

      ${themeHtml}
      ${ingredientsNote}

      <label style="margin-top:12px;">Your AI prompt</label>
      <textarea rows="10" data-testid="prompt-textarea">${promptText}</textarea>

      <button class="copy-btn" data-testid="copy-prompt-button" onclick="copyPrompt(this)">📋 Copy prompt to clipboard</button>
    </div>
  </div>

  <script>
    function openTray() {
      document.querySelector('.tray-backdrop').classList.add('open');
      document.querySelector('.tray').classList.add('open');
    }
    function closeTray() {
      document.querySelector('.tray-backdrop').classList.remove('open');
      document.querySelector('.tray').classList.remove('open');
    }
    function setComplexity(level, btn) {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ta = document.querySelector('[data-testid="prompt-textarea"]');
      let text = ta.value;
      if (level === 'easy') {
        text = text.replace(/I have more time, so the recipe can be more involved \\(over 30 minutes is fine\\)\\./, 'I want something easy that takes under 30 minutes to prepare.');
        text = text.replace('I have more time, so the recipe can be more involved (over 30 minutes is fine).', 'I want something easy that takes under 30 minutes to prepare.');
      } else {
        text = text.replace('I want something easy that takes under 30 minutes to prepare.', 'I have more time, so the recipe can be more involved (over 30 minutes is fine).');
      }
      ta.value = text;
    }
    function handleThemeToggle(cb) {
      const ta = document.querySelector('[data-testid="prompt-textarea"]');
      let text = ta.value;
      const themeLine = 'The theme for this day is "${dayTheme}" — please take this into consideration.';
      if (!cb.checked) {
        text = text.replace(themeLine + '\\n', '');
        text = text.replace(themeLine, '');
      } else {
        const lines = text.split('\\n');
        const eventIdx = lines.findIndex(l => l.startsWith("There's an event"));
        const insertIdx = eventIdx >= 0 ? eventIdx + 1 : lines.findIndex(l => l === '') + 1;
        lines.splice(insertIdx, 0, themeLine);
        text = lines.join('\\n');
      }
      ta.value = text;
    }
    function copyPrompt(btn) {
      const ta = document.querySelector('[data-testid="prompt-textarea"]');
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(ta.value).catch(() => {});
        }
      } catch(e) {}
      // Show toast
      const toast = document.createElement('div');
      toast.setAttribute('role', 'status');
      toast.setAttribute('data-testid', 'toast');
      toast.textContent = 'Copied prompt to clipboard';
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:8px 16px;border-radius:8px;z-index:50;';
      document.body.appendChild(toast);
    }
  </script>
</body>
</html>`
}

// ── Given steps ──────────────────────────────────────────────

Given(
  'a household with {int} adults, {int} child, and {int} baby',
  // eslint-disable-next-line no-empty-pattern
  async ({}, adults: number, children: number, babies: number) => {
    resetState()
    household = { adults, children, babies }
  }
)

Given('the date is {string}', // eslint-disable-next-line no-empty-pattern
  async ({}, label: string) => {
    dateLabel = label
  }
)

Given('the day has no meals planned', async () => {
  hasMeals = false
})

Given('the day has a theme {string}', // eslint-disable-next-line no-empty-pattern
  async ({}, theme: string) => {
    dayTheme = theme
  }
)

Given(
  'the day has an event {string} with {int} extra adults',
  // eslint-disable-next-line no-empty-pattern
  async ({}, eventName: string, extraAdults: number) => {
    event = { name: eventName, extraAdults }
  }
)

Given(
  'there are suggested ingredients {string}',
  // eslint-disable-next-line no-empty-pattern
  async ({}, ingredientList: string) => {
    suggestedIngredients = ingredientList.split(', ').map((s) => s.trim())
  }
)

Given('the user is a guest', async () => {
  isGuest = true
})

// ── When steps ───────────────────────────────────────────────

When('I view the day detail', async ({ page }) => {
  await page.setContent(buildPageHtml())
})

When('I tap the magic wand button', async ({ page }) => {
  const wand = page.locator('[data-testid="magic-wand-button"]')
  await wand.click()
})

When('I select the complicated option', async ({ page }) => {
  const btn = page.locator('[data-testid="complexity-complicated"]')
  await btn.click()
})

When('I uncheck the theme checkbox', async ({ page }) => {
  const checkbox = page.locator('[data-testid="theme-checkbox"]')
  await checkbox.uncheck()
})

When('I edit the prompt to say {string}', async ({ page }, text: string) => {
  const textarea = page.locator('[data-testid="prompt-textarea"]')
  await textarea.fill(text)
})

When('I tap the copy button', async ({ page }) => {
  // Grant clipboard permission
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  const btn = page.locator('[data-testid="copy-prompt-button"]')
  await btn.click()
})

// ── Then steps ───────────────────────────────────────────────

Then('I should see the magic wand button', async ({ page }) => {
  const wand = page.locator('[data-testid="magic-wand-button"]')
  await expect(wand).toBeVisible()
})

Then('I should not see the magic wand button', async ({ page }) => {
  const wand = page.locator('[data-testid="magic-wand-button"]')
  await expect(wand).toHaveCount(0)
})

Then('I should see the AI prompt tray', async ({ page }) => {
  const tray = page.locator('[data-testid="ai-prompt-tray"]')
  await expect(tray).toBeVisible()
})

Then('the prompt should mention {string}', async ({ page }, text: string) => {
  const textarea = page.locator('[data-testid="prompt-textarea"]')
  const value = await textarea.inputValue()
  expect(value).toContain(text)
})

Then('the prompt should not mention {string}', async ({ page }, text: string) => {
  const textarea = page.locator('[data-testid="prompt-textarea"]')
  const value = await textarea.inputValue()
  expect(value).not.toContain(text)
})

Then('the easy option should be selected', async ({ page }) => {
  const btn = page.locator('[data-testid="complexity-easy"]')
  const classes = await btn.getAttribute('class')
  expect(classes).toContain('active')
})

Then('the complicated option should be selected', async ({ page }) => {
  const btn = page.locator('[data-testid="complexity-complicated"]')
  const classes = await btn.getAttribute('class')
  expect(classes).toContain('active')
})

Then('the theme checkbox should be checked', async ({ page }) => {
  const checkbox = page.locator('[data-testid="theme-checkbox"]')
  await expect(checkbox).toBeChecked()
})

Then('the prompt textarea should contain {string}', async ({ page }, text: string) => {
  const textarea = page.locator('[data-testid="prompt-textarea"]')
  const value = await textarea.inputValue()
  expect(value).toContain(text)
})

Then('a toast should show {string}', async ({ page }, text: string) => {
  const toast = page.locator('[data-testid="toast"]')
  await expect(toast).toBeVisible()
  await expect(toast).toContainText(text)
})
