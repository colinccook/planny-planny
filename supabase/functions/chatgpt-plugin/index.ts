// Planny Planny — ChatGPT Plugin Edge Function
//
// This function acts as the backend for a ChatGPT Custom Action (REST)
// AND as an MCP (Model Context Protocol) server for ChatGPT's "New Plugin"
// form. It authenticates via a Supabase user JWT so all Supabase RLS
// policies apply — users can only see and mutate data in
// households they belong to.
//
// MCP endpoint (chatgpt.com "New Plugin" form):
//   POST /chatgpt-plugin/sse    MCP Streamable-HTTP transport (2025-03-26)
//
// REST routes (full feature parity with the Planny Planny app):
//
//   Todos
//     GET    /chatgpt-plugin/todos              list todos
//     POST   /chatgpt-plugin/todos              create a todo
//     PATCH  /chatgpt-plugin/todos/:id          update title/date/note
//     POST   /chatgpt-plugin/todos/:id/complete mark as done
//     POST   /chatgpt-plugin/todos/:id/reopen   un-tick a todo
//     DELETE /chatgpt-plugin/todos/:id          delete permanently
//
//   Meals
//     GET    /chatgpt-plugin/meals              list meal plans (date range)
//     POST   /chatgpt-plugin/meals              add a meal
//     PATCH  /chatgpt-plugin/meals/:id          update title/date/description
//     DELETE /chatgpt-plugin/meals/:id          delete a meal
//     POST   /chatgpt-plugin/meals/:id/copy     copy (or move) to another date
//
//   Meal outcomes (did it actually happen?)
//     GET    /chatgpt-plugin/outcomes           list outcomes (date range)
//     PUT    /chatgpt-plugin/outcomes/:meal_id  upsert outcome for a meal
//     DELETE /chatgpt-plugin/outcomes/:meal_id  clear an outcome
//
//   Ideas
//     GET    /chatgpt-plugin/ideas              list meal ideas
//     POST   /chatgpt-plugin/ideas              propose an idea
//     DELETE /chatgpt-plugin/ideas/:id          delete an idea
//
//   Events (day contexts)
//     GET    /chatgpt-plugin/events             list events (date range)
//     POST   /chatgpt-plugin/events             create an event
//     PATCH  /chatgpt-plugin/events/:id         update an event
//     DELETE /chatgpt-plugin/events/:id         delete an event
//
//   Shopping list (store cupboard)
//     GET    /chatgpt-plugin/shopping-list      ingredients for upcoming meals
//
// Error shape:   { error: string }
// Success shape: documented in public/openapi.json

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function weekFromToday(): string {
  const d = new Date()
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

async function parseBody(req: Request): Promise<Record<string, unknown> | Response> {
  try {
    return await req.json() as Record<string, unknown>
  } catch {
    return err('Invalid JSON body')
  }
}

// ─── MCP tool definitions ──────────────────────────────────────────────────
//
// Exposed as MCP tools via the POST /sse endpoint (MCP Streamable-HTTP
// transport, 2025-03-26 spec). Each tool maps 1-to-1 with a REST route.

const MCP_TOOLS = [
  // Todos
  {
    name: 'list_todos',
    description: 'List open (or completed) todo items for the household.',
    inputSchema: {
      type: 'object',
      properties: {
        completed: { type: 'boolean', description: 'true = show completed todos; omit or false = show open todos' },
      },
    },
  },
  {
    name: 'create_todo',
    description: 'Create a new todo item.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Todo title (required)' },
        date: { type: 'string', description: 'Due date (YYYY-MM-DD, optional)' },
        note: { type: 'string', description: 'Extra notes (optional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_todo',
    description: 'Update title, date, or note on an existing todo.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Todo ID (UUID)' },
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        note: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_todo',
    description: 'Mark a todo as done.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Todo ID' },
        completed_on: { type: 'string', description: 'Completion date YYYY-MM-DD (defaults to today)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'reopen_todo',
    description: 'Un-tick a completed todo.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Todo ID' } },
      required: ['id'],
    },
  },
  {
    name: 'delete_todo',
    description: 'Delete a todo permanently.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Todo ID' } },
      required: ['id'],
    },
  },
  // Meals
  {
    name: 'list_meals',
    description: 'List meal plans for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date YYYY-MM-DD (defaults to today)' },
        to: { type: 'string', description: 'End date YYYY-MM-DD (defaults to today +6 days)' },
      },
    },
  },
  {
    name: 'create_meal',
    description: 'Add a meal to the plan.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Meal title (required)' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_meal',
    description: 'Update title, date, or description on an existing meal.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Meal ID' },
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'copy_meal',
    description: 'Copy (or move) a meal to another date.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Meal ID' },
        target_date: { type: 'string', description: 'Destination date YYYY-MM-DD' },
        move: { type: 'boolean', description: 'true = delete original after copying' },
      },
      required: ['id', 'target_date'],
    },
  },
  {
    name: 'delete_meal',
    description: 'Delete a meal from the plan.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Meal ID' } },
      required: ['id'],
    },
  },
  // Outcomes
  {
    name: 'list_outcomes',
    description: 'List meal outcomes (did meals happen as planned?).',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'upsert_outcome',
    description: 'Record whether a meal happened as planned or not.',
    inputSchema: {
      type: 'object',
      properties: {
        meal_id: { type: 'string', description: 'Meal ID' },
        status: { type: 'string', enum: ['as_planned', 'did_not_happen'] },
        reason: { type: 'string', description: 'Required when status=did_not_happen. One of: no_shopping, ate_out, unexpected_event, didnt_fancy_it, other' },
        note: { type: 'string' },
      },
      required: ['meal_id', 'status'],
    },
  },
  {
    name: 'delete_outcome',
    description: 'Clear the outcome for a meal (mark as unrecorded).',
    inputSchema: {
      type: 'object',
      properties: { meal_id: { type: 'string', description: 'Meal ID' } },
      required: ['meal_id'],
    },
  },
  // Ideas
  {
    name: 'list_ideas',
    description: 'List meal ideas.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_idea',
    description: 'Add a new meal idea.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Idea title (required)' },
        description: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD (optional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'delete_idea',
    description: 'Delete a meal idea.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Idea ID' } },
      required: ['id'],
    },
  },
  // Events
  {
    name: 'list_events',
    description: 'List day events (visitor counts, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'create_event',
    description: 'Create a day event.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        end_date: { type: 'string', description: 'YYYY-MM-DD (optional)' },
        event_name: { type: 'string' },
        extra_adults: { type: 'integer' },
        extra_children: { type: 'integer' },
        extra_babies: { type: 'integer' },
      },
      required: ['date'],
    },
  },
  {
    name: 'update_event',
    description: 'Update a day event.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Event ID' },
        date: { type: 'string' },
        end_date: { type: 'string' },
        event_name: { type: 'string' },
        extra_adults: { type: 'integer' },
        extra_children: { type: 'integer' },
        extra_babies: { type: 'integer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_event',
    description: 'Delete a day event.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Event ID' } },
      required: ['id'],
    },
  },
  // Shopping list
  {
    name: 'get_shopping_list',
    description: 'Get the shopping list for upcoming meals.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
      },
    },
  },
] as const

