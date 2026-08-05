// Planny Planny — ChatGPT Plugin Edge Function
//
// This function acts as the backend for a ChatGPT Custom Action
// (previously called a "Plugin"). ChatGPT authenticates using a
// Supabase user JWT (OAuth / API key flow explained in
// docs/chatgpt-plugin.md). Every request therefore runs under a
// real user identity and all Supabase RLS policies apply.
//
// Routes:
//   GET  /chatgpt-plugin/todos            list household todo items
//   POST /chatgpt-plugin/todos            create a todo item
//   GET  /chatgpt-plugin/meals            list meal plans (date range)
//   POST /chatgpt-plugin/meals            add a meal plan entry
//   GET  /chatgpt-plugin/ideas            list meal ideas
//   POST /chatgpt-plugin/ideas            propose a meal idea
//   GET  /chatgpt-plugin/events           list day-context events
//
// Error shape: { error: string }
// Success shape: documented in public/openapi.json

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Build a client that uses the caller's JWT so RLS applies.
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Verify the caller is authenticated.
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return err('Unauthorised — provide a valid Supabase JWT as ******', 401)
  }

  // Resolve the household the user wants to interact with.
  // Priority: ?household_id query param → last_household_id on their profile.
  const url = new URL(req.url)
  const pathParts = url.pathname.replace(/^\/chatgpt-plugin\/?/, '').split('/')
  const resource = pathParts[0] // e.g. "todos", "meals", "ideas", "events"

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
      'No household resolved. Pass ?household_id=<uuid> or set your last active household in the app.',
      400,
    )
  }

  // ── GET /todos ──────────────────────────────────────────────
  if (resource === 'todos' && req.method === 'GET') {
    const completed = url.searchParams.get('completed')
    let query = supabase
      .from('todo_items')
      .select('id, title, note, date, completed_on, user_id, created_at')
      .eq('household_id', householdId!)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })

    if (completed === 'false' || completed === null) {
      query = query.is('completed_on', null)
    } else if (completed === 'true') {
      query = query.not('completed_on', 'is', null)
    }

    const { data, error } = await query
    if (error) return err(error.message, 500)
    return json({ todos: data })
  }

  // ── POST /todos ─────────────────────────────────────────────
  if (resource === 'todos' && req.method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return err('Invalid JSON body')
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return err('title is required')

    const date = typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10)
    const note = typeof body.note === 'string' ? body.note : null

    const { data, error } = await supabase
      .from('todo_items')
      .insert({
        household_id: householdId!,
        title,
        date,
        note,
        created_by: user.id,
      })
      .select('id, title, note, date, created_at')
      .single()

    if (error) return err(error.message, 500)
    return json({ todo: data }, 201)
  }

  // ── GET /meals ──────────────────────────────────────────────
  if (resource === 'meals' && req.method === 'GET') {
    const from = url.searchParams.get('from') ?? new Date().toISOString().slice(0, 10)
    const to = url.searchParams.get('to') ?? (() => {
      const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10)
    })()

    const { data, error } = await supabase
      .from('meal_plans')
      .select('id, date, title, description, created_at')
      .eq('household_id', householdId!)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })

    if (error) return err(error.message, 500)
    return json({ meals: data })
  }

  // ── POST /meals ─────────────────────────────────────────────
  if (resource === 'meals' && req.method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return err('Invalid JSON body')
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return err('title is required')

    const date = typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10)
    const description = typeof body.description === 'string' ? body.description : null

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        household_id: householdId!,
        title,
        date,
        description,
        created_by: user.id,
      })
      .select('id, date, title, description, created_at')
      .single()

    if (error) return err(error.message, 500)
    return json({ meal: data }, 201)
  }

  // ── GET /ideas ──────────────────────────────────────────────
  if (resource === 'ideas' && req.method === 'GET') {
    const { data, error } = await supabase
      .from('meal_ideas')
      .select('id, title, description, date, created_at')
      .eq('household_id', householdId!)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return err(error.message, 500)
    return json({ ideas: data })
  }

  // ── POST /ideas ─────────────────────────────────────────────
  if (resource === 'ideas' && req.method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return err('Invalid JSON body')
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return err('title is required')

    const description = typeof body.description === 'string' ? body.description : null
    const date = typeof body.date === 'string' ? body.date : null

    const { data, error } = await supabase
      .from('meal_ideas')
      .insert({
        household_id: householdId!,
        title,
        description,
        date,
        created_by: user.id,
      })
      .select('id, title, description, date, created_at')
      .single()

    if (error) return err(error.message, 500)
    return json({ idea: data }, 201)
  }

  // ── GET /events ─────────────────────────────────────────────
  if (resource === 'events' && req.method === 'GET') {
    const from = url.searchParams.get('from') ?? new Date().toISOString().slice(0, 10)
    const to = url.searchParams.get('to') ?? (() => {
      const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10)
    })()

    const { data, error } = await supabase
      .from('day_contexts')
      .select('id, date, event_name, extra_adults, extra_children, created_at')
      .eq('household_id', householdId!)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })

    if (error) return err(error.message, 500)
    return json({ events: data })
  }

  return err('Not found', 404)
})
