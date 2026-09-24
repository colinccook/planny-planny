import { expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { Given, When, Then } = createBdd(test)

Given(
  'I am signed in as an owner of a household called {string}',
  async ({ session }, householdName: string) => {
    await session.signInAs([{ name: householdName, role: 'owner' }])
  },
)

When('I expand the {string} section', async ({ session }, title: string) => {
  await session.page.getByRole('button', { name: title }).click()
})

Then('I see the MCP server URL to paste into Claude', async ({ session }) => {
  const url = session.page.getByTestId('mcp-server-url')
  await expect(url).toBeVisible()
  await expect(url).toHaveText(/\/functions\/v1\/chatgpt-plugin\/claude\/mcp$/)
})

Then(
  'I see that the connector requires sign-in with no client credentials',
  async ({ session }) => {
    await expect(session.page.getByText('Requires sign-in')).toBeVisible()
    await expect(
      session.page.getByText(/leave the client ID and client secret blank/i),
    ).toBeVisible()
  },
)

Then('I see that approval creates a separate connector session', async ({ session }) => {
  await expect(
    session.page.getByText(/confirm your Planny Planny password/i),
  ).toBeVisible()
})

Then('I capture the Add to Claude instructions', async ({ session }) => {
  const directory = 'docs/screenshots/claude-integration'
  await mkdir(directory, { recursive: true })
  await session.page.getByTestId('mcp-server-url').scrollIntoViewIfNeeded()
  await session.page.screenshot({
    path: `${directory}/01-add-to-claude-mobile.png`,
    fullPage: false,
  })
})

When('I copy the server URL for Claude', async ({ session }) => {
  await session.page
    .getByRole('button', { name: 'Copy server URL for Claude' })
    .click()
})

Then('I see confirmation that the server URL was copied', async ({ session }) => {
  await expect(
    session.page.getByRole('button', { name: 'Copied!' }),
  ).toBeVisible()
})
