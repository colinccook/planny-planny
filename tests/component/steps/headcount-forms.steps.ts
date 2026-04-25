import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { Given, When, Then } = createBdd(test)

// ── Stepper HTML builder ───────────────────────────────────────
// Mirrors the NumberStepper component: − [value] + with data-testid

function buildStepperHtml(id: string, label: string, value: number, min: number, max: number): string {
  const displayValue = Math.max(min, Math.min(max, value))
  return `
    <div>
      <label for="${id}">${label}</label>
      <div style="display:flex;align-items:center;gap:0">
        <button type="button"
          aria-label="Decrease ${label}"
          data-testid="${id}-decrement"
          data-min="${min}"
          ${displayValue <= min ? 'disabled' : ''}
          onclick="stepperChange('${id}', -1)">−</button>
        <span id="${id}" role="status" aria-live="polite"
          aria-label="${label}: ${displayValue}"
          data-testid="${id}-value"
          data-min="${min}" data-max="${max}">${displayValue}</span>
        <button type="button"
          aria-label="Increase ${label}"
          data-testid="${id}-increment"
          data-max="${max}"
          ${displayValue >= max ? 'disabled' : ''}
          onclick="stepperChange('${id}', 1)">+</button>
      </div>
    </div>`
}

const stepperScript = `
<script>
function stepperChange(id, delta) {
  const span = document.getElementById(id);
  const min = parseInt(span.dataset.min);
  const max = parseInt(span.dataset.max);
  let val = parseInt(span.textContent) + delta;
  val = Math.max(min, Math.min(max, val));
  span.textContent = val;
  span.setAttribute('aria-label', span.closest('div').querySelector('label')?.textContent + ': ' + val);
  // Update button states
  const parent = span.parentElement;
  parent.querySelector('[data-testid$="-decrement"]').disabled = (val <= min);
  parent.querySelector('[data-testid$="-increment"]').disabled = (val >= max);
}
</script>`

// ── Day Context Form steps ────────────────────────────────────

function buildDayContextFormHtml(
  householdDefaults: { adults: number; children: number; babies: number },
  existing?: { extra_adults: number; extra_children: number; extra_babies: number }
): string {
  const extraAdults = existing?.extra_adults ?? 0
  const extraChildren = existing?.extra_children ?? 0
  const extraBabies = existing?.extra_babies ?? 0

  return `<!DOCTYPE html>
<html><body>
  <form>
    <label for="event-name">Event</label>
    <input id="event-name" type="text" placeholder="e.g. Mum visiting" />

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${buildStepperHtml('extra-adults', 'Extra adults', extraAdults, -householdDefaults.adults, 99)}
      ${buildStepperHtml('extra-children', 'Extra children', extraChildren, -householdDefaults.children, 99)}
      ${buildStepperHtml('extra-babies', 'Extra babies', extraBabies, -householdDefaults.babies, 99)}
    </div>
  </form>
  ${stepperScript}
</body></html>`
}

Given('the day context form is rendered for a new entry', async ({ page }) => {
  await page.setContent(buildDayContextFormHtml({ adults: 2, children: 1, babies: 0 }))
})

Given(
  'the day context form is rendered with household defaults of {int} adults, {int} children, and {int} babies',
  async ({ page }, adults: number, children: number, babies: number) => {
    await page.setContent(buildDayContextFormHtml({ adults, children, babies }))
  }
)

Given(
  'the day context form is rendered with an existing context of {int} extra adults, {int} extra children, and {int} extra babies',
  async ({ page }, adults: number, children: number, babies: number) => {
    await page.setContent(
      buildDayContextFormHtml({ adults: 2, children: 1, babies: 0 }, {
        extra_adults: adults,
        extra_children: children,
        extra_babies: babies,
      })
    )
  }
)

Then('I should see an extra adults stepper', async ({ page }) => {
  await expect(page.locator('label[for="extra-adults"]')).toBeVisible()
  await expect(page.getByTestId('extra-adults-value')).toBeVisible()
  await expect(page.getByTestId('extra-adults-decrement')).toBeVisible()
  await expect(page.getByTestId('extra-adults-increment')).toBeVisible()
})

Then('I should see an extra children stepper', async ({ page }) => {
  await expect(page.locator('label[for="extra-children"]')).toBeVisible()
  await expect(page.getByTestId('extra-children-value')).toBeVisible()
})

Then('I should see an extra babies stepper', async ({ page }) => {
  await expect(page.locator('label[for="extra-babies"]')).toBeVisible()
  await expect(page.getByTestId('extra-babies-value')).toBeVisible()
})

