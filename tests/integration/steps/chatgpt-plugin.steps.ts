// Integration steps for the ChatGPT plugin Edge Function.
//
// These tests call the Supabase Edge Function directly via fetch,
// using the JWT of a seeded test user. This exercises the full
// RLS stack without going through the React UI.
//
// The Edge Function must be running locally. When `supabase start`
// is running the functions are served at:
//   http://127.0.0.1:54321/functions/v1/chatgpt-plugin
//
// Step state is stored in a plain object that lives for the
// duration of each scenario (Playwright BDD re-imports the module
// per worker but each scenario gets a fresh world via Given/When/Then
// closures over the scenario-scoped variables below).

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

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chatgpt-plugin`
const AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chatgpt-plugin-auth`

// ── Per-scenario state ───────────────────────────────────────────────
//
// Playwright BDD re-runs each scenario in isolation. We use a module-
// level object so all step functions in this file share state within
// one scenario without threading it through parameters.

interface PluginWorld {
  jwt: string | null
  householdId: string | null
  lastResponse: Response | null
  lastBody: Record<string, unknown> | null
  /** IDs of resources created mid-scenario so later steps can reference :id. */
  lastTodoId: string | null
  lastMealId: string | null
  lastIdeaId: string | null
  lastEventId: string | null
  /** MCP-specific state (POST /sse endpoint). */
  lastMcpResponse: Response | null
  lastMcpBody: Record<string, unknown> | null
  lastMcpTodoId: string | null
  /** OAuth-specific state (chatgpt-plugin-auth + discovery endpoints). */
  oauthEmail: string | null
  oauthPassword: string | null
  lastDiscoveryResponse: Response | null
  lastDiscoveryBody: Record<string, unknown> | null
  pkceVerifier: string | null
  pkceChallenge: string | null
  lastRegisterResponse: Response | null
  lastRegisterBody: Record<string, unknown> | null
  lastAuthRedirectUrl: URL | null
  lastAuthCode: string | null
  lastAuthState: string | null
  lastTokenResponse: Response | null
  lastTokenBody: Record<string, unknown> | null
  lastRefreshToken: string | null
}

// One world per worker (Playwright runs scenarios sequentially within a
// worker, so this is safe). Reset at the start of each Background step.
const world: PluginWorld = {
  jwt: null,
  householdId: null,
  lastResponse: null,
  lastBody: null,
  lastTodoId: null,
  lastMealId: null,
  lastIdeaId: null,
  lastEventId: null,
  lastMcpResponse: null,
  lastMcpBody: null,
  lastMcpTodoId: null,
  oauthEmail: null,
  oauthPassword: null,
  lastDiscoveryResponse: null,
  lastDiscoveryBody: null,
  pkceVerifier: null,
  pkceChallenge: null,
  lastRegisterResponse: null,
  lastRegisterBody: null,
  lastAuthRedirectUrl: null,
  lastAuthCode: null,
  lastAuthState: null,
  lastTokenResponse: null,
  lastTokenBody: null,
  lastRefreshToken: null,
}

// ── Helpers ──────────────────────────────────────────────────────────

