// @ClaudeIntegration #IntegrationTesting #Frontend #Backend #ChatGptPlugin !OAuthBridgePage
import { expect } from '@playwright/test'
import { createHash, randomBytes } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'
import { getAdminClient } from '../../support/supabaseAdmin'
import { createPublicTestClient } from '../../support/supabasePublic'

const { Given, When, Then } = createBdd(test)

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  'http://127.0.0.1:54321'
const AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chatgpt-plugin-auth`
const MCP_URL = `${SUPABASE_URL}/functions/v1/chatgpt-plugin/claude/mcp`
const REDIRECT_URI = 'http://127.0.0.1:5173/plugin/support'

interface ClaudeOAuthWorld {
  clientId: string | null
  verifier: string | null
  challenge: string | null
  callbackUrl: URL | null
  metadataResponse: Response | null
  metadataBody: Record<string, unknown> | null
  previousRefreshToken: string | null
  directRefreshError: Error | null
  tokenResponse: Response | null
  tokenBody: Record<string, unknown> | null
}

const world: ClaudeOAuthWorld = {
  clientId: null,
  verifier: null,
  challenge: null,
  callbackUrl: null,
  metadataResponse: null,
  metadataBody: null,
  previousRefreshToken: null,
  directRefreshError: null,
  tokenResponse: null,
  tokenBody: null,
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

Given('Claude has dynamically registered a public OAuth client', async () => {
  world.clientId = null
  world.verifier = null
  world.challenge = null
  world.callbackUrl = null
  world.metadataResponse = null
  world.metadataBody = null
  world.previousRefreshToken = null
  world.directRefreshError = null
  world.tokenResponse = null
  world.tokenBody = null

  const response = await fetch(`${AUTH_FUNCTION_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Claude',
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
    }),
  })
  const body = await readBody(response)
  expect(response.status).toBe(201)
  expect(body.token_endpoint_auth_method).toBe('none')
  if (typeof body.client_id !== 'string') {
    throw new Error('Claude registration did not return a client_id')
  }
  world.clientId = body.client_id
})

Given('Claude has prepared a PKCE authorization request', async () => {
  const verifier = randomBytes(32).toString('base64url')
  world.verifier = verifier
  world.challenge = createHash('sha256').update(verifier).digest('base64url')
})

When('Claude requests its protected resource metadata', async () => {
  world.metadataResponse = await fetch(`${MCP_URL}/oauth-protected-resource`)
  world.metadataBody = await readBody(world.metadataResponse)
})

Then('the Claude metadata identifies its dedicated MCP resource', async () => {
  expect(world.metadataResponse?.status).toBe(200)
  expect(world.metadataBody?.resource).toBe(MCP_URL)
})

Then('the Claude metadata identifies the compatibility authorization server', async () => {
  expect(world.metadataBody?.authorization_servers).toEqual([AUTH_FUNCTION_URL])
})

When('ChatGPT requests its protected resource metadata', async () => {
  const chatGptMcpUrl = `${SUPABASE_URL}/functions/v1/chatgpt-plugin/mcp`
  world.metadataResponse = await fetch(`${chatGptMcpUrl}/oauth-protected-resource`)
  world.metadataBody = await readBody(world.metadataResponse)
})

Then('the ChatGPT metadata still identifies native Supabase Auth', async () => {
  expect(world.metadataResponse?.status).toBe(200)
  expect(world.metadataBody?.authorization_servers).toEqual([
    `${SUPABASE_URL}/auth/v1`,
  ])
})