// ─── MCP JSON-RPC helpers ─────────────────────────────────────────────────

interface McpRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

function mcpResult(id: string | number | null | undefined, result: unknown): Response {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id: id ?? null, result }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

function mcpError(
  id: string | number | null | undefined,
  code: number,
  message: string,
): Response {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

// ─── MCP tool executor ────────────────────────────────────────────────────
//
// Translates an MCP tools/call into a Supabase operation and returns an
// MCP-shaped content array.

async function executeMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  householdId: string,
): Promise<unknown> {
  const hid = householdId

  // ── Todos ──────────────────────────────────────────────────────────────

  if (toolName === 'list_todos') {
    const completed = args.completed === true
    let q = supabase
      .from('todo_items')
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .eq('household_id', hid)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
    if (completed) {
      q = q.not('completed_on', 'is', null)
    } else {
      q = q.is('completed_on', null)
    }
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return { todos: data }
  }

  if (toolName === 'create_todo') {
    const title = args.title
    if (typeof title !== 'string' || !title) throw new Error('title is required')
    const { data, error } = await supabase
      .from('todo_items')
      .insert({
        household_id: hid,
        user_id: userId,
        title,
        date: typeof args.date === 'string' ? args.date : null,
        note: typeof args.note === 'string' ? args.note : null,
      })
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .single()
    if (error) throw new Error(error.message)
    return { todo: data }
  }

  if (toolName === 'update_todo') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const patch: Record<string, unknown> = {}
    if (typeof args.title === 'string') patch.title = args.title
    if (typeof args.date === 'string') patch.date = args.date
    if (args.date === null) patch.date = null
    if (typeof args.note === 'string') patch.note = args.note
    if (args.note === null) patch.note = null
    if (Object.keys(patch).length === 0) throw new Error('No fields to update')
    const { data, error } = await supabase
      .from('todo_items')
      .update(patch)
      .eq('id', id)
      .eq('household_id', hid)
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Todo not found')
    return { todo: data }
  }

  if (toolName === 'complete_todo') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const completedOn = typeof args.completed_on === 'string'
      ? args.completed_on
      : new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('todo_items')
      .update({ completed_on: completedOn, completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('household_id', hid)
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Todo not found')
    return { todo: data }
  }

  if (toolName === 'reopen_todo') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const { data, error } = await supabase
      .from('todo_items')
      .update({ completed_on: null, completed_at: null })
      .eq('id', id)
      .eq('household_id', hid)
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Todo not found')
    return { todo: data }
  }

  if (toolName === 'delete_todo') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const { error } = await supabase
      .from('todo_items')
      .delete()
      .eq('id', id)
      .eq('household_id', hid)
    if (error) throw new Error(error.message)
    return { deleted: true }
  }

  // ── Meals ──────────────────────────────────────────────────────────────

  if (toolName === 'list_meals') {
    const from = typeof args.from === 'string' ? args.from : new Date().toISOString().slice(0, 10)
    const to = typeof args.to === 'string' ? args.to : (() => {
      const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10)
    })()
    const { data, error } = await supabase
      .from('meal_plans')
      .select('id, title, description, date, household_id, created_at')
      .eq('household_id', hid)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
    if (error) throw new Error(error.message)
    return { meals: data }
  }

  if (toolName === 'create_meal') {
    const title = args.title
    if (typeof title !== 'string' || !title) throw new Error('title is required')
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        household_id: hid,
        title,
        date: typeof args.date === 'string' ? args.date : new Date().toISOString().slice(0, 10),
        description: typeof args.description === 'string' ? args.description : null,
      })
      .select('id, title, description, date, household_id, created_at')
      .single()
    if (error) throw new Error(error.message)
    return { meal: data }
  }

  if (toolName === 'update_meal') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const patch: Record<string, unknown> = {}
    if (typeof args.title === 'string') patch.title = args.title
    if (typeof args.date === 'string') patch.date = args.date
    if (typeof args.description === 'string') patch.description = args.description
    if (args.description === null) patch.description = null
    if (Object.keys(patch).length === 0) throw new Error('No fields to update')
    const { data, error } = await supabase
      .from('meal_plans')
      .update(patch)
      .eq('id', id)
      .eq('household_id', hid)
      .select('id, title, description, date, household_id, created_at')
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Meal not found')
    return { meal: data }
  }

  if (toolName === 'copy_meal') {
    const id = args.id
    const targetDate = args.target_date
    if (typeof id !== 'string') throw new Error('id is required')
    if (typeof targetDate !== 'string') throw new Error('target_date is required')
    const { data: original, error: fetchError } = await supabase
      .from('meal_plans')
      .select('id, title, description')
      .eq('id', id)
      .eq('household_id', hid)
      .single()
    if (fetchError || !original) throw new Error('Meal not found')
    const { data: copy, error: insertError } = await supabase
      .from('meal_plans')
      .insert({ household_id: hid, title: original.title, description: original.description, date: targetDate })
      .select('id, title, description, date, household_id, created_at')
      .single()
    if (insertError) throw new Error(insertError.message)
    if (args.move === true) {
      await supabase.from('meal_plans').delete().eq('id', id).eq('household_id', hid)
    }
    return { meal: copy }
  }

  if (toolName === 'delete_meal') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id)
      .eq('household_id', hid)
    if (error) throw new Error(error.message)
    return { deleted: true }
  }

  // ── Outcomes ────────────────────────────────────────────────────────────

  if (toolName === 'list_outcomes') {
    const from = typeof args.from === 'string' ? args.from : new Date().toISOString().slice(0, 10)
    const to = typeof args.to === 'string' ? args.to : (() => {
      const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10)
    })()
    const { data, error } = await supabase
      .from('meal_outcomes')
      .select('meal_id, status, reason, note, recorded_at, meal_plans(date, title)')
      .eq('household_id', hid)
      .gte('meal_plans.date', from)
      .lte('meal_plans.date', to)
    if (error) throw new Error(error.message)
    return { outcomes: data }
  }

  if (toolName === 'upsert_outcome') {
    const mealId = args.meal_id
    const status = args.status
    if (typeof mealId !== 'string') throw new Error('meal_id is required')
    if (typeof status !== 'string') throw new Error('status is required')
    const VALID_STATUSES = new Set(['as_planned', 'did_not_happen'])
    if (!VALID_STATUSES.has(status)) throw new Error('status must be "as_planned" or "did_not_happen"')
    const VALID_REASONS = new Set(['no_shopping', 'ate_out', 'unexpected_event', 'didnt_fancy_it', 'other'])
    if (status === 'did_not_happen' && args.reason && !VALID_REASONS.has(args.reason as string)) {
      throw new Error(`reason must be one of: ${[...VALID_REASONS].join(', ')}`)
    }
    const { data, error } = await supabase
      .from('meal_outcomes')
      .upsert({
        meal_id: mealId,
        household_id: hid,
        status,
        reason: typeof args.reason === 'string' ? args.reason : null,
        note: typeof args.note === 'string' ? args.note : null,
        recorded_at: new Date().toISOString(),
      })
      .select('meal_id, status, reason, note, recorded_at')
      .single()
    if (error) throw new Error(error.message)
    return { outcome: data }
  }

  if (toolName === 'delete_outcome') {
    const mealId = args.meal_id
    if (typeof mealId !== 'string') throw new Error('meal_id is required')
    const { error } = await supabase
      .from('meal_outcomes')
      .delete()
      .eq('meal_id', mealId)
      .eq('household_id', hid)
    if (error) throw new Error(error.message)
    return { deleted: true }
  }

  // ── Ideas ──────────────────────────────────────────────────────────────

  if (toolName === 'list_ideas') {
    const { data, error } = await supabase
      .from('meal_ideas')
      .select('id, title, description, date, created_at')
      .eq('household_id', hid)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return { ideas: data }
  }

  if (toolName === 'create_idea') {
    const title = args.title
    if (typeof title !== 'string' || !title) throw new Error('title is required')
    const { data, error } = await supabase
      .from('meal_ideas')
      .insert({
        household_id: hid,
        title,
        description: typeof args.description === 'string' ? args.description : null,
        date: typeof args.date === 'string' ? args.date : null,
      })
      .select('id, title, description, date, created_at')
      .single()
    if (error) throw new Error(error.message)
    return { idea: data }
  }

  if (toolName === 'delete_idea') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const { error } = await supabase
      .from('meal_ideas')
      .delete()
      .eq('id', id)
      .eq('household_id', hid)
    if (error) throw new Error(error.message)
    return { deleted: true }
  }

  // ── Events ─────────────────────────────────────────────────────────────

  if (toolName === 'list_events') {
    const from = typeof args.from === 'string' ? args.from : new Date().toISOString().slice(0, 10)
    const to = typeof args.to === 'string' ? args.to : (() => {
      const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10)
    })()
    const { data, error } = await supabase
      .from('day_events')
      .select('id, date, end_date, event_name, extra_adults, extra_children, extra_babies, created_at')
      .eq('household_id', hid)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
    if (error) throw new Error(error.message)
    return { events: data }
  }

  if (toolName === 'create_event') {
    if (!args.date) throw new Error('date is required')
    const { data, error } = await supabase
      .from('day_events')
      .insert({
        household_id: hid,
        date: args.date,
        end_date: typeof args.end_date === 'string' ? args.end_date : null,
        event_name: typeof args.event_name === 'string' ? args.event_name : null,
        extra_adults: typeof args.extra_adults === 'number' ? args.extra_adults : 0,
        extra_children: typeof args.extra_children === 'number' ? args.extra_children : 0,
        extra_babies: typeof args.extra_babies === 'number' ? args.extra_babies : 0,
      })
      .select('id, date, end_date, event_name, extra_adults, extra_children, extra_babies, created_at')
      .single()
    if (error) throw new Error(error.message)
    return { event: data }
  }

  if (toolName === 'update_event') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const patch: Record<string, unknown> = {}
    if (typeof args.date === 'string') patch.date = args.date
    if (typeof args.end_date === 'string') patch.end_date = args.end_date
    if (args.end_date === null) patch.end_date = null
    if (typeof args.event_name === 'string') patch.event_name = args.event_name
    if (args.event_name === null) patch.event_name = null
    if (typeof args.extra_adults === 'number') patch.extra_adults = args.extra_adults
    if (typeof args.extra_children === 'number') patch.extra_children = args.extra_children
    if (typeof args.extra_babies === 'number') patch.extra_babies = args.extra_babies
    if (Object.keys(patch).length === 0) throw new Error('No fields to update')
    const { data, error } = await supabase
      .from('day_events')
      .update(patch)
      .eq('id', id)
      .eq('household_id', hid)
      .select('id, date, end_date, event_name, extra_adults, extra_children, extra_babies, created_at')
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Event not found')
    return { event: data }
  }

  if (toolName === 'delete_event') {
    const id = args.id
    if (typeof id !== 'string') throw new Error('id is required')
    const { error } = await supabase
      .from('day_events')
      .delete()
      .eq('id', id)
      .eq('household_id', hid)
    if (error) throw new Error(error.message)
    return { deleted: true }
  }

  // ── Shopping list ──────────────────────────────────────────────────────

  if (toolName === 'get_shopping_list') {
    const from = typeof args.from === 'string' ? args.from : new Date().toISOString().slice(0, 10)
    const to = typeof args.to === 'string' ? args.to : (() => {
      const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10)
    })()
    const { data: meals, error } = await supabase
      .from('meal_plans')
      .select('id, title, date, ingredients:meal_plan_ingredients(ingredient_id, ingredients(id, name, starred))')
      .eq('household_id', hid)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
    if (error) throw new Error(error.message)
    interface IngRow { ingredient_id: string; ingredients: { id: string; name: string; starred: boolean } | null }
    interface MealRow { id: string; title: string; date: string; ingredients: IngRow[] }
    const mealList = (meals ?? []) as unknown as MealRow[]
    const map = new Map<string, { name: string; starred: boolean; meal_count: number; meals: { title: string; date: string }[] }>()
    for (const meal of mealList) {
      for (const ing of (meal.ingredients ?? [])) {
        if (!ing.ingredients) continue
        const key = ing.ingredients.id
        if (!map.has(key)) {
          map.set(key, { name: ing.ingredients.name, starred: ing.ingredients.starred, meal_count: 0, meals: [] })
        }
        const entry = map.get(key)
        if (entry) {
          entry.meal_count++
          entry.meals.push({ title: meal.title, date: meal.date })
        }
      }
    }
    const shopping_list = [...map.values()].sort((a, b) => {
      if (a.starred && !b.starred) return -1
      if (!a.starred && b.starred) return 1
      return a.name.localeCompare(b.name)
    })
    return { shopping_list }
  }

  throw new Error(`Unknown tool: ${toolName}`)
}