async function pluginFetch(
  path: string,
  options: RequestInit = {},
  jwt?: string | null,
  householdId?: string | null,
): Promise<Response> {
  const hid = householdId ?? world.householdId
  const token = jwt !== undefined ? jwt : world.jwt

  const qs = hid ? `?household_id=${hid}` : ''
  const url = `${FUNCTION_URL}${path}${qs}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = 'Bearer ' + token

  return fetch(url, { ...options, headers })
}

async function readBody(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── Background ───────────────────────────────────────────────────────

Given('I am signed in as an owner of a household for the plugin', async ({ session }) => {
  // Reset world for each scenario.
  world.jwt = null
  world.householdId = null
  world.lastResponse = null
  world.lastBody = null
  world.lastTodoId = null
  world.lastMealId = null
  world.lastIdeaId = null
  world.lastEventId = null
  world.lastMcpResponse = null
  world.lastMcpBody = null
  world.lastMcpTodoId = null

  const user = await session.signInAs([{ name: 'Plugin Test Household', role: 'owner' }])
  world.householdId = user.households[0].id

  // Sign in via the Supabase Auth REST API to obtain a JWT that the
  // Edge Function can verify with supabase.auth.getUser().
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })
  if (error || !data.session) {
    throw new Error(`Plugin background: could not sign in: ${error?.message}`)
  }
  world.jwt = data.session.access_token
})

Given('a seeded ChatGPT plugin test user', async ({ session }) => {
  // Reset OAuth-specific world state for each scenario.
  world.oauthEmail = null
  world.oauthPassword = null
  world.lastDiscoveryResponse = null
  world.lastDiscoveryBody = null
  world.pkceVerifier = null
  world.pkceChallenge = null
  world.lastRegisterResponse = null
  world.lastRegisterBody = null
  world.lastAuthRedirectUrl = null
  world.lastAuthCode = null
  world.lastAuthState = null
  world.lastTokenResponse = null
  world.lastTokenBody = null
  world.lastRefreshToken = null

  const user = await session.signInAs([{ name: 'OAuth Test Household', role: 'owner' }])
  world.oauthEmail = user.email
  world.oauthPassword = user.password
})

// ── Auth guard ───────────────────────────────────────────────────────

When(/I call the plugin endpoint GET \/todos without authentication/, async () => {
  world.lastResponse = await pluginFetch('/todos', {}, null)
  world.lastBody = await readBody(world.lastResponse)
})

// ── Generic request steps ─────────────────────────────────────────────

When(
  'I call the plugin endpoint GET {word}',
  async ({ page: _page }, resource: string) => {
    world.lastResponse = await pluginFetch(`/${resource}`)
    world.lastBody = await readBody(world.lastResponse)
  },
)

When(
  'I call the plugin endpoint GET {word} with params {word}',
  async ({ page: _page }, resource: string, params: string) => {
    const hid = world.householdId
    const qs = hid ? `?household_id=${hid}&${params}` : `?${params}`
    const url = `${FUNCTION_URL}/${resource}${qs}`
    world.lastResponse = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + world.jwt,
        'Content-Type': 'application/json',
      },
    })
    world.lastBody = await readBody(world.lastResponse)
  },
)

When(
  'I call the plugin endpoint POST {word} with body:',
  async ({ page: _page }, resource: string, body: string) => {
    // Replace :id / :meal_id tokens with the last created resource id.
    const resolved = resolveIdTokens(resource)
    world.lastResponse = await pluginFetch(`/${resolved}`, {
      method: 'POST',
      body,
    })
    world.lastBody = await readBody(world.lastResponse)
    captureIds(resolved, world.lastBody)
  },
)

When(
  'I call the plugin endpoint PATCH {word} with body:',
  async ({ page: _page }, resource: string, body: string) => {
    const resolved = resolveIdTokens(resource)
    world.lastResponse = await pluginFetch(`/${resolved}`, {
      method: 'PATCH',
      body,
    })
    world.lastBody = await readBody(world.lastResponse)
  },
)

When(
  'I call the plugin endpoint PUT {word} with body:',
  async ({ page: _page }, resource: string, body: string) => {
    const resolved = resolveIdTokens(resource)
    world.lastResponse = await pluginFetch(`/${resolved}`, {
      method: 'PUT',
      body,
    })
    world.lastBody = await readBody(world.lastResponse)
  },
)

When(
  'I call the plugin endpoint DELETE {word}',
  async ({ page: _page }, resource: string) => {
    const resolved = resolveIdTokens(resource)
    world.lastResponse = await pluginFetch(`/${resolved}`, { method: 'DELETE' })
    world.lastBody = await readBody(world.lastResponse)
  },
)

// ── Resource-creation Given steps ─────────────────────────────────────

Given(
  'I have created a plugin todo titled {string} for date {string}',
  async ({ page: _page }, title: string, date: string) => {
    const res = await pluginFetch('/todos', {
      method: 'POST',
      body: JSON.stringify({ title, date }),
    })
    const body = await readBody(res) as { todo?: { id: string } }
    world.lastTodoId = body.todo?.id ?? null
    expect(res.status).toBe(201)
  },
)

Given(
  'I have created a plugin meal titled {string} for date {string}',
  async ({ page: _page }, title: string, date: string) => {
    const res = await pluginFetch('/meals', {
      method: 'POST',
      body: JSON.stringify({ title, date }),
    })
    const body = await readBody(res) as { meal?: { id: string } }
    world.lastMealId = body.meal?.id ?? null
    expect(res.status).toBe(201)
  },
)

Given(
  'I have proposed a plugin idea titled {string}',
  async ({ page: _page }, title: string) => {
    const res = await pluginFetch('/ideas', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
    const body = await readBody(res) as { idea?: { id: string } }
    world.lastIdeaId = body.idea?.id ?? null
    expect(res.status).toBe(201)
  },
)

Given(
  'I have created a plugin event named {string} on date {string}',
  async ({ page: _page }, event_name: string, date: string) => {
    const res = await pluginFetch('/events', {
      method: 'POST',
      body: JSON.stringify({ event_name, date }),
    })
    const body = await readBody(res) as { event?: { id: string } }
    world.lastEventId = body.event?.id ?? null
    expect(res.status).toBe(201)
  },
)

// ── Action steps for complete / reopen / delete shortcuts ─────────────

When('I complete the plugin todo', async () => {
  expect(world.lastTodoId).not.toBeNull()
  world.lastResponse = await pluginFetch(`/todos/${world.lastTodoId}/complete`, {
    method: 'POST',
    body: '{}',
  })
  world.lastBody = await readBody(world.lastResponse)
})

When('I reopen the plugin todo', async () => {
  expect(world.lastTodoId).not.toBeNull()
  world.lastResponse = await pluginFetch(`/todos/${world.lastTodoId}/reopen`, {
    method: 'POST',
    body: '{}',
  })
  world.lastBody = await readBody(world.lastResponse)
})

When('I delete the plugin todo', async () => {
  expect(world.lastTodoId).not.toBeNull()
  world.lastResponse = await pluginFetch(`/todos/${world.lastTodoId}`, { method: 'DELETE' })
  world.lastBody = await readBody(world.lastResponse)
})

When('I delete the plugin meal', async () => {
  expect(world.lastMealId).not.toBeNull()
  world.lastResponse = await pluginFetch(`/meals/${world.lastMealId}`, { method: 'DELETE' })
  world.lastBody = await readBody(world.lastResponse)
})

When('I delete the plugin idea', async () => {
  expect(world.lastIdeaId).not.toBeNull()
  world.lastResponse = await pluginFetch(`/ideas/${world.lastIdeaId}`, { method: 'DELETE' })
  world.lastBody = await readBody(world.lastResponse)
})

When('I delete the plugin event', async () => {
  expect(world.lastEventId).not.toBeNull()
  world.lastResponse = await pluginFetch(`/events/${world.lastEventId}`, { method: 'DELETE' })
  world.lastBody = await readBody(world.lastResponse)
})

// ── Assertion steps ───────────────────────────────────────────────────

Then('the plugin response status is {int}', async ({ page: _page }, status: number) => {
  expect(world.lastResponse?.status).toBe(status)
})

Then('the plugin response contains an error', async () => {
  expect(world.lastBody).toHaveProperty('error')
  expect(typeof (world.lastBody as { error?: unknown }).error).toBe('string')
})

Then('the plugin response contains a {string} array', async ({ page: _page }, key: string) => {
  expect(world.lastBody).toHaveProperty(key)
  expect(Array.isArray((world.lastBody as Record<string, unknown>)[key])).toBe(true)
})

Then('the plugin response contains an {string} array', async ({ page: _page }, key: string) => {
  expect(world.lastBody).toHaveProperty(key)
  expect(Array.isArray((world.lastBody as Record<string, unknown>)[key])).toBe(true)
})

Then('the plugin response contains deleted true', async () => {
  expect((world.lastBody as { deleted?: boolean })?.deleted).toBe(true)
})

Then('the plugin response contains moved {word}', async ({ page: _page }, value: string) => {
  expect((world.lastBody as { moved?: boolean })?.moved).toBe(value === 'true')
})

Then('the plugin response contains a todo with title {string}', async ({ page: _page }, title: string) => {
  const todo = (world.lastBody as { todo?: { title: string; id: string } })?.todo
  expect(todo?.title).toBe(title)
  if (todo?.id) world.lastTodoId = todo.id
})

Then('the plugin response contains a meal with title {string}', async ({ page: _page }, title: string) => {
  const meal = (world.lastBody as { meal?: { title: string; id: string } })?.meal
  expect(meal?.title).toBe(title)
  if (meal?.id) world.lastMealId = meal.id
})

Then('the plugin response contains an idea with title {string}', async ({ page: _page }, title: string) => {
  const idea = (world.lastBody as { idea?: { title: string; id: string } })?.idea
  expect(idea?.title).toBe(title)
  if (idea?.id) world.lastIdeaId = idea.id
})

Then('the plugin response contains an event named {string}', async ({ page: _page }, name: string) => {
  const event = (world.lastBody as { event?: { event_name: string; id: string } })?.event
  expect(event?.event_name).toBe(name)
  if (event?.id) world.lastEventId = event.id
})

Then('the outcome status is {string}', async ({ page: _page }, status: string) => {
  const outcome = (world.lastBody as { outcome?: { status: string } })?.outcome
  expect(outcome?.status).toBe(status)
})

Then('the todo has a completed_on date', async () => {
  const todo = (world.lastBody as { todo?: { completed_on: string | null } })?.todo
  expect(todo?.completed_on).not.toBeNull()
})

Then('the todo has no completed_on date', async () => {
  const todo = (world.lastBody as { todo?: { completed_on: string | null } })?.todo
  expect(todo?.completed_on).toBeNull()
})

Then(
  'the {string} array includes an item titled {string}',
  async ({ page: _page }, arrayKey: string, title: string) => {
    const arr = world.lastBody?.[arrayKey]
    expect(Array.isArray(arr)).toBe(true)
    const items = arr as { title: string }[]
    expect(items.some((item) => item.title === title)).toBe(true)
  },
)

// ── Private helpers ───────────────────────────────────────────────────

/** Replace :id / :meal_id tokens in a path with last-created resource ids. */
function resolveIdTokens(path: string): string {
  // The {word} cucumber parameter captures the leading "/" from steps like
  // "PATCH /todos/:id", so prefix checks below must ignore it.
  const bare = path.replace(/^\//, '')
  return path
    .replace(':meal_id', world.lastMealId ?? ':meal_id')
    .replace(':id', (() => {
      // Pick the most recently created resource id based on the path prefix.
      if (bare.startsWith('todos')) return world.lastTodoId ?? ':id'
      if (bare.startsWith('meals')) return world.lastMealId ?? ':id'
      if (bare.startsWith('ideas')) return world.lastIdeaId ?? ':id'
      if (bare.startsWith('events')) return world.lastEventId ?? ':id'
      if (bare.startsWith('outcomes')) return world.lastMealId ?? ':id'
      return ':id'
    })())
}

/** Capture created resource ids from response bodies so later steps can
 *  reference them via :id tokens without explicit Given steps. */
function captureIds(path: string, body: Record<string, unknown> | null) {
  if (!body) return
  if (path.startsWith('todos') && (body as { todo?: { id: string } }).todo?.id) {
    world.lastTodoId = (body as { todo: { id: string } }).todo.id
  }
  if (path.startsWith('meals') && (body as { meal?: { id: string } }).meal?.id) {
    world.lastMealId = (body as { meal: { id: string } }).meal.id
  }
  if (path.startsWith('ideas') && (body as { idea?: { id: string } }).idea?.id) {
    world.lastIdeaId = (body as { idea: { id: string } }).idea.id
  }
  if (path.startsWith('events') && (body as { event?: { id: string } }).event?.id) {
    world.lastEventId = (body as { event: { id: string } }).event.id
  }
}

// ══════════════════════════════════════════════════════════════════════════
// MCP endpoint steps  (POST /sse — Model Context Protocol)
// ══════════════════════════════════════════════════════════════════════════

const MCP_URL = `${FUNCTION_URL}/sse`

/** POST a JSON-RPC 2.0 message to the MCP /sse endpoint. */
async function mcpFetch(
  body: unknown,
  jwt?: string | null,
  householdId?: string | null,
): Promise<Response> {
  const hid = householdId ?? world.householdId
  const token = jwt !== undefined ? jwt : world.jwt
  const qs = hid ? `?household_id=${hid}` : ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  return fetch(`${MCP_URL}${qs}`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function readMcpBody(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── Request steps ─────────────────────────────────────────────────────────

When('I send an MCP initialize request', async () => {
  world.lastMcpResponse = await mcpFetch({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    },
  }, null)  // no auth — initialize is public
  world.lastMcpBody = await readMcpBody(world.lastMcpResponse)
})

When('I send an MCP tools\\/list request', async () => {
  world.lastMcpResponse = await mcpFetch(
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    null,
  )
  world.lastMcpBody = await readMcpBody(world.lastMcpResponse)
})

When('I send an MCP notifications\\/initialized message', async () => {
  world.lastMcpResponse = await mcpFetch(
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    null,
  )
})

When('I send an MCP request for method {string}', async ({ page: _page }, method: string) => {
  world.lastMcpResponse = await mcpFetch(
    { jsonrpc: '2.0', id: 3, method, params: {} },
    null,
  )
  world.lastMcpBody = await readMcpBody(world.lastMcpResponse)
})

When('I send a malformed MCP request body', async () => {
  world.lastMcpResponse = await mcpFetch('{ invalid json !!!', null)
  world.lastMcpBody = await readMcpBody(world.lastMcpResponse)
})

When('I send a plain GET request to the MCP endpoint without authentication', async () => {
  world.lastMcpResponse = await fetch(MCP_URL)
  world.lastMcpBody = await readMcpBody(world.lastMcpResponse)
})

When(
  'I call MCP tool {string} without authentication',
  async ({ page: _page }, toolName: string) => {
    world.lastMcpResponse = await mcpFetch(
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: toolName, arguments: {} } },
      null,   // explicitly no auth
      null,
    )
    world.lastMcpBody = await readMcpBody(world.lastMcpResponse)
  },
)

When(
  'I call MCP tool {string} with arguments:',
  async ({ page: _page }, toolName: string, argsJson: string) => {
    const args = JSON.parse(argsJson) as Record<string, unknown>
    world.lastMcpResponse = await mcpFetch({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    })
    world.lastMcpBody = await readMcpBody(world.lastMcpResponse)

    // Capture todo id from create_todo results for later steps.
    if (toolName === 'create_todo') {
      const text = extractMcpText(world.lastMcpBody)
      if (text) {
        const parsed = JSON.parse(text) as { todo?: { id: string } }
        if (parsed.todo?.id) world.lastMcpTodoId = parsed.todo.id
      }
    }
  },
)

When('I call MCP tool {string} with the last created todo id', async ({ page: _page }, toolName: string) => {
  expect(world.lastMcpTodoId).not.toBeNull()
  world.lastMcpResponse = await mcpFetch({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: toolName, arguments: { id: world.lastMcpTodoId } },
  })
  world.lastMcpBody = await readMcpBody(world.lastMcpResponse)
})

// ── Assertion steps ───────────────────────────────────────────────────────

Then('the MCP response status is {int}', async ({ page: _page }, status: number) => {
  expect(world.lastMcpResponse?.status).toBe(status)
})

Then(
  'the MCP response has a WWW-Authenticate header pointing at the protected resource metadata',
  async () => {
    const header = world.lastMcpResponse?.headers.get('WWW-Authenticate')
    expect(header).toMatch(/^Bearer resource_metadata="/)
    expect(header).toContain('/.well-known/oauth-protected-resource')
  },
)

When('I request the MCP protected resource metadata', async () => {
  world.lastDiscoveryResponse = await fetch(
    `${FUNCTION_URL}/.well-known/oauth-protected-resource`,
  )
  world.lastDiscoveryBody = await readBody(world.lastDiscoveryResponse)
})

Then('the MCP response is a valid JSON-RPC 2.0 result', async () => {
  const body = world.lastMcpBody
  expect(body?.jsonrpc).toBe('2.0')
  expect(body).toHaveProperty('result')
  expect(body).not.toHaveProperty('error')
})

Then('the MCP response is a valid JSON-RPC 2.0 error', async () => {
  const body = world.lastMcpBody
  expect(body?.jsonrpc).toBe('2.0')
  expect(body).toHaveProperty('error')
})

Then('the MCP error code is {int}', async ({ page: _page }, code: number) => {
  const error = (world.lastMcpBody as { error?: { code: number } })?.error
  expect(error?.code).toBe(code)
})

Then('the MCP result contains protocolVersion {string}', async ({ page: _page }, version: string) => {
  const result = (world.lastMcpBody as { result?: { protocolVersion: string } })?.result
  expect(result?.protocolVersion).toBe(version)
})

Then('the MCP result contains serverInfo name {string}', async ({ page: _page }, name: string) => {
  const result = (world.lastMcpBody as { result?: { serverInfo?: { name: string } } })?.result
  expect(result?.serverInfo?.name).toBe(name)
})

Then('the MCP result has a tools capability', async () => {
  const result = (world.lastMcpBody as { result?: { capabilities?: { tools?: unknown } } })?.result
  expect(result?.capabilities?.tools).toBeDefined()
})

Then('the MCP result contains a tools array', async () => {
  const result = (world.lastMcpBody as { result?: { tools?: unknown[] } })?.result
  expect(Array.isArray(result?.tools)).toBe(true)
})

Then('the tools array includes a tool named {string}', async ({ page: _page }, toolName: string) => {
  const tools = ((world.lastMcpBody as { result?: { tools?: { name: string }[] } })?.result?.tools) ?? []
  expect(tools.some((t) => t.name === toolName)).toBe(true)
})

Then('the MCP tool result content contains a {string} array', async ({ page: _page }, key: string) => {
  const text = extractMcpText(world.lastMcpBody)
  expect(text).not.toBeNull()
  const parsed = JSON.parse(text ?? '') as Record<string, unknown>
  expect(Array.isArray(parsed[key])).toBe(true)
})

Then('the MCP tool result content contains an {string} array', async ({ page: _page }, key: string) => {
  const text = extractMcpText(world.lastMcpBody)
  expect(text).not.toBeNull()
  const parsed = JSON.parse(text ?? '') as Record<string, unknown>
  expect(Array.isArray(parsed[key])).toBe(true)
})

Then('the MCP tool result content contains a todo titled {string}', async ({ page: _page }, title: string) => {
  const text = extractMcpText(world.lastMcpBody)
  expect(text).not.toBeNull()
  const parsed = JSON.parse(text ?? '') as { todo?: { title: string } }
  expect(parsed.todo?.title).toBe(title)
})

Then('the MCP tool result content contains a meal titled {string}', async ({ page: _page }, title: string) => {
  const text = extractMcpText(world.lastMcpBody)
  expect(text).not.toBeNull()
  const parsed = JSON.parse(text ?? '') as { meal?: { title: string } }
  expect(parsed.meal?.title).toBe(title)
})

Then('the MCP tool result todo has a completed_on date', async () => {
  const text = extractMcpText(world.lastMcpBody)
  expect(text).not.toBeNull()
  const parsed = JSON.parse(text ?? '') as { todo?: { completed_on: string | null } }
  expect(parsed.todo?.completed_on).not.toBeNull()
})

Then('the MCP tool result todo has no completed_on date', async () => {
  const text = extractMcpText(world.lastMcpBody)
  expect(text).not.toBeNull()
  const parsed = JSON.parse(text ?? '') as { todo?: { completed_on: string | null } }
  expect(parsed.todo?.completed_on).toBeNull()
})

// ══════════════════════════════════════════════════════════════════════════
// OAuth discovery & flow steps (chatgpt-plugin-auth Edge Function)
// ══════════════════════════════════════════════════════════════════════════

function base64UrlEncode(bytes: Buffer): string {
  return bytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ── Discovery assertion helpers (shared by MCP + OAuth discovery scenarios) ─

Then('the discovery response status is {int}', async ({ page: _page }, status: number) => {
  expect(world.lastDiscoveryResponse?.status).toBe(status)
})

Then('the discovery response contains a {string} field', async ({ page: _page }, key: string) => {
  expect(world.lastDiscoveryBody).toHaveProperty(key)
})

Then('the discovery response contains an {string} field', async ({ page: _page }, key: string) => {
  expect(world.lastDiscoveryBody).toHaveProperty(key)
})

Then('the discovery response contains an {string} array', async ({ page: _page }, key: string) => {
  const value = world.lastDiscoveryBody?.[key]
  expect(Array.isArray(value)).toBe(true)
})

Then(
  'the discovery response lists {string} in {string}',
  async ({ page: _page }, item: string, key: string) => {
    const value = world.lastDiscoveryBody?.[key] as unknown[] | undefined
    expect(value).toContain(item)
  },
)

// ── OAuth authorization server metadata (RFC 8414) ──────────────────────────

When('I request the OAuth authorization server metadata', async () => {
  world.lastDiscoveryResponse = await fetch(
    `${AUTH_FUNCTION_URL}/.well-known/oauth-authorization-server`,
  )
  world.lastDiscoveryBody = await readBody(world.lastDiscoveryResponse)
})

// ── Dynamic Client Registration (RFC 7591) ──────────────────────────────────

When(
  'I register a new OAuth client with redirect_uris:',
  async ({ page: _page }, redirectUrisJson: string) => {
    const redirectUris = JSON.parse(redirectUrisJson) as string[]
    world.lastRegisterResponse = await fetch(`${AUTH_FUNCTION_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uris: redirectUris }),
    })
    world.lastRegisterBody = await readBody(world.lastRegisterResponse)
  },
)

