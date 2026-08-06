// Planny Planny — ChatGPT Plugin OAuth Token Exchange
//
// This function handles the OAuth token flow for ChatGPT plugin authentication.
// It allows ChatGPT to:
//   1. Obtain a refresh token (with username/password)
//   2. Refresh an access token (with refresh token)
//   3. Verify and extend token expiry
//
// Endpoints:
//   POST /auth/token  — exchange credentials for tokens or refresh an access token
//
// Request body (option 1 — password flow):
//   { "grant_type": "password", "email": "...", "password": "..." }
// Response: { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }
//
// Request body (option 2 — refresh flow):
//   { "grant_type": "refresh_token", "refresh_token": "..." }
// Response: { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (req.method !== 'POST') {
    return err('Only POST is supported', 405)
  }

  const body = await parseBody(req)
  if (body instanceof Response) return body

  const grantType = body.grant_type
  if (typeof grantType !== 'string') {
    return err('grant_type is required')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  // ─────────────────────────────────────────────────────────
  // Password Grant (email + password → tokens)
  // ─────────────────────────────────────────────────────────

  if (grantType === 'password') {
    const email = body.email
    const password = body.password

    if (typeof email !== 'string' || typeof password !== 'string') {
      return err('email and password are required')
    }

    // Authenticate with Supabase Auth REST API
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await client.auth.signInWithPassword({ email, password })

    if (error || !data.session) {
      return err('Invalid email or password', 401)
    }

    const user = data.session.user
    const accessToken = data.session.access_token
    const refreshToken = data.session.refresh_token ?? ''

    // Store tokens in the database (service role to bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const expiresIn = 3600 // 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    const { error: storeError } = await adminClient
      .from('chatgpt_oauth_tokens')
      .upsert({
        user_id: user.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        access_token_expires_at: expiresAt.toISOString(),
      })

    if (storeError) {
      console.error('Failed to store OAuth token:', storeError)
      return err('Failed to store token', 500)
    }

    return json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
    })
  }

  // ─────────────────────────────────────────────────────────
  // Refresh Grant (refresh_token → new access_token)
  // ─────────────────────────────────────────────────────────

  if (grantType === 'refresh_token') {
    const refreshToken = body.refresh_token

    if (typeof refreshToken !== 'string') {
      return err('refresh_token is required')
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Use the refresh token to get a new access token
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.session) {
      return err('Invalid or expired refresh token', 401)
    }

    const user = data.session.user
    const newAccessToken = data.session.access_token
    const newRefreshToken = data.session.refresh_token ?? refreshToken

    // Update tokens in database (service role to bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const expiresIn = 3600 // 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    const { error: updateError } = await adminClient
      .from('chatgpt_oauth_tokens')
      .update({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        access_token_expires_at: expiresAt.toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update OAuth token:', updateError)
      return err('Failed to refresh token', 500)
    }

    return json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
    })
  }

  return err(`Unsupported grant_type: ${grantType}`)
})
