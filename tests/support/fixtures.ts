import { test as base } from 'playwright-bdd'
import type { BrowserContext, Page } from '@playwright/test'
import {
  cleanupSeededUser,
  seedUserWithHouseholds,
  type SeedHouseholdSpec,
  type SeededUser,
} from './seed'

/**
 * Per-scenario fixtures for the integration suite.
 *
 *  - `session`     — mutable per-scenario state. Holds the
 *                    *currently-active* page (swapped to a fresh
 *                    `BrowserContext` by the cross-device step), the
 *                    active seeded user (set by the "I am signed in as
 *                    …" step), and a list of extra contexts to clean
 *                    up at the end.
 *
 * Why session-as-state-holder rather than fixtures-per-thing: the
 * "I am signed in as …" Given step needs to choose the household
 * configuration *at step time*, but Playwright resolves all declared
 * fixtures *before* the step runs. A holder lets the step call the
 * seed helper itself (after the household names have been parsed
 * out of the Gherkin), then stash the resulting handle for later
 * steps to read.
 */
export interface AuthedUserHandle extends SeededUser {
  /** Signs the user in via the UI on the given page. */
  signIn: (page: Page) => Promise<void>
}

export interface SessionHandle {
  /**
   * The page that subsequent UI steps should act on. Steps that switch
   * to a fresh browser context overwrite this.
   */
  page: Page
  /** Set by the "I am signed in as …" Given step. */
  authedUser: AuthedUserHandle | null
  /** Extra contexts spun up by steps; closed in the fixture teardown. */
  extraContexts: BrowserContext[]
  /**
   * Seed + sign in a user with the given household config. Stores the
   * resulting handle on `session.authedUser` and points `session.page`
   * at a signed-in page. Idempotent within a scenario — calling twice
   * cleans up the previous user first.
   */
  signInAs: (households: SeedHouseholdSpec[]) => Promise<AuthedUserHandle>
}

interface Fixtures {
  session: SessionHandle
}

async function performSignIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Successful sign-in lands on /calendar.
  await page.waitForURL(/\/calendar(\/|$)/, { timeout: 15_000 })
}

export const test = base.extend<Fixtures>({
  session: async ({ page }, use) => {
    const handle: SessionHandle = {
      page,
      authedUser: null,
      extraContexts: [],
      signInAs: async (households) => {
        // Clean up any previous user so a single scenario can sign
        // in as different users without leaking rows.
        if (handle.authedUser) {
          await cleanupSeededUser(handle.authedUser)
          handle.authedUser = null
        }
        const seeded = await seedUserWithHouseholds({ households })
        const auth: AuthedUserHandle = {
          ...seeded,
          signIn: (p: Page) => performSignIn(p, seeded.email, seeded.password),
        }
        await auth.signIn(handle.page)
        handle.authedUser = auth
        return auth
      },
    }
    try {
      await use(handle)
    } finally {
      if (handle.authedUser) {
        await cleanupSeededUser(handle.authedUser)
      }
      for (const ctx of handle.extraContexts) {
        try {
          await ctx.close()
        } catch {
          // Best effort.
        }
      }
    }
  },
})

export { performSignIn }