Then('the registration response status is {int}', async ({ page: _page }, status: number) => {
  expect(world.lastRegisterResponse?.status).toBe(status)
})

Then('the registration response contains a {string} field', async ({ page: _page }, key: string) => {
  expect(world.lastRegisterBody).toHaveProperty(key)
})

Then(
  'the registration response contains token_endpoint_auth_method {string}',
  async ({ page: _page }, method: string) => {
    expect(world.lastRegisterBody?.token_endpoint_auth_method).toBe(method)
  },
)

// ── PKCE authorization code flow ─────────────────────────────────────────────

const OAUTH_REDIRECT_URI = 'https://chatgpt.com/aip/oauth/callback'

Given('a PKCE code verifier and matching code_challenge', async () => {
  const crypto = await import('node:crypto')
  const verifierBytes = crypto.randomBytes(32)
  const verifier = base64UrlEncode(verifierBytes)
  const challenge = base64UrlEncode(crypto.createHash('sha256').update(verifier).digest())
  world.pkceVerifier = verifier
  world.pkceChallenge = challenge
})

When(
  'I request an authorization code with email and password and the code_challenge',
  async () => {
    const email = world.oauthEmail
    const password = world.oauthPassword
    const codeChallenge = world.pkceChallenge
    if (!email || !password || !codeChallenge) {
      throw new Error('Missing seeded user credentials or PKCE code_challenge')
    }

    const authorizeUrl = new URL(`${AUTH_FUNCTION_URL}/authorize`)
    authorizeUrl.searchParams.set('client_id', 'planny-test-client')
    authorizeUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI)
    authorizeUrl.searchParams.set('state', 'test-state-123')
    authorizeUrl.searchParams.set('email', email)
    authorizeUrl.searchParams.set('password', password)
    authorizeUrl.searchParams.set('code_challenge', codeChallenge)
    authorizeUrl.searchParams.set('code_challenge_method', 'S256')

    const res = await fetch(authorizeUrl.toString(), { redirect: 'manual' })
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    if (!location) throw new Error('Expected a Location header on the /authorize redirect')
    world.lastAuthRedirectUrl = new URL(location)
  },
)