When("I open Claude's OAuth authorization request", async ({ session }) => {
  if (!world.clientId || !world.challenge) {
    throw new Error('Claude OAuth client or PKCE challenge is missing')
  }

  const authorizeUrl = new URL(`${AUTH_FUNCTION_URL}/authorize`)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', world.clientId)
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authorizeUrl.searchParams.set('code_challenge', world.challenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')
  authorizeUrl.searchParams.set('state', 'claude-state-123')
  authorizeUrl.searchParams.set('scope', 'openid profile email offline_access')
  authorizeUrl.searchParams.set('resource', MCP_URL)
  authorizeUrl.searchParams.set('prompt', 'consent')

  await session.page.goto(authorizeUrl.toString())
  await session.page.waitForURL(/\/oauth\/authorize\?/)
})

Then('I see the Claude connection approval screen', async ({ session }) => {
  await expect(session.page.getByRole('heading', { name: 'Connect Claude' })).toBeVisible()
  await expect(session.page.getByText('Stay connected until you revoke access')).toBeVisible()
  await expect(session.page.getByText(/Approval returns to 127.0.0.1/)).toBeVisible()
})

Then('I capture the Claude OAuth approval screen', async ({ session }) => {
  const directory = 'docs/screenshots/claude-integration'
  await mkdir(directory, { recursive: true })
  await session.page.screenshot({
    path: `${directory}/02-oauth-approval-mobile.png`,
    fullPage: true,
  })
})

When('I allow the Claude OAuth connection', async ({ session }) => {
  const password = session.authedUser?.password
  if (!password) {
    throw new Error('The signed-in test user password is unavailable')
  }
  await session.page
    .getByLabel('Confirm your Planny Planny password')
    .fill(password)
  await session.page.getByRole('button', { name: 'Allow' }).click()
  await session.page.waitForURL(/\/plugin\/support\?/)
  world.callbackUrl = new URL(session.page.url())
})

Then('Claude receives an authorization code with its original state', async () => {
  expect(world.callbackUrl?.searchParams.get('code')).toBeTruthy()
  expect(world.callbackUrl?.searchParams.get('state')).toBe('claude-state-123')
})

When('Claude exchanges the authorization code using its PKCE verifier', async () => {
  const code = world.callbackUrl?.searchParams.get('code')
  if (!code || !world.clientId || !world.verifier) {
    throw new Error('Claude callback code, client_id or PKCE verifier is missing')
  }

  world.tokenResponse = await fetch(`${AUTH_FUNCTION_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: world.clientId,
      redirect_uri: REDIRECT_URI,
      code_verifier: world.verifier,
      resource: MCP_URL,
    }),
  })
  world.tokenBody = await readBody(world.tokenResponse)
})

Then('Claude receives native Supabase access and refresh tokens', async () => {
  expect(world.tokenResponse?.status).toBe(200)
  expect(world.tokenBody?.access_token).toEqual(expect.any(String))
  expect(world.tokenBody?.refresh_token).toEqual(expect.any(String))
  expect(world.tokenBody?.token_type).toBe('Bearer')
})

When('Claude remembers its current refresh token', async () => {
  const refreshToken = world.tokenBody?.refresh_token
  if (typeof refreshToken !== 'string') {
    throw new Error('The Claude refresh token is unavailable')
  }
  world.previousRefreshToken = refreshToken
})

When('the stored Claude access token becomes unusable', async () => {
  if (!world.clientId) throw new Error('Claude client_id is unavailable')
  const { error } = await getAdminClient()
    .from('chatgpt_oauth_tokens')
    .update({ access_token: 'not-a-valid-jwt' })
    .eq('client_id', world.clientId)
  expect(error).toBeNull()
})

When('I open Connected apps in Settings', async ({ session }) => {
  await session.page.goto('/settings')
  await session.page.waitForURL(/\/settings$/)
  const connectedApps = session.page.getByRole('button', { name: 'Connected apps' })
  await expect(connectedApps).toBeVisible()
  if (await connectedApps.getAttribute('aria-expanded') !== 'true') {
    await connectedApps.click()
  }
  await expect(connectedApps).toHaveAttribute('aria-expanded', 'true')
})

Then('I see Claude in Connected apps', async ({ session }) => {
  if (!world.clientId) throw new Error('Claude client_id is unavailable')
  await expect(
    session.page.getByTestId(`connected-app-compatibility-${world.clientId}`),
  ).toContainText('Claude')
})

Then('I capture Claude in Connected apps', async ({ session }) => {
  if (!world.clientId) throw new Error('Claude client_id is unavailable')
  const directory = 'docs/screenshots/claude-integration'
  await mkdir(directory, { recursive: true })
  await session.page
    .getByTestId(`connected-app-compatibility-${world.clientId}`)
    .scrollIntoViewIfNeeded()
  await session.page.screenshot({
    path: `${directory}/03-connected-apps-mobile.png`,
    fullPage: false,
  })
})

When('I revoke Claude from Connected apps', async ({ session }) => {
  await session.page.getByRole('button', { name: 'Revoke Claude' }).click()
})

Then('Claude is no longer listed in Connected apps', async ({ session }) => {
  if (!world.clientId) throw new Error('Claude client_id is unavailable')
  await expect(
    session.page.getByTestId(`connected-app-compatibility-${world.clientId}`),
  ).toHaveCount(0)
})

When('Claude tries to refresh the revoked connector session', async () => {
  const refreshToken = world.tokenBody?.refresh_token
  if (typeof refreshToken !== 'string') {
    throw new Error('The Claude refresh token is unavailable')
  }

  world.tokenResponse = await fetch(`${AUTH_FUNCTION_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      ...(world.clientId ? { client_id: world.clientId } : {}),
    }),
  })
  world.tokenBody = await readBody(world.tokenResponse)
})

Then('the revoked Claude session is rejected', async () => {
  expect(world.tokenResponse?.status).toBe(401)
})

async function tryDirectSupabaseRefresh(refreshToken: string): Promise<void> {
  const client = createPublicTestClient()
  const { data, error } = await client.auth.refreshSession({
    refresh_token: refreshToken,
  })
  world.directRefreshError = error
  if (data.session) {
    await client.auth.signOut({ scope: 'local' })
  }
}

When('the revoked connector refresh token is sent directly to Supabase Auth', async () => {
  const refreshToken = world.tokenBody?.refresh_token
  if (typeof refreshToken !== 'string') {
    throw new Error('The Claude refresh token is unavailable')
  }
  await tryDirectSupabaseRefresh(refreshToken)
})

Then('Supabase Auth rejects the revoked connector session', async () => {
  expect(world.directRefreshError).not.toBeNull()
})

When('the superseded connector refresh token is sent directly to Supabase Auth', async () => {
  if (!world.previousRefreshToken) {
    throw new Error('The superseded Claude refresh token is unavailable')
  }
  await tryDirectSupabaseRefresh(world.previousRefreshToken)
})

Then('Supabase Auth rejects the superseded connector session', async () => {
  expect(world.directRefreshError).not.toBeNull()
})

When('I deny the Claude OAuth connection', async ({ session }) => {
  await session.page.getByRole('button', { name: 'Deny' }).click()
  await session.page.waitForURL(/\/plugin\/support\?/)
  world.callbackUrl = new URL(session.page.url())
})

Then('Claude receives an access denied response with its original state', async () => {
  expect(world.callbackUrl?.searchParams.get('error')).toBe('access_denied')
  expect(world.callbackUrl?.searchParams.get('state')).toBe('claude-state-123')
})
