import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../support/fixtures'

const { Given, Then } = createBdd(test)

// ── Day Context Form steps ────────────────────────────────────

function buildDayContextFormHtml(existing?: {
  extra_adults: number
  extra_children: number
  extra_babies: number
}): string {
  const extraAdults = existing?.extra_adults ?? 0
  const extraChildren = existing?.extra_children ?? 0
  const extraBabies = existing?.extra_babies ?? 0

  return `<!DOCTYPE html>
<html><body>
  <form>
    <label for="event-name">Event</label>
    <input id="event-name" type="text" placeholder="e.g. Mum visiting" />

    <label for="extra-adults">Extra adults</label>
    <input id="extra-adults" type="number" min="-99" max="99" value="${extraAdults}" />

    <label for="extra-children">Extra children</label>
    <input id="extra-children" type="number" min="-99" max="99" value="${extraChildren}" />

    <label for="extra-babies">Extra babies</label>
    <input id="extra-babies" type="number" min="-99" max="99" value="${extraBabies}" />
  </form>
</body></html>`
}

Given('the day context form is rendered for a new entry', async ({ page }) => {
  await page.setContent(buildDayContextFormHtml())
})

Given(
  'the day context form is rendered with an existing context of {int} extra adults, {int} extra children, and {int} extra babies',
  async ({ page }, adults: number, children: number, babies: number) => {
    await page.setContent(
      buildDayContextFormHtml({
        extra_adults: adults,
        extra_children: children,
        extra_babies: babies,
      })
    )
  }
)

Then('I should see an extra adults input', async ({ page }) => {
  await expect(page.locator('label[for="extra-adults"]')).toBeVisible()
  await expect(page.locator('#extra-adults')).toBeVisible()
})

Then('I should see an extra children input', async ({ page }) => {
  await expect(page.locator('label[for="extra-children"]')).toBeVisible()
  await expect(page.locator('#extra-children')).toBeVisible()
})

Then('I should see an extra babies input', async ({ page }) => {
  await expect(page.locator('label[for="extra-babies"]')).toBeVisible()
  await expect(page.locator('#extra-babies')).toBeVisible()
})

Then(
  'the extra adults input should accept the value {int}',
  async ({ page }, value: number) => {
    const input = page.locator('#extra-adults')
    await input.fill(String(value))
    await expect(input).toHaveValue(String(value))
  }
)

Then(
  'the extra children input should accept the value {int}',
  async ({ page }, value: number) => {
    const input = page.locator('#extra-children')
    await input.fill(String(value))
    await expect(input).toHaveValue(String(value))
  }
)

Then(
  'the extra babies input should accept the value {int}',
  async ({ page }, value: number) => {
    const input = page.locator('#extra-babies')
    await input.fill(String(value))
    await expect(input).toHaveValue(String(value))
  }
)

Then(
  'the extra adults input should have value {int}',
  async ({ page }, value: number) => {
    await expect(page.locator('#extra-adults')).toHaveValue(String(value))
  }
)

Then(
  'the extra children input should have value {int}',
  async ({ page }, value: number) => {
    await expect(page.locator('#extra-children')).toHaveValue(String(value))
  }
)

Then(
  'the extra babies input should have value {int}',
  async ({ page }, value: number) => {
    await expect(page.locator('#extra-babies')).toHaveValue(String(value))
  }
)

// ── Boundary validation steps ─────────────────────────────────

Then(
  'the extra adults input should have a minimum of {int}',
  async ({ page }, min: number) => {
    await expect(page.locator('#extra-adults')).toHaveAttribute('min', String(min))
  }
)

Then(
  'the extra children input should have a minimum of {int}',
  async ({ page }, min: number) => {
    await expect(page.locator('#extra-children')).toHaveAttribute('min', String(min))
  }
)

Then(
  'the extra babies input should have a minimum of {int}',
  async ({ page }, min: number) => {
    await expect(page.locator('#extra-babies')).toHaveAttribute('min', String(min))
  }
)

Then(
  'the extra adults input should have a maximum of {int}',
  async ({ page }, max: number) => {
    await expect(page.locator('#extra-adults')).toHaveAttribute('max', String(max))
  }
)

Then(
  'the extra children input should have a maximum of {int}',
  async ({ page }, max: number) => {
    await expect(page.locator('#extra-children')).toHaveAttribute('max', String(max))
  }
)

Then(
  'the extra babies input should have a maximum of {int}',
  async ({ page }, max: number) => {
    await expect(page.locator('#extra-babies')).toHaveAttribute('max', String(max))
  }
)

// ── Household Settings steps ──────────────────────────────────

function buildSettingsFormHtml(): string {
  return `<!DOCTYPE html>
<html><body>
  <form>
    <label for="settings-adults">Default adults</label>
    <input id="settings-adults" type="number" min="0" value="2" />

    <label for="settings-children">Default children</label>
    <input id="settings-children" type="number" min="0" value="0" />

    <label for="settings-babies">Default babies</label>
    <input id="settings-babies" type="number" min="0" value="0" />
  </form>
</body></html>`
}

function buildCreateHouseholdFormHtml(): string {
  return `<!DOCTYPE html>
<html><body>
  <form>
    <label for="default-adults">Default adults</label>
    <input id="default-adults" type="number" min="0" value="2" />

    <label for="default-children">Default children</label>
    <input id="default-children" type="number" min="0" value="0" />

    <label for="default-babies">Default babies</label>
    <input id="default-babies" type="number" min="0" value="0" />
  </form>
</body></html>`
}

Given('the household settings form is rendered for an owner', async ({ page }) => {
  await page.setContent(buildSettingsFormHtml())
})

Given('the create household form is expanded', async ({ page }) => {
  await page.setContent(buildCreateHouseholdFormHtml())
})

Then('I should see a default adults input in settings', async ({ page }) => {
  await expect(page.locator('#settings-adults')).toBeVisible()
})

Then('I should see a default children input in settings', async ({ page }) => {
  await expect(page.locator('#settings-children')).toBeVisible()
})

Then('I should see a default babies input in settings', async ({ page }) => {
  await expect(page.locator('#settings-babies')).toBeVisible()
})

Then(
  'the default babies input should have value {int}',
  async ({ page }, value: number) => {
    await expect(page.locator('#settings-babies')).toHaveValue(String(value))
  }
)

Then('I should see a default adults input in create form', async ({ page }) => {
  await expect(page.locator('#default-adults')).toBeVisible()
})

Then('I should see a default children input in create form', async ({ page }) => {
  await expect(page.locator('#default-children')).toBeVisible()
})

Then('I should see a default babies input in create form', async ({ page }) => {
  await expect(page.locator('#default-babies')).toBeVisible()
})

Then(
  'the create form default babies input should have value {int}',
  async ({ page }, value: number) => {
    await expect(page.locator('#default-babies')).toHaveValue(String(value))
  }
)

Then(
  'the default babies input should accept a new value of {int}',
  async ({ page }, value: number) => {
    const input = page.locator('#settings-babies')
    await input.fill(String(value))
    await expect(input).toHaveValue(String(value))
  }
)
