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
  return path
    .replace(':meal_id', world.lastMealId ?? ':meal_id')
    .replace(':id', (() => {
      // Pick the most recently created resource id based on the path prefix.
      if (path.startsWith('todos')) return world.lastTodoId ?? ':id'
      if (path.startsWith('meals')) return world.lastMealId ?? ':id'
      if (path.startsWith('ideas')) return world.lastIdeaId ?? ':id'
      if (path.startsWith('events')) return world.lastEventId ?? ':id'
      if (path.startsWith('outcomes')) return world.lastMealId ?? ':id'
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
