import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  test,
  type AuthedUserHandle,
  type SessionHandle,
} from '../../support/fixtures'

const { Given, When, Then } = createBdd(test)

// ──────────────────────────────────────────────────────────
// Seeding + sign-in
// ──────────────────────────────────────────────────────────

Given(
  'I am signed in as a user who owns {string} and is a member of {string}',
  async ({ session }, ownedName: string, memberOfName: string) => {
    await session.signInAs([
      { name: ownedName, role: 'owner' },
      { name: memberOfName, role: 'member' },
    ])
  },
)

// Helper: any step that needs the seeded user assumes the Given step
// has already run. This guard turns a confusing "cannot read property
// of null" into a clear test failure if the Background is misordered.
function requireAuthedUser(session: SessionHandle): AuthedUserHandle {
  if (!session.authedUser) {
    throw new Error(
      'No authedUser on session — did the "I am signed in as …" Given ' +
        'step run before this one?',
    )
  }
  return session.authedUser
}

// ──────────────────────────────────────────────────────────
// Settings panel actions + assertions
// ──────────────────────────────────────────────────────────

When('I open the settings page', async ({ session }) => {
  await session.page.goto('/settings')
  // The page has rendered when the (always-present) heading is visible
  // — and it explicitly does NOT also wait for the loading skeleton to
  // disappear, because the bug we're guarding against is "Settings
  // page renders nothing at all". A pre-bug version would still render
  // the heading; the original-bug version produced a blank tree.
  await expect(session.page.getByTestId('settings-page')).toBeVisible({
    timeout: 15_000,
  })
})

Then(
  'the Settings panel renders with both households listed in My Memberships',
  async ({ session }) => {
    const authedUser = requireAuthedUser(session)
    const memberships = session.page.getByTestId('my-memberships')
    await expect(memberships).toBeVisible()
    for (const h of authedUser.households) {
      await expect(
        memberships.getByTestId(`membership-row-${h.id}`),
      ).toBeVisible()
    }
  },
)

Then(
  'the Current Household selector shows {string}',
  async ({ session }, name: string) => {
    const authedUser = requireAuthedUser(session)
    const target = authedUser.households.find((h) => h.name === name)
    if (!target) throw new Error(`Unknown household name: ${name}`)
    const selector = session.page.locator('#household-select')
    await expect(selector).toBeVisible()
    await expect(selector).toHaveValue(target.id)
  },
)

When(
  'I switch the Current Household to {string}',
  async ({ session }, name: string) => {
    const authedUser = requireAuthedUser(session)
    const target = authedUser.households.find((h) => h.name === name)
    if (!target) throw new Error(`Unknown household name: ${name}`)
    const selector = session.page.locator('#household-select')
    await expect(selector).toBeVisible()
    await selector.selectOption(target.id)
    await expect(selector).toHaveValue(target.id)
  },
)

Then(
  'the {string} indicator in My Memberships moves to {string}',
  async ({ session }, indicator: string, name: string) => {
    const authedUser = requireAuthedUser(session)
    const target = authedUser.households.find((h) => h.name === name)
    if (!target) throw new Error(`Unknown household name: ${name}`)
    const row = session.page.getByTestId(`membership-row-${target.id}`)
    await expect(row).toContainText(indicator)
    // And no other membership row carries the indicator.
    for (const other of authedUser.households) {
      if (other.id === target.id) continue
      const otherRow = session.page.getByTestId(`membership-row-${other.id}`)
      await expect(otherRow).not.toContainText(indicator)
    }
  },
)

// ──────────────────────────────────────────────────────────
// Sign out / sign in flows
// ──────────────────────────────────────────────────────────

When('I sign out and sign back in', async ({ session }) => {
  const authedUser = requireAuthedUser(session)
  // The Sign out button lives in the (default-open) Account section.
  await session.page.goto('/settings')
  await expect(session.page.getByTestId('settings-page')).toBeVisible()
  await session.page.getByRole('button', { name: 'Sign out' }).click()
  await session.page.waitForURL(/\/login(\/|$)/, { timeout: 15_000 })
  await authedUser.signIn(session.page)
})

When(
  'I sign in to the same account from a fresh browser context',
  async ({ session, browser }) => {
    const authedUser = requireAuthedUser(session)
    // A brand-new context has its own cookie jar, localStorage, and
    // service-worker registration — i.e. it simulates a different
    // device. The cross-device persistence story relies on the choice
    // landing in the database (not just localStorage), so this is the
    // strongest assertion we can make from a single Playwright run.
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      baseURL: 'http://localhost:5173',
    })
    session.extraContexts.push(ctx)
    const fresh = await ctx.newPage()
    session.page = fresh
    await authedUser.signIn(fresh)
  },
)
