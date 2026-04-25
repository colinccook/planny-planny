import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { DataTable } from '@cucumber/cucumber'
import { test } from '../../support/fixtures'

const { Given, When, Then } = createBdd(test)

// ── State ────────────────────────────────────────────────────
interface Meal {
  title: string
  description: string
}
let meals: Meal[] = []
let isGuest = false

function resetState() {
  meals = []
  isGuest = false
}

function generateDates(count: number): { dateStr: string; label: string }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: { dateStr: string; label: string }[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${day}`

    let label: string
    if (i === 0) label = 'Today'
    else if (i === 1) label = 'Tomorrow'
    else
      label = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(d)

    result.push({ dateStr, label })
  }
  return result
}

function buildCopyMealHtml(): string {
  const canEdit = !isGuest
  const dates = generateDates(7)

  const mealCards = meals
    .map(
      (meal) => `
    <div class="meal-card" data-testid="meal-card" data-meal="${meal.title}"
         style="padding:12px;background:#ecfdf5;border-radius:8px;margin-bottom:8px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
        <div style="flex:1">
          <p style="font-weight:600;color:#111827;">${meal.title}</p>
          ${meal.description ? `<p style="font-size:14px;color:#6b7280;">${meal.description}</p>` : ''}
        </div>
        ${
          canEdit
            ? `<div style="display:flex;gap:4px;">
            <button data-testid="edit-meal-button" aria-label="Edit ${meal.title}"
              style="padding:6px;border-radius:4px;border:none;background:transparent;color:#9ca3af;cursor:pointer;">
              ✏️
            </button>
            <button data-testid="copy-meal-button" aria-label="Copy ${meal.title}"
              style="padding:6px;border-radius:4px;border:none;background:transparent;color:#9ca3af;cursor:pointer;"
              onclick="openCopyTray('${meal.title}')">
              📋
            </button>
            <button data-testid="delete-meal-button" aria-label="Delete ${meal.title}"
              style="padding:6px;border-radius:4px;border:none;background:transparent;color:#9ca3af;cursor:pointer;">
              🗑️
            </button>
          </div>`
            : ''
        }
      </div>
    </div>`,
    )
    .join('\n')

  const dateOptions = dates
    .map(
      (d, i) => `
    <button data-testid="date-option-${d.dateStr}" class="date-option"
      style="width:100%;text-align:left;padding:10px 12px;border-radius:8px;border:none;
             background:${i === 0 ? '#f9fafb' : '#fff'};cursor:pointer;margin-bottom:6px;
             ${i === 0 ? 'opacity:0.6;' : ''}"
      onclick="selectDate('${d.dateStr}', '${d.label}')" ${i === 0 ? 'disabled' : ''}>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:14px;font-weight:600;color:#111827;">${d.label}</span>
        ${i === 0 ? '<span style="font-size:12px;color:#9ca3af;">Current</span>' : ''}
      </div>
      <p style="margin-top:2px;font-size:12px;color:#9ca3af;">No meals planned</p>
    </button>`,
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui, sans-serif; }
  body { background: #f9fafb; padding: 16px; }
  .copy-tray { display: none; position: fixed; inset: 0; z-index: 50; }
  .copy-tray.open { display: block; }
  .copy-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
  .copy-panel { position: absolute; inset-inline: 0; top: 0; background: #fff; border-radius: 0 0 16px 16px;
                padding: 16px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
  .date-option:hover { background: #f9fafb !important; }
  .date-option.selected { background: #d1fae5 !important; outline: 2px solid #10b981; }
</style>
</head>
<body>
  <h1 style="font-size:20px;font-weight:600;margin-bottom:16px;">Today</h1>
  <div data-testid="meals-list">
    ${mealCards}
  </div>

  <!-- Copy/Move Tray -->
  <div class="copy-tray" data-testid="copy-tray" role="dialog" aria-modal="true">
    <div class="copy-backdrop" data-testid="tray-backdrop" onclick="closeCopyTray()"></div>
    <div class="copy-panel" data-testid="tray-panel">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <h2 style="font-size:18px;font-weight:700;color:#111827;" data-testid="copy-tray-title">📋 Copy</h2>
          <p style="font-size:14px;color:#6b7280;margin-top:2px;">Pick a day to copy this meal to</p>
        </div>
        <button data-testid="tray-close-button" onclick="closeCopyTray()"
          style="padding:8px;border-radius:50%;border:none;background:transparent;color:#9ca3af;cursor:pointer;">
          ✕
        </button>
      </div>

      <!-- Move toggle -->
      <label data-testid="move-toggle" style="display:flex;align-items:center;gap:12px;background:#f9fafb;
             padding:10px 12px;border-radius:8px;margin-bottom:16px;cursor:pointer;">
        <input type="checkbox" data-testid="move-checkbox" onchange="toggleMove(this.checked)"
          style="width:20px;height:20px;" />
        <div>
          <span style="font-size:14px;font-weight:500;color:#111827;">Move</span>
          <p style="font-size:12px;color:#6b7280;">Remove from Today after copying</p>
        </div>
      </label>

      <!-- Date picker list -->
      <div data-testid="date-picker-list" style="max-height:45vh;overflow-y:auto;margin-bottom:16px;">
        ${dateOptions}
      </div>

      <!-- Confirm button -->
      <button data-testid="confirm-copy-button" disabled
        style="width:100%;padding:12px;border-radius:12px;border:none;background:#059669;color:#fff;
               font-size:16px;font-weight:600;cursor:pointer;opacity:0.5;"
        onclick="confirmCopy()">
        Copy to …
      </button>
    </div>
  </div>

  <script>
    let selectedDate = null;
    let selectedLabel = null;
    let isMove = false;
    let copyingMealTitle = '';

    function openCopyTray(mealTitle) {
      copyingMealTitle = mealTitle;
      const tray = document.querySelector('[data-testid="copy-tray"]');
      tray.classList.add('open');
      document.querySelector('[data-testid="copy-tray-title"]').textContent = '📋 Copy "' + mealTitle + '"';
    }

    function closeCopyTray() {
      const tray = document.querySelector('[data-testid="copy-tray"]');
      tray.classList.remove('open');
      selectedDate = null;
      selectedLabel = null;
      isMove = false;
      document.querySelector('[data-testid="move-checkbox"]').checked = false;
      document.querySelectorAll('.date-option').forEach(opt => opt.classList.remove('selected'));
      updateConfirmButton();
    }

    function selectDate(dateStr, label) {
      selectedDate = dateStr;
      selectedLabel = label;
      document.querySelectorAll('.date-option').forEach(opt => {
        opt.classList.remove('selected');
        // Remove any existing selected indicators
        const existing = opt.querySelector('[data-testid="selected-indicator"]');
        if (existing) existing.remove();
      });
      const btn = document.querySelector('[data-testid="date-option-' + dateStr + '"]');
      btn.classList.add('selected');
      // Add selected indicator
      const indicator = document.createElement('span');
      indicator.dataset.testid = 'selected-indicator';
      indicator.style.cssText = 'font-size:12px;font-weight:500;color:#059669;';
      indicator.textContent = '✓ Selected';
      btn.querySelector('div').appendChild(indicator);
      updateConfirmButton();
    }

    function toggleMove(checked) {
      isMove = checked;
      updateConfirmButton();
    }

    function updateConfirmButton() {
      const btn = document.querySelector('[data-testid="confirm-copy-button"]');
      if (selectedDate) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = (isMove ? 'Move to ' : 'Copy to ') + selectedLabel;
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.textContent = (isMove ? 'Move to ' : 'Copy to ') + '…';
      }
    }

    function confirmCopy() {
      closeCopyTray();
    }
  </script>
</body>
</html>`
}