Then('I am redirected with an authorization code and the original state', async () => {
  const redirectUrl = world.lastAuthRedirectUrl
  expect(redirectUrl).not.toBeNull()
  world.lastAuthCode = redirectUrl?.searchParams.get('code') ?? null
  world.lastAuthState = redirectUrl?.searchParams.get('state') ?? null
  expect(world.lastAuthCode).not.toBeNull()
  expect(world.lastAuthState).toBe('test-state-123')
})

async function exchangeAuthCode(codeVerifier?: string): Promise<void> {
  const code = world.lastAuthCode
  if (!code) throw new Error('No authorization code captured yet')
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: OAUTH_REDIRECT_URI,
  }
  if (codeVerifier !== undefined) body.code_verifier = codeVerifier

  world.lastTokenResponse = await fetch(`${AUTH_FUNCTION_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  world.lastTokenBody = await readBody(world.lastTokenResponse)
  const refreshToken = (world.lastTokenBody as { refresh_token?: string })?.refresh_token
  if (refreshToken) world.lastRefreshToken = refreshToken
}

When('I exchange the authorization code for tokens using the code_verifier', async () => {
  const verifier = world.pkceVerifier
  if (!verifier) throw new Error('No PKCE code_verifier generated yet')
  await exchangeAuthCode(verifier)
})

When('I exchange the authorization code for tokens without a code_verifier', async () => {
  await exchangeAuthCode(undefined)
})

When('I exchange the authorization code for tokens using a wrong code_verifier', async () => {
  await exchangeAuthCode('this-is-definitely-the-wrong-verifier')
})

Then('the OAuth token response contains an access_token and refresh_token', async () => {
  expect(world.lastTokenResponse?.status).toBe(200)
  expect(world.lastTokenBody).toHaveProperty('access_token')
  expect(world.lastTokenBody).toHaveProperty('refresh_token')
})

Then('the OAuth token exchange fails with status {int}', async ({ page: _page }, status: number) => {
  expect(world.lastTokenResponse?.status).toBe(status)
})

// ── Password & refresh grants ────────────────────────────────────────────────

When(
  "I request tokens with the password grant using the seeded user's credentials",
  async () => {
    world.lastTokenResponse = await fetch(`${AUTH_FUNCTION_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        email: world.oauthEmail,
        password: world.oauthPassword,
      }),
    })
    world.lastTokenBody = await readBody(world.lastTokenResponse)
    const refreshToken = (world.lastTokenBody as { refresh_token?: string })?.refresh_token
    if (refreshToken) world.lastRefreshToken = refreshToken
  },
)

When("I request tokens with the refresh_token grant using the last refresh token", async () => {
  expect(world.lastRefreshToken).not.toBeNull()
  world.lastTokenResponse = await fetch(`${AUTH_FUNCTION_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: world.lastRefreshToken,
    }),
  })
  world.lastTokenBody = await readBody(world.lastTokenResponse)
  const refreshToken = (world.lastTokenBody as { refresh_token?: string })?.refresh_token
  if (refreshToken) world.lastRefreshToken = refreshToken
})

// ── Private helpers ───────────────────────────────────────────────────────

/** Extract the text content from an MCP tools/call result body. */
function extractMcpText(body: Record<string, unknown> | null): string | null {
  if (!body) return null
  const result = (body as { result?: { content?: { type: string; text: string }[] } })?.result
  const content = result?.content ?? []
  const textItem = content.find((c) => c.type === 'text')
  return textItem?.text ?? null
}