// ─── MCP Streamable-HTTP handler ─────────────────────────────────────────
//
// Called for POST /sse.  Parses a JSON-RPC 2.0 message, handles MCP
// lifecycle methods without auth, and delegates tools/call to
// executeMcpTool (which requires auth + a resolved household).

async function handleMcp(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<Response> {
  let body: McpRequest
  try {
    body = await req.json() as McpRequest
  } catch {
    return mcpError(null, -32700, 'Parse error — invalid JSON')
  }

  const { id, method, params = {} } = body

  // ── initialize ────────────────────────────────────────────────────────
  if (method === 'initialize') {
    return mcpResult(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'Planny Planny', version: '1.0.0' },
    })
  }

  // ── notifications/initialized ─────────────────────────────────────────
  if (method === 'notifications/initialized') {
    // Notification — no response body needed.
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // ── tools/list ────────────────────────────────────────────────────────
  if (method === 'tools/list') {
    return mcpResult(id, { tools: MCP_TOOLS })
  }

  // ── tools/call ────────────────────────────────────────────────────────
  if (method === 'tools/call') {
    // Auth is required for data access.
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return mcpError(id, -32001, 'Unauthorised — provide a valid Supabase JWT')
    }

    const toolName = typeof params.name === 'string' ? params.name : ''
    const toolArgs = (params.arguments ?? {}) as Record<string, unknown>
    const reqUrl = new URL(req.url)

    // Resolve household.
    let householdId = reqUrl.searchParams.get('household_id') ?? null
    if (!householdId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_household_id')
        .eq('id', user.id)
        .single()
      householdId = profile?.last_household_id ?? null
    }
    if (!householdId) {
      return mcpError(
        id,
        -32002,
        'No household resolved. Pass ?household_id=<uuid> or set your last active household in the app first.',
      )
    }

    try {
      const result = await executeMcpTool(toolName, toolArgs, supabase, user.id, householdId)
      return mcpResult(id, {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      })
    } catch (e) {
      // Log the full error server-side; only the message (never a stack trace)
      // is returned to the client.
      console.error('MCP tools/call error:', e)
      const msg = e instanceof Error ? e.message : 'Internal error'
      return mcpError(id, -32603, msg)
    }
  }

  return mcpError(id, -32601, `Method not found: ${method}`)
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  // Parse path early — needed to route the MCP endpoint before auth.
  const url = new URL(req.url)
  // Strip the function mount path (/chatgpt-plugin) so path parsing works
  // both locally (where Deno serves the function at /) and on the hosted
  // Supabase edge (where it is mounted at /functions/v1/chatgpt-plugin).
  const stripped = url.pathname
    .replace(/^\/functions\/v1\/chatgpt-plugin/, '')
    .replace(/^\/chatgpt-plugin/, '')
    .replace(/^\//, '')
  const pathParts = stripped.split('/').filter(Boolean)

  // resource = "todos" | "meals" | "ideas" | "events" | "outcomes" | "shopping-list" | "sse"
  const resource = pathParts[0] ?? ''

  // ── MCP Streamable-HTTP endpoint ─────────────────────────────────────
  // POST /sse — used by chatgpt.com "New Plugin" form.
  if (resource === 'sse' && req.method === 'POST') {
    return await handleMcp(req, supabaseUrl, supabaseAnonKey)
  }

  // Build a client that carries the caller's JWT so RLS applies.
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Verify the caller is authenticated.
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return err('Unauthorised — provide a valid Supabase JWT in the Authorization header', 401)
  }

  // Resolve the household the user wants to interact with.
  // Priority: ?household_id query param → last_household_id on their profile.

  // resourceId is present for /todos/:id, /meals/:id, etc.
  const resourceId = pathParts[1] ?? null
  // subAction is present for /todos/:id/complete, /meals/:id/copy, etc.
  const subAction = pathParts[2] ?? null

  let householdId = url.searchParams.get('household_id') ?? null

  if (!householdId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_household_id')
      .eq('id', user.id)
      .single()
    householdId = profile?.last_household_id ?? null
  }

  if (!householdId && resource !== '') {
    return err(
      'No household resolved. Pass ?household_id=<uuid> or set your last active household in the app first.',
      400,
    )
  }

  const hid = householdId ?? ''

  // ═══════════════════════════════════════════════════════════
  // TODOS
  // ═══════════════════════════════════════════════════════════

  // GET /todos
  if (resource === 'todos' && !resourceId && req.method === 'GET') {
    const completed = url.searchParams.get('completed')
    let q = supabase
      .from('todo_items')
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .eq('household_id', hid)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })

    if (completed === 'true') {
      q = q.not('completed_on', 'is', null)
    } else {
      // Default: incomplete only
      q = q.is('completed_on', null)
    }

    const { data, error } = await q
    if (error) return err(error.message, 500)
    return json({ todos: data })
  }

  // POST /todos  — create
  if (resource === 'todos' && !resourceId && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return err('title is required')

    const date = typeof body.date === 'string' ? body.date : today()
    const note = typeof body.note === 'string' ? body.note : null

    const { data, error } = await supabase
      .from('todo_items')
      .insert({ household_id: hid, title, date, note, created_by: user.id })
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .single()

    if (error) return err(error.message, 500)
    return json({ todo: data }, 201)
  }

  // PATCH /todos/:id  — update title / date / note
  if (resource === 'todos' && resourceId && !subAction && req.method === 'PATCH') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const patch: Record<string, unknown> = {}
    if (typeof body.title === 'string') patch.title = body.title.trim()
    if (typeof body.date === 'string') patch.date = body.date
    if ('note' in body) patch.note = typeof body.note === 'string' ? body.note : null

    if (Object.keys(patch).length === 0) return err('No fields to update')

    const { data, error } = await supabase
      .from('todo_items')
      .update(patch)
      .eq('id', resourceId)
      .eq('household_id', hid)
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .single()

    if (error) return err(error.message, 500)
    if (!data) return err('Todo not found', 404)
    return json({ todo: data })
  }

  // POST /todos/:id/complete  — mark done
  if (resource === 'todos' && resourceId && subAction === 'complete' && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const completedOn = typeof body.completed_on === 'string' ? body.completed_on : today()

    const { data, error } = await supabase
      .from('todo_items')
      .update({ completed_on: completedOn, completed_at: new Date().toISOString() })
      .eq('id', resourceId)
      .eq('household_id', hid)
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .single()

    if (error) return err(error.message, 500)
    if (!data) return err('Todo not found', 404)
    return json({ todo: data })
  }

  // POST /todos/:id/reopen  — un-tick
  if (resource === 'todos' && resourceId && subAction === 'reopen' && req.method === 'POST') {
    const { data, error } = await supabase
      .from('todo_items')
      .update({ completed_on: null, completed_at: null })
      .eq('id', resourceId)
      .eq('household_id', hid)
      .select('id, title, note, date, completed_on, completed_at, user_id, created_at')
      .single()

    if (error) return err(error.message, 500)
    if (!data) return err('Todo not found', 404)
    return json({ todo: data })
  }

  // DELETE /todos/:id
  if (resource === 'todos' && resourceId && !subAction && req.method === 'DELETE') {
    const { error } = await supabase
      .from('todo_items')
      .delete()
      .eq('id', resourceId)
      .eq('household_id', hid)

    if (error) return err(error.message, 500)
    return json({ deleted: true })
  }

  // ═══════════════════════════════════════════════════════════
  // MEALS
  // ═══════════════════════════════════════════════════════════

  // GET /meals
  if (resource === 'meals' && !resourceId && req.method === 'GET') {
    const from = url.searchParams.get('from') ?? today()
    const to = url.searchParams.get('to') ?? weekFromToday()

    const { data, error } = await supabase
      .from('meal_plans')
      .select('id, date, title, description, created_at')
      .eq('household_id', hid)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })

    if (error) return err(error.message, 500)
    return json({ meals: data })
  }

  // POST /meals  — create
  if (resource === 'meals' && !resourceId && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return err('title is required')

    const date = typeof body.date === 'string' ? body.date : today()
    const description = typeof body.description === 'string' ? body.description : null

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({ household_id: hid, title, date, description, created_by: user.id })
      .select('id, date, title, description, created_at')
      .single()

    if (error) return err(error.message, 500)
    return json({ meal: data }, 201)
  }

  // PATCH /meals/:id  — update title / date / description
  if (resource === 'meals' && resourceId && !subAction && req.method === 'PATCH') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const patch: Record<string, unknown> = {}
    if (typeof body.title === 'string') patch.title = body.title.trim()
    if (typeof body.date === 'string') patch.date = body.date
    if ('description' in body) patch.description = typeof body.description === 'string' ? body.description : null

    if (Object.keys(patch).length === 0) return err('No fields to update')

    const { data, error } = await supabase
      .from('meal_plans')
      .update(patch)
      .eq('id', resourceId)
      .eq('household_id', hid)
      .select('id, date, title, description, created_at')
      .single()

    if (error) return err(error.message, 500)
    if (!data) return err('Meal not found', 404)
    return json({ meal: data })
  }

  // POST /meals/:id/copy  — copy (or move) to another date
  if (resource === 'meals' && resourceId && subAction === 'copy' && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const targetDate = typeof body.target_date === 'string' ? body.target_date : null
    if (!targetDate) return err('target_date is required (YYYY-MM-DD)')

    const move = body.move === true

    // Fetch the original meal + its ingredient links.
    const { data: original, error: fetchErr } = await supabase
      .from('meal_plans')
      .select('id, household_id, title, description, meal_plan_ingredients(ingredient_id)')
      .eq('id', resourceId)
      .eq('household_id', hid)
      .single()

    if (fetchErr || !original) return err('Meal not found', 404)

    // Create the copy.
    const { data: copy, error: copyErr } = await supabase
      .from('meal_plans')
      .insert({
        household_id: hid,
        date: targetDate,
        title: original.title,
        description: original.description,
        created_by: user.id,
      })
      .select('id, date, title, description, created_at')
      .single()

    if (copyErr || !copy) return err(copyErr?.message ?? 'Copy failed', 500)

    // Re-link ingredients.
    const ingredientIds = (original.meal_plan_ingredients ?? []).map(
      (mpi: { ingredient_id: string }) => mpi.ingredient_id
    )
    if (ingredientIds.length > 0) {
      const { error: ingErr } = await supabase
        .from('meal_plan_ingredients')
        .insert(ingredientIds.map((id: string) => ({ meal_plan_id: copy.id, ingredient_id: id })))
      if (ingErr) return err(ingErr.message, 500)
    }

    // If moving, delete the original.
    if (move) {
      const { error: delErr } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', resourceId)
        .eq('household_id', hid)
      if (delErr) return err(delErr.message, 500)
    }

    return json({ meal: copy, moved: move }, 201)
  }

  // DELETE /meals/:id
  if (resource === 'meals' && resourceId && !subAction && req.method === 'DELETE') {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', resourceId)
      .eq('household_id', hid)

    if (error) return err(error.message, 500)
    return json({ deleted: true })
  }

  // ═══════════════════════════════════════════════════════════
  // MEAL OUTCOMES
  // ═══════════════════════════════════════════════════════════

  const VALID_REASONS = new Set([
    'no_shopping', 'ate_out', 'unexpected_event', 'didnt_fancy_it', 'other',
  ])

  // GET /outcomes
  if (resource === 'outcomes' && !resourceId && req.method === 'GET') {
    const from = url.searchParams.get('from') ?? today()
    const to = url.searchParams.get('to') ?? weekFromToday()

    const { data, error } = await supabase
      .from('meal_outcomes')
      .select('id, meal_plan_id, status, reason, note, recorded_by, created_at, updated_at, meal_plans!inner(date, title)')
      .eq('household_id', hid)
      .gte('meal_plans.date', from)
      .lte('meal_plans.date', to)

    if (error) return err(error.message, 500)
    return json({ outcomes: data })
  }

  // PUT /outcomes/:meal_id  — upsert outcome for a meal plan row
  if (resource === 'outcomes' && resourceId && !subAction && req.method === 'PUT') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const status = body.status === 'as_planned' ? 'as_planned'
      : body.status === 'did_not_happen' ? 'did_not_happen'
      : null
    if (!status) return err('status must be "as_planned" or "did_not_happen"')

    const rawReason = typeof body.reason === 'string' ? body.reason : null
    if (rawReason !== null && !VALID_REASONS.has(rawReason)) {
      return err(`reason must be one of: ${[...VALID_REASONS].join(', ')}`)
    }
    const reason = status === 'as_planned' ? null : rawReason
    const note = status === 'as_planned' ? null : (typeof body.note === 'string' ? body.note : null)

    const { data, error } = await supabase
      .from('meal_outcomes')
      .upsert(
        { meal_plan_id: resourceId, household_id: hid, status, reason, note, recorded_by: user.id },
        { onConflict: 'meal_plan_id' },
      )
      .select('id, meal_plan_id, status, reason, note, recorded_by, created_at, updated_at')
      .single()

    if (error) return err(error.message, 500)
    return json({ outcome: data })
  }

  // DELETE /outcomes/:meal_id  — clear an outcome
  if (resource === 'outcomes' && resourceId && !subAction && req.method === 'DELETE') {
    const { error } = await supabase
      .from('meal_outcomes')
      .delete()
      .eq('meal_plan_id', resourceId)
      .eq('household_id', hid)

    if (error) return err(error.message, 500)
    return json({ deleted: true })
  }

  // ═══════════════════════════════════════════════════════════
  // IDEAS
  // ═══════════════════════════════════════════════════════════

  // GET /ideas
  if (resource === 'ideas' && !resourceId && req.method === 'GET') {
    const { data, error } = await supabase
      .from('meal_ideas')
      .select('id, title, description, date, created_at')
      .eq('household_id', hid)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return err(error.message, 500)
    return json({ ideas: data })
  }

  // POST /ideas  — propose
  if (resource === 'ideas' && !resourceId && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return err('title is required')

    const description = typeof body.description === 'string' ? body.description : null
    const date = typeof body.date === 'string' ? body.date : null

    const { data, error } = await supabase
      .from('meal_ideas')
      .insert({ household_id: hid, title, description, date, created_by: user.id })
      .select('id, title, description, date, created_at')
      .single()

    if (error) return err(error.message, 500)
    return json({ idea: data }, 201)
  }

  // DELETE /ideas/:id
  if (resource === 'ideas' && resourceId && !subAction && req.method === 'DELETE') {
    const { error } = await supabase
      .from('meal_ideas')
      .delete()
      .eq('id', resourceId)
      .eq('household_id', hid)

    if (error) return err(error.message, 500)
    return json({ deleted: true })
  }

  // ═══════════════════════════════════════════════════════════
  // EVENTS (day contexts)
  // ═══════════════════════════════════════════════════════════

  // GET /events
  if (resource === 'events' && !resourceId && req.method === 'GET') {
    const from = url.searchParams.get('from') ?? today()
    const to = url.searchParams.get('to') ?? weekFromToday()

    const { data, error } = await supabase
      .from('day_contexts')
      .select('id, date, end_date, event_name, extra_adults, extra_children, extra_babies, created_at')
      .eq('household_id', hid)
      .lte('date', to)
      .or(`end_date.gte.${from},and(end_date.is.null,date.gte.${from})`)
      .order('date', { ascending: true })

    if (error) return err(error.message, 500)
    return json({ events: data })
  }

  // POST /events  — create
  if (resource === 'events' && !resourceId && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const date = typeof body.date === 'string' ? body.date : today()
    const event_name = typeof body.event_name === 'string' ? body.event_name : null
    const end_date = typeof body.end_date === 'string' ? body.end_date : null
    const extra_adults = typeof body.extra_adults === 'number' ? Math.max(0, body.extra_adults) : 0
    const extra_children = typeof body.extra_children === 'number' ? Math.max(0, body.extra_children) : 0
    const extra_babies = typeof body.extra_babies === 'number' ? Math.max(0, body.extra_babies) : 0

    const { data, error } = await supabase
      .from('day_contexts')
      .insert({ household_id: hid, date, end_date, event_name, extra_adults, extra_children, extra_babies })
      .select('id, date, end_date, event_name, extra_adults, extra_children, extra_babies, created_at')
      .single()

    if (error) return err(error.message, 500)
    return json({ event: data }, 201)
  }

  // PATCH /events/:id  — update an event
  if (resource === 'events' && resourceId && !subAction && req.method === 'PATCH') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const patch: Record<string, unknown> = {}
    if (typeof body.date === 'string') patch.date = body.date
    if ('end_date' in body) patch.end_date = typeof body.end_date === 'string' ? body.end_date : null
    if ('event_name' in body) patch.event_name = typeof body.event_name === 'string' ? body.event_name : null
    if (typeof body.extra_adults === 'number') patch.extra_adults = Math.max(0, body.extra_adults)
    if (typeof body.extra_children === 'number') patch.extra_children = Math.max(0, body.extra_children)
    if (typeof body.extra_babies === 'number') patch.extra_babies = Math.max(0, body.extra_babies)

    if (Object.keys(patch).length === 0) return err('No fields to update')

    const { data, error } = await supabase
      .from('day_contexts')
      .update(patch)
      .eq('id', resourceId)
      .eq('household_id', hid)
      .select('id, date, end_date, event_name, extra_adults, extra_children, extra_babies, created_at')
      .single()

    if (error) return err(error.message, 500)
    if (!data) return err('Event not found', 404)
    return json({ event: data })
  }

  // DELETE /events/:id
  if (resource === 'events' && resourceId && !subAction && req.method === 'DELETE') {
    const { error } = await supabase
      .from('day_contexts')
      .delete()
      .eq('id', resourceId)
      .eq('household_id', hid)

    if (error) return err(error.message, 500)
    return json({ deleted: true })
  }

  // ═══════════════════════════════════════════════════════════
  // SHOPPING LIST (store cupboard)
  // ═══════════════════════════════════════════════════════════
  //
  // Returns ingredients linked to upcoming meal plans, aggregated
  // so ChatGPT can say "you need milk (for pasta Monday, soup Wed)".
  // Mirrors useCupboardIngredients.ts logic server-side.

  if (resource === 'shopping-list' && !resourceId && req.method === 'GET') {
    const from = url.searchParams.get('from') ?? today()
    const to = url.searchParams.get('to') ?? '2099-12-31'

    const { data: plans, error } = await supabase
      .from('meal_plans')
      .select('id, title, date, meal_plan_ingredients(ingredients(id, name, starred, warning))')
      .eq('household_id', hid)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })

    if (error) return err(error.message, 500)

    interface IngEntry {
      id: string; name: string; starred: boolean; warning: boolean
      meal_count: number; meals: { title: string; date: string }[]
    }
    const map = new Map<string, IngEntry>()

    for (const plan of (plans ?? [])) {
      for (const mpi of (plan.meal_plan_ingredients ?? [])) {
        const ing = (mpi as unknown as { ingredients: IngEntry | null }).ingredients
        if (!ing) continue
        const existing = map.get(ing.id)
        if (existing) {
          existing.meal_count++
          existing.meals.push({ title: plan.title, date: plan.date })
        } else {
          map.set(ing.id, {
            id: ing.id, name: ing.name, starred: ing.starred, warning: ing.warning,
            meal_count: 1, meals: [{ title: plan.title, date: plan.date }],
          })
        }
      }
    }

    const shopping_list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
    return json({ shopping_list })
  }

  return err('Not found', 404)
})