When('I click the increment button for extra adults', async ({ page }) => {
  await page.getByTestId('extra-adults-increment').click()
})

When('I click the decrement button for extra adults', async ({ page }) => {
  await page.getByTestId('extra-adults-decrement').click()
})

When('I click the decrement button for extra adults {int} times', async ({ page }, times: number) => {
  for (let i = 0; i < times; i++) {
    await page.getByTestId('extra-adults-decrement').click()
  }
})

Then(
  'the extra adults value should be {int}',
  async ({ page }, value: number) => {
    await expect(page.getByTestId('extra-adults-value')).toHaveText(String(value))
  }
)

Then(
  'the extra children value should be {int}',
  async ({ page }, value: number) => {
    await expect(page.getByTestId('extra-children-value')).toHaveText(String(value))
  }
)

Then(
  'the extra babies value should be {int}',
  async ({ page }, value: number) => {
    await expect(page.getByTestId('extra-babies-value')).toHaveText(String(value))
  }
)

Then('the extra adults decrement button should be disabled', async ({ page }) => {
  await expect(page.getByTestId('extra-adults-decrement')).toBeDisabled()
})

Then('the extra adults increment button should be enabled', async ({ page }) => {
  await expect(page.getByTestId('extra-adults-increment')).toBeEnabled()
})

// ── Household Settings steps ──────────────────────────────────

function buildSettingsFormHtml(): string {
  return `<!DOCTYPE html>
<html><body>
  <form>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${buildStepperHtml('settings-adults', 'Default adults', 2, 0, 99)}
      ${buildStepperHtml('settings-children', 'Default children', 0, 0, 99)}
      ${buildStepperHtml('settings-babies', 'Default babies', 0, 0, 99)}
    </div>
  </form>
  ${stepperScript}
</body></html>`
}

function buildCreateHouseholdFormHtml(): string {
  return `<!DOCTYPE html>
<html><body>
  <form>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${buildStepperHtml('default-adults', 'Default adults', 2, 0, 99)}
      ${buildStepperHtml('default-children', 'Default children', 0, 0, 99)}
      ${buildStepperHtml('default-babies', 'Default babies', 0, 0, 99)}
    </div>
  </form>
  ${stepperScript}
</body></html>`
}

Given('the household settings form is rendered for an owner', async ({ page }) => {
  await page.setContent(buildSettingsFormHtml())
})

Given('the create household form is expanded', async ({ page }) => {
  await page.setContent(buildCreateHouseholdFormHtml())
})

Then('I should see a default adults stepper in settings', async ({ page }) => {
  await expect(page.getByTestId('settings-adults-value')).toBeVisible()
  await expect(page.getByTestId('settings-adults-decrement')).toBeVisible()
  await expect(page.getByTestId('settings-adults-increment')).toBeVisible()
})

Then('I should see a default children stepper in settings', async ({ page }) => {
  await expect(page.getByTestId('settings-children-value')).toBeVisible()
})

Then('I should see a default babies stepper in settings', async ({ page }) => {
  await expect(page.getByTestId('settings-babies-value')).toBeVisible()
})

Then(
  'the default babies value should be {int}',
  async ({ page }, value: number) => {
    await expect(page.getByTestId('settings-babies-value')).toHaveText(String(value))
  }
)

Then('I should see a default adults stepper in create form', async ({ page }) => {
  await expect(page.getByTestId('default-adults-value')).toBeVisible()
})

Then('I should see a default children stepper in create form', async ({ page }) => {
  await expect(page.getByTestId('default-children-value')).toBeVisible()
})

Then('I should see a default babies stepper in create form', async ({ page }) => {
  await expect(page.getByTestId('default-babies-value')).toBeVisible()
})

Then(
  'the create form default babies value should be {int}',
  async ({ page }, value: number) => {
    await expect(page.getByTestId('default-babies-value')).toHaveText(String(value))
  }
)

When('I click the settings adults increment button', async ({ page }) => {
  await page.getByTestId('settings-adults-increment').click()
})

When('I click the settings adults decrement button', async ({ page }) => {
  await page.getByTestId('settings-adults-decrement').click()
})

Then(
  'the settings adults value should be {int}',
  async ({ page }, value: number) => {
    await expect(page.getByTestId('settings-adults-value')).toHaveText(String(value))
  }
)

Then('the settings adults decrement button should be disabled', async ({ page }) => {
  await expect(page.getByTestId('settings-adults-decrement')).toBeDisabled()
})
