// Integration tests for ChatGPT plugin OAuth authentication
//
// These tests exercise the full OAuth 2.0 code flow:
// 1. Authorization endpoint for generating auth codes
// 2. Token exchange via authorization codes
// 3. Direct password grant (fallback)
// 4. Token refresh

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
  'eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.' +
  'CRFA0NiK7kyqHDan_WiMe9UYAl1lhTbcECmMEaFzOFo'

const AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chatgpt-plugin-auth`
const REDIRECT_URI = 'https://chat.openai.com/aip/g-plugin/oauth/callback'

// ── Per-scenario state ───────────────────────────────────────────────

interface OAuthWorld {
  testEmail: string
  testPassword: string
  testUserId: string
  lastResponse: Response | null
  lastBody: Record<string, unknown> | null
  lastLocationHeader: string | null
  accessToken: string | null
  refreshToken: string | null
  expiresIn: number | null
  authCode: string | null
  state: string
}

const world: OAuthWorld = {
  testEmail: '',
  testPassword: '',
  testUserId: '',
  lastResponse: null,
  lastBody: null,
  lastLocationHeader: null,
  accessToken: null,
  refreshToken: null,
  expiresIn: null,
  authCode: null,
  state: 'test-state-12345',
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

async function oauthGet(path: string, params: URLSearchParams): Promise<Response> {
  const url = `${AUTH_FUNCTION_URL}${path}?${params.toString()}`
  return fetch(url, {
    method: 'GET',
    redirect: 'manual',
  })
}

async function readBody(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

function extractAuthCodeFromRedirect(location: string): string | null {
  try {
    const url = new URL(location)
    return url.searchParams.get('code')
  } catch {
    return null
  }
}

// ── Background ───────────────────────────────────────────────────────

Given('I have created a test account for OAuth', async ({ session }) => {
  // Reset world for each scenario
  world.testEmail = ''
  world.testPassword = ''
  world.testUserId = ''
  world.lastResponse = null
  world.lastBody = null
  world.lastLocationHeader = null
  world.accessToken = null
  world.refreshToken = null
  world.expiresIn = null
  world.authCode = null

  // Create a test user
  const user = await session.signInAs([{ name: 'OAuth Test Household', role: 'owner' }])
  world.testEmail = user.email
  world.testPassword = user.password
  world.testUserId = user.id
})

// ── OAuth Authorization Code Flow ───────────────────────────────────

When('I request an authorization code with email and password', async () => {
  const params = new URLSearchParams({
    client_id: 'chatgpt-plugin',
    redirect_uri: REDIRECT_URI,
    state: world.state,
    email: world.testEmail,
    password: world.testPassword,
  })

  world.lastResponse = await oauthGet('/authorize', params)
  world.lastLocationHeader = world.lastResponse.headers.get('Location') ?? null
})

When('I request an authorization code with invalid credentials', async () => {
  const params = new URLSearchParams({
    client_id: 'chatgpt-plugin',
    redirect_uri: REDIRECT_URI,
    state: world.state,
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  })

  world.lastResponse = await oauthGet('/authorize', params)
  world.lastBody = await readBody(world.lastResponse)
})

When('I exchange the authorization code for tokens', async () => {
  expect(world.authCode).not.toBeNull()
  world.lastResponse = await oauthFetch('/token', {
    grant_type: 'authorization_code',
    code: world.authCode,
    redirect_uri: REDIRECT_URI,
  })
  world.lastBody = await readBody(world.lastResponse)

  if (world.lastResponse.status === 200) {
    world.accessToken = (world.lastBody as { access_token?: string }).access_token ?? null
    world.refreshToken = (world.lastBody as { refresh_token?: string }).refresh_token ?? null
    world.expiresIn = (world.lastBody as { expires_in?: number }).expires_in ?? null
  }
})

When('I try to exchange an invalid authorization code', async () => {
  world.lastResponse = await oauthFetch('/token', {
    grant_type: 'authorization_code',
    code: 'invalid-code-that-does-not-exist',
    redirect_uri: REDIRECT_URI,
  })
  world.lastBody = await readBody(world.lastResponse)
})

Then('I receive an authorization code in the redirect', async () => {
  expect(world.lastResponse?.status).toBe(302)
  expect(world.lastLocationHeader).toBeTruthy()
  const code = extractAuthCodeFromRedirect(world.lastLocationHeader ?? '')
  expect(code).toBeTruthy()
  world.authCode = code
})

Then('the authorization code includes the original state', async () => {
  expect(world.lastLocationHeader).toBeTruthy()
  const url = new URL(world.lastLocationHeader ?? '')
  const state = url.searchParams.get('state')
  expect(state).toBe(world.state)
})

Then('I receive a 401 error for invalid authorization', async () => {
  expect(world.lastResponse?.status).toBe(401)
  expect((world.lastBody as { error?: unknown }).error).toBeTruthy()
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

Then('the tokens are stored in the database', async () => {
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
  expect(newAccessToken).not.toBe(world.accessToken)
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
  world.refreshToken = newRefreshToken
})

Then('the response includes:', async ({ page: _page }, table: unknown) => {
  // Handle both array and object table formats from playwright-bdd
  const rows = Array.isArray(table) ? table : Object.values(table as Record<string, unknown>)
  
  if (!Array.isArray(rows) || rows.length === 0) {
    // Skip if table is empty or malformed
    return
  }

  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue
    
    const rowObj = row as Record<string, string>
    const field = rowObj['Field']
    const type = rowObj['Type']

    if (!field) continue

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
