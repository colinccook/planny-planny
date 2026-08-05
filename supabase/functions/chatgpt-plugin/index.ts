// Planny Planny — ChatGPT Plugin Edge Function
//
// This function acts as the backend for a ChatGPT Custom Action.
// It authenticates via a Supabase user JWT so all Supabase RLS
// policies apply — users can only see and mutate data in
// households they belong to.
//
// Routes (full feature parity with the Planny Planny app):
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

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

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
  const url = new URL(req.url)

  // Strip the function mount path (/chatgpt-plugin) so path parsing works
  // both locally (where Deno serves the function at /) and on the hosted
  // Supabase edge (where it is mounted at /functions/v1/chatgpt-plugin).
  const stripped = url.pathname
    .replace(/^\/functions\/v1\/chatgpt-plugin/, '')
    .replace(/^\/chatgpt-plugin/, '')
    .replace(/^\//, '')
  const pathParts = stripped.split('/').filter(Boolean)

  // resource = "todos" | "meals" | "ideas" | "events" | "outcomes" | "shopping-list"
  const resource = pathParts[0] ?? ''
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

  const hid = householdId!

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

    type IngEntry = {
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

