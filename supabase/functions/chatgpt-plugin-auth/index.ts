// Planny Planny — ChatGPT Plugin OAuth Authentication
//
// This function handles the full OAuth 2.0 code flow for ChatGPT plugin authentication:
//   1. Authorization endpoint (/authorize) — generates authorization codes
//   2. Token endpoint (/token) — exchanges codes/credentials for tokens
//   3. Refresh flow — refreshes access tokens using refresh tokens
//
// Endpoints:
//   GET  /authorize — generates auth code, redirects to login
//   POST /token     — exchanges code/credentials for tokens, or refreshes
//
// Authorization flow (3-legged OAuth):
//   ChatGPT redirects user to /authorize?client_id=...&redirect_uri=...&state=...
//   → User logs in with email/password (redirect to app's login page)
//   → After login, redirect back to ChatGPT with ?code=...&state=...
//   → ChatGPT exchanges code for tokens (POST /token with code)
//
// Token request with authorization code:
//   { "grant_type": "authorization_code", "code": "...", "redirect_uri": "..." }
// Response: { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }
//
// Token request with password (direct):
//   { "grant_type": "password", "email": "...", "password": "..." }
// Response: { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }
//
// Token refresh:
//   { "grant_type": "refresh_token", "refresh_token": "..." }
// Response: { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }

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

function redirect(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, 'Location': url },
  })
}

async function parseBody(req: Request): Promise<Record<string, unknown> | Response> {
  try {
    return await req.json() as Record<string, unknown>
  } catch {
    return err('Invalid JSON body')
  }
}

async function createTokensForUser(
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseServiceKey: string,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  // Authenticate with Supabase Auth REST API
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    return null
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
    return null
  }

  return { accessToken, refreshToken }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  let pathname = url.pathname
    .replace(/^\/functions\/v1\/chatgpt-plugin-auth/, '')
    .replace(/^\/chatgpt-plugin-auth/, '')
  if (!pathname || pathname === '/') {
    pathname = ''
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  // ─────────────────────────────────────────────────────────
  // GET /authorize — OAuth Authorization Endpoint
  // ─────────────────────────────────────────────────────────

  if ((pathname === '/authorize' || pathname === 'authorize') && req.method === 'GET') {
    const clientId = url.searchParams.get('client_id')
    const redirectUri = url.searchParams.get('redirect_uri')
    const state = url.searchParams.get('state') ?? ''
    const email = url.searchParams.get('email')
    const password = url.searchParams.get('password')

    if (!redirectUri) {
      return err('redirect_uri is required')
    }

    // If email and password are provided, authenticate directly
    if (email && password) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      // Generate authorization code
      const { data: codeData, error: codeError } = await adminClient
        .rpc('generate_oauth_code')

      if (codeError || !codeData) {
        console.error('Failed to generate auth code:', codeError)
        return err('Failed to generate authorization code', 500)
      }

      const authCode = codeData as string

      // Authenticate user and get their ID
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.session?.user) {
        return err('Invalid email or password', 401)
      }

      const userId = authData.session.user.id

      // Store the authorization code
      const { error: storeError } = await adminClient
        .from('chatgpt_oauth_codes')
        .insert({
          code: authCode,
          state: state || null,
          user_id: userId,
          redirect_uri: redirectUri,
        })

      if (storeError) {
        console.error('Failed to store auth code:', storeError)
        return err('Failed to store authorization code', 500)
      }

      // Redirect back to ChatGPT with authorization code
      const redirectUrl = new URL(redirectUri)
      redirectUrl.searchParams.set('code', authCode)
      if (state) {
        redirectUrl.searchParams.set('state', state)
      }

      return redirect(redirectUrl.toString())
    }

    // Otherwise, redirect to app's OAuth login page with code flow parameters
    const loginUrl = new URL(`${appUrl}/auth/oauth-login`)
    loginUrl.searchParams.set('client_id', clientId ?? '')
    loginUrl.searchParams.set('redirect_uri', redirectUri)
    loginUrl.searchParams.set('state', state)

    return redirect(loginUrl.toString())
  }

  // ─────────────────────────────────────────────────────────
  // POST /token — OAuth Token Endpoint
  // ─────────────────────────────────────────────────────────

  if ((pathname === '/token' || pathname === 'token') && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const grantType = body.grant_type
    if (typeof grantType !== 'string') {
      return err('grant_type is required')
    }

    // ───────────────────────────────────────────────────────
    // Authorization Code Grant
    // ───────────────────────────────────────────────────────

    if (grantType === 'authorization_code') {
      const code = body.code
      const redirectUri = body.redirect_uri

      if (typeof code !== 'string' || typeof redirectUri !== 'string') {
        return err('code and redirect_uri are required')
      }

      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      // Exchange code for user ID using the database function
      const { data: exchangeData, error: exchangeError } = await adminClient
        .rpc('exchange_oauth_code', { p_code: code, p_redirect_uri: redirectUri })

      if (exchangeError || !exchangeData) {
        console.error('Failed to exchange code:', exchangeError)
        return err('Invalid or expired authorization code', 401)
      }

      const result = exchangeData as { error?: string; user_id?: string; state?: string }
      if (result.error) {
        return err(result.error, 401)
      }

      const userId = result.user_id
      if (!userId) {
        return err('Failed to extract user from authorization code', 500)
      }

      // Get the user's tokens (which should have been stored during login)
      const { data: tokenData, error: tokenError } = await adminClient
        .from('chatgpt_oauth_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', userId)
        .single()

      if (tokenError || !tokenData) {
        console.error('Failed to fetch tokens:', tokenError)
        return err('Failed to retrieve tokens', 500)
      }

      return json({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: 3600,
        token_type: 'Bearer',
        state: result.state || undefined,
      })
    }

    // ───────────────────────────────────────────────────────
    // Password Grant (email + password → tokens)
    // ───────────────────────────────────────────────────────

    if (grantType === 'password') {
      const email = body.email
      const password = body.password

      if (typeof email !== 'string' || typeof password !== 'string') {
        return err('email and password are required')
      }

      const tokens = await createTokensForUser(
        supabaseUrl,
        supabaseAnonKey,
        supabaseServiceKey,
        email,
        password,
      )

      if (!tokens) {
        return err('Invalid email or password', 401)
      }

      return json({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 3600,
        token_type: 'Bearer',
      })
    }

    // ───────────────────────────────────────────────────────
    // Refresh Grant (refresh_token → new access_token)
    // ───────────────────────────────────────────────────────

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
  }

  return err('Not found', 404)
})
