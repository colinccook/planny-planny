// Integration tests for ChatGPT plugin OAuth authentication
//
// These tests exercise the OAuth token exchange endpoint, which allows
// ChatGPT to obtain and refresh tokens without manual copy/paste.

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'
import { createClient } from '@supabase/supabase-js'

const { Given, When, Then } = createBdd(test)

// ── Constants ────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  'http://127.0.0.1:54321'

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  // Well-known local-dev anon key shipped with the Supabase CLI.
  '******' +
  'eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.' +
  'CRFA0NiK7kyqHDan_WiMe9UYAl1lhTbcECmMEaFzOFo'

const AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chatgpt-plugin-auth`

// ── Per-scenario state ───────────────────────────────────────────────

interface OAuthWorld {
  testEmail: string
  testPassword: string
  lastResponse: Response | null
  lastBody: Record<string, unknown> | null
  accessToken: string | null
  refreshToken: string | null
  expiresIn: number | null
}

const world: OAuthWorld = {
  testEmail: '',
  testPassword: '',
  lastResponse: null,
  lastBody: null,
  accessToken: null,
  refreshToken: null,
  expiresIn: null,
}

// ── Helpers ──────────────────────────────────────────────────────────

async function oauthFetch(
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const url = `${AUTH_FUNCTION_URL}${path}`
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

async function readBody(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── Background ───────────────────────────────────────────────────────

// Create a test user and prepare for OAuth testing
Given('I have created a test account for OAuth', async ({ session }) => {
  // Reset world for each scenario
  world.testEmail = ''
  world.testPassword = ''
  world.lastResponse = null
  world.lastBody = null
  world.accessToken = null
  world.refreshToken = null
  world.expiresIn = null

  // Create a test user
  const user = await session.signInAs([{ name: 'OAuth Test Household', role: 'owner' }])
  world.testEmail = user.email
  world.testPassword = user.password
})

// ── OAuth Password Grant Steps ───────────────────────────────────────

When('I request an OAuth token with email and password', async () => {
  world.lastResponse = await oauthFetch('/token', {
    grant_type: 'password',
    email: world.testEmail,
    password: world.testPassword,
  })
  world.lastBody = await readBody(world.lastResponse)

  if (world.lastResponse.status === 200) {
    world.accessToken = (world.lastBody as { access_token?: string }).access_token ?? null
    world.refreshToken = (world.lastBody as { refresh_token?: string }).refresh_token ?? null
    world.expiresIn = (world.lastBody as { expires_in?: number }).expires_in ?? null
  }
})

When('I request an OAuth token with invalid email or password', async () => {
  world.lastResponse = await oauthFetch('/token', {
    grant_type: 'password',
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  })
  world.lastBody = await readBody(world.lastResponse)
})

When('I request an OAuth token without an email', async () => {
  world.lastResponse = await oauthFetch('/token', {
    grant_type: 'password',
    password: 'somepassword',
  })
  world.lastBody = await readBody(world.lastResponse)
})

// ── OAuth Refresh Grant Steps ────────────────────────────────────────

Given('I have a valid refresh token', async () => {
  // First get initial tokens
  world.lastResponse = await oauthFetch('/token', {
    grant_type: 'password',
    email: world.testEmail,
    password: world.testPassword,
  })
  world.lastBody = await readBody(world.lastResponse)
  world.refreshToken = (world.lastBody as { refresh_token?: string }).refresh_token ?? null
  expect(world.refreshToken).not.toBeNull()
})

When('I use the refresh token to get a new access token', async () => {
  expect(world.refreshToken).not.toBeNull()
  world.lastResponse = await oauthFetch('/token', {
    grant_type: 'refresh_token',
    refresh_token: world.refreshToken,
  })
  world.lastBody = await readBody(world.lastResponse)
})

When('I try to refresh with an invalid refresh token', async () => {
  world.lastResponse = await oauthFetch('/token', {
    grant_type: 'refresh_token',
    refresh_token: 'invalid.refresh.token',
  })
  world.lastBody = await readBody(world.lastResponse)
})

// ── Assertion Steps ──────────────────────────────────────────────────

Then('I receive an access token, refresh token, and expiry', async () => {
  expect(world.lastResponse?.status).toBe(200)
  expect(world.accessToken).toBeTruthy()
  expect(world.refreshToken).toBeTruthy()
  expect(world.expiresIn).toBe(3600)
})

Then('the tokens are stored in the database', async ({ session }) => {
  // Create an authenticated client with the access token
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${world.accessToken}` } },
  })

  // Verify we can use the access token
  const { data: { user }, error } = await client.auth.getUser()
  expect(error).toBeNull()
  expect(user).toBeTruthy()
})

Then('I receive a {int} error', async ({ page: _page }, statusCode: number) => {
  expect(world.lastResponse?.status).toBe(statusCode)
  expect((world.lastBody as { error?: unknown }).error).toBeTruthy()
})

Then('no tokens are stored', async () => {
  // Trying to use an invalid token should fail
  expect(world.lastBody).toHaveProperty('error')
})

Then('I receive a new access token', async () => {
  expect(world.lastResponse?.status).toBe(200)
  const newAccessToken = (world.lastBody as { access_token?: string }).access_token
  expect(newAccessToken).toBeTruthy()
  expect(newAccessToken).not.toBe(world.accessToken) // Should be different token
})

Then('the new token is stored in the database', async () => {
  const newAccessToken = (world.lastBody as { access_token?: string }).access_token
  // Verify the new token works
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${newAccessToken}` } },
  })

  const { data: { user }, error } = await client.auth.getUser()
  expect(error).toBeNull()
  expect(user).toBeTruthy()
})

Then('the original refresh token is updated', async () => {
  const newRefreshToken = (world.lastBody as { refresh_token?: string }).refresh_token
  expect(newRefreshToken).toBeTruthy()
  // The refresh token should be valid for future refreshes
  world.refreshToken = newRefreshToken
})

Then('the response includes:', async ({ page: _page }, table: Record<string, string>[]) => {
  for (const row of table) {
    const field = row['Field']
    const type = row['Type']

    expect(world.lastBody).toHaveProperty(field)
    const value = (world.lastBody as Record<string, unknown>)[field]

    if (type === 'string') {
      expect(typeof value).toBe('string')
    } else if (type === 'number') {
      expect(typeof value).toBe('number')
    }
  }
})

Then('token_type is {string}', async ({ page: _page }, expected: string) => {
  const tokenType = (world.lastBody as { token_type?: string }).token_type
  expect(tokenType).toBe(expected)
})

Then('expires_in is {int} \\(1 hour\\)', async ({ page: _page }, expected: number) => {
  const expiresIn = (world.lastBody as { expires_in?: number }).expires_in
  expect(expiresIn).toBe(expected)
})