// ── Given steps ──────────────────────────────────────────────

Given(
  'a day detail view with copyable meals:',
  async ({ page }, table: DataTable) => {
    resetState()
    meals = table.hashes().map((row) => ({
      title: row.title,
      description: row.description || '',
    }))
    await page.setContent(buildCopyMealHtml())
  },
)

Given(
  'a day detail view as a guest with copyable meals:',
  async ({ page }, table: DataTable) => {
    resetState()
    isGuest = true
    meals = table.hashes().map((row) => ({
      title: row.title,
      description: row.description || '',
    }))
    await page.setContent(buildCopyMealHtml())
  },
)

// ── When steps ───────────────────────────────────────────────

When(
  'I tap the copy button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(
      `[data-testid="meal-card"][data-meal="${mealTitle}"]`,
    )
    const copyBtn = card.locator('[data-testid="copy-meal-button"]')
    await copyBtn.click()
  },
)

When('I select a target date', async ({ page }) => {
  // Select the second date option (Tomorrow) since first is "Current" / disabled
  const options = page.locator(
    '[data-testid="date-picker-list"] .date-option:not([disabled])',
  )
  await options.first().click()
})

When('I check the move checkbox', async ({ page }) => {
  const checkbox = page.locator('[data-testid="move-checkbox"]')
  await checkbox.check()
})

When('I close the copy tray', async ({ page }) => {
  const closeBtn = page.locator('[data-testid="tray-close-button"]')
  await closeBtn.click()
})

// ── Then steps ───────────────────────────────────────────────

Then(
  'I should see a copy button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(
      `[data-testid="meal-card"][data-meal="${mealTitle}"]`,
    )
    const copyBtn = card.locator('[data-testid="copy-meal-button"]')
    await expect(copyBtn).toBeVisible()
  },
)

Then(
  'I should not see a copy button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(
      `[data-testid="meal-card"][data-meal="${mealTitle}"]`,
    )
    const copyBtn = card.locator('[data-testid="copy-meal-button"]')
    await expect(copyBtn).toHaveCount(0)
  },
)

Then(
  'I should see the copy tray for {string}',
  async ({ page }, mealTitle: string) => {
    const tray = page.locator('[data-testid="copy-tray"]')
    await expect(tray).toBeVisible()
    const title = page.locator('[data-testid="copy-tray-title"]')
    await expect(title).toContainText(mealTitle)
  },
)

Then('I should see a date picker with available days', async ({ page }) => {
  const list = page.locator('[data-testid="date-picker-list"]')
  await expect(list).toBeVisible()
  const options = list.locator('.date-option')
  const count = await options.count()
  expect(count).toBeGreaterThanOrEqual(2)
})

Then('I should see a move checkbox', async ({ page }) => {
  const checkbox = page.locator('[data-testid="move-checkbox"]')
  await expect(checkbox).toBeVisible()
})

Then('the move checkbox should be unchecked', async ({ page }) => {
  const checkbox = page.locator('[data-testid="move-checkbox"]')
  await expect(checkbox).not.toBeChecked()
})

Then('the selected date should be highlighted', async ({ page }) => {
  const selected = page.locator('.date-option.selected')
  await expect(selected).toHaveCount(1)
})

Then(
  'the confirm button should show {string}',
  async ({ page }, expectedText: string) => {
    const btn = page.locator('[data-testid="confirm-copy-button"]')
    await expect(btn).toContainText(expectedText)
  },
)

Then('the copy tray should not be visible', async ({ page }) => {
  const tray = page.locator('[data-testid="copy-tray"]')
  // After closing, it should have display:none (not have 'open' class)
  await expect(tray).not.toHaveClass(/open/)
})
