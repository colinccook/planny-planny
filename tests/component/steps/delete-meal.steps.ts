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
let deletedMeals: string[] = []
let isGuest = false

function resetState() {
  meals = []
  deletedMeals = []
  isGuest = false
}

function buildDayDetailHtml(): string {
  const canEdit = !isGuest
  const visibleMeals = meals.filter((m) => !deletedMeals.includes(m.title))

  const mealCards = visibleMeals
    .map(
      (meal) => `
    <div class="meal-card" data-testid="meal-card" data-meal="${meal.title}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:12px;background:#ecfdf5;border-radius:8px;">
        <div style="flex:1">
          <p style="font-weight:600;color:#111827;">${meal.title}</p>
          ${meal.description ? `<p style="font-size:14px;color:#6b7280;">${meal.description}</p>` : ''}
        </div>
        ${
          canEdit
            ? `<div style="display:flex;gap:4px;">
            <button data-testid="edit-meal-button" aria-label="Edit ${meal.title}" style="padding:6px;border-radius:4px;border:none;background:transparent;color:#9ca3af;cursor:pointer;">
              ✏️
            </button>
            <button data-testid="delete-meal-button" aria-label="Delete ${meal.title}" style="padding:6px;border-radius:4px;border:none;background:transparent;color:#9ca3af;cursor:pointer;"
              onclick="this.dataset.confirming === 'true' ? handleConfirmDelete('${meal.title}', this) : handleFirstDelete(this)">
              🗑️
            </button>
          </div>`
            : ''
        }
      </div>
      <div data-testid="delete-confirm-text" style="display:none;margin-top:4px;font-size:12px;color:#ef4444;">
        Tap ✓ again to delete this meal
      </div>
    </div>`
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
  .meal-card { margin-bottom: 8px; }
</style>
</head>
<body>
  <h1 style="font-size:20px;font-weight:600;margin-bottom:16px;">Today</h1>
  <div data-testid="meals-list">
    ${mealCards}
  </div>

  <script>
    function handleFirstDelete(btn) {
      btn.dataset.confirming = 'true';
      btn.textContent = '✓';
      btn.style.background = '#fee2e2';
      btn.style.color = '#dc2626';
      btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('Delete', 'Confirm delete'));

      // Show confirm text
      const card = btn.closest('[data-testid="meal-card"]');
      const confirmText = card.querySelector('[data-testid="delete-confirm-text"]');
      confirmText.style.display = 'block';

      // Add cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.dataset.testid = 'cancel-delete-button';
      cancelBtn.setAttribute('data-testid', 'cancel-delete-button');
      cancelBtn.setAttribute('aria-label', 'Cancel delete');
      cancelBtn.textContent = '✕';
      cancelBtn.style.cssText = 'padding:6px;border-radius:4px;border:none;background:transparent;color:#9ca3af;cursor:pointer;';
      cancelBtn.onclick = function() {
        btn.dataset.confirming = 'false';
        btn.textContent = '🗑️';
        btn.style.background = 'transparent';
        btn.style.color = '#9ca3af';
        btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('Confirm delete', 'Delete'));
        confirmText.style.display = 'none';
        cancelBtn.remove();
      };
      btn.parentElement.appendChild(cancelBtn);
    }

    function handleConfirmDelete(title, btn) {
      const card = btn.closest('[data-testid="meal-card"]');
      card.remove();
    }
  </script>
</body>
</html>`
}

// ── Given steps ──────────────────────────────────────────────

Given(
  'a day detail view with the following meals:',
  async ({ page }, table: DataTable) => {
    resetState()
    meals = table.hashes().map((row) => ({
      title: row.title,
      description: row.description || '',
    }))
    await page.setContent(buildDayDetailHtml())
  }
)

Given(
  'a day detail view as a guest with the following meals:',
  async ({ page }, table: DataTable) => {
    resetState()
    isGuest = true
    meals = table.hashes().map((row) => ({
      title: row.title,
      description: row.description || '',
    }))
    await page.setContent(buildDayDetailHtml())
  }
)

// ── When steps ───────────────────────────────────────────────

When(
  'I tap the delete button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const deleteBtn = card.locator('[data-testid="delete-meal-button"]')
    await deleteBtn.click()
  }
)

When(
  'I tap the delete button on {string} again to confirm',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const deleteBtn = card.locator('[data-testid="delete-meal-button"]')
    await deleteBtn.click()
  }
)

When(
  'I tap the cancel button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const cancelBtn = card.locator('[data-testid="cancel-delete-button"]')
    await cancelBtn.click()
  }
)

// ── Then steps ───────────────────────────────────────────────

Then(
  'I should see a delete button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const deleteBtn = card.locator('[data-testid="delete-meal-button"]')
    await expect(deleteBtn).toBeVisible()
  }
)

Then(
  'I should see an edit button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const editBtn = card.locator('[data-testid="edit-meal-button"]')
    await expect(editBtn).toBeVisible()
  }
)

Then(
  'I should not see a delete button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const deleteBtn = card.locator('[data-testid="delete-meal-button"]')
    await expect(deleteBtn).toHaveCount(0)
  }
)

Then(
  'I should not see an edit button on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const editBtn = card.locator('[data-testid="edit-meal-button"]')
    await expect(editBtn).toHaveCount(0)
  }
)

Then(
  'I should see a confirmation message on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const confirmText = card.locator('[data-testid="delete-confirm-text"]')
    await expect(confirmText).toBeVisible()
  }
)

Then(
  'I should not see a confirmation message on {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const confirmText = card.locator('[data-testid="delete-confirm-text"]')
    await expect(confirmText).not.toBeVisible()
  }
)

Then(
  'the delete button on {string} should show a confirm icon',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    const deleteBtn = card.locator('[data-testid="delete-meal-button"]')
    const label = await deleteBtn.getAttribute('aria-label')
    expect(label).toContain('Confirm delete')
  }
)

Then(
  'the meal {string} should be removed',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    await expect(card).toHaveCount(0)
  }
)

Then(
  'I should still see the meal {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator(`[data-testid="meal-card"][data-meal="${mealTitle}"]`)
    await expect(card).toBeVisible()
  }
)
