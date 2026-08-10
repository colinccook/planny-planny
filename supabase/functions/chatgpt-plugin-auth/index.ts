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

// ─── OAuth discovery helpers ────────────────────────────────────────────
//
// See the matching comment in chatgpt-plugin/index.ts — `req.url`'s origin
// is always the internal Kong→edge-runtime address, never the public URL,
// so the metadata's issuer/endpoint URLs come from the same
// `PLUGIN_PUBLIC_URL` secret instead.

function publicFunctionsBase(): string {
  return Deno.env.get('PLUGIN_PUBLIC_URL') ?? 'http://127.0.0.1:54321/functions/v1'
}

function authServerBase(): string {
  return `${publicFunctionsBase()}/chatgpt-plugin-auth`
}

// ─── PKCE (RFC 7636) ─────────────────────────────────────────────────────

function base64UrlEncode(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

function randomClientId(): string {
  return 'planny-' + base64UrlEncode(crypto.getRandomValues(new Uint8Array(24)).buffer)
}

async function storeTokens(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  accessToken: string,
  refreshToken: string,
): Promise<boolean> {
  const expiresIn = 3600 // 1 hour
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  const { error: storeError } = await adminClient
    .from('chatgpt_oauth_tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: expiresAt.toISOString(),
    }, { onConflict: 'user_id' })

  if (storeError) {
    console.error('Failed to store OAuth token:', storeError)
    return false
  }
  return true
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

  const stored = await storeTokens(adminClient, user.id, accessToken, refreshToken)
  if (!stored) return null

  return { accessToken, refreshToken }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  // The path will be just the pathname, stripping the function mount point
  const pathname = new URL(req.url).pathname
  
  console.log('OAuth endpoint:', req.method, pathname)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  // ─────────────────────────────────────────────────────────
  // GET /.well-known/oauth-authorization-server — RFC 8414
  // ─────────────────────────────────────────────────────────
  // No auth. Lets OAuth-aware MCP clients (ChatGPT) discover the
  // authorize/token/register endpoints instead of failing with
  // "does not implement OAuth".

  if (pathname.endsWith('/.well-known/oauth-authorization-server') && req.method === 'GET') {
    const base = authServerBase()
    return json({
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      registration_endpoint: `${base}/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['chatgpt-plugin'],
    })
  }

  // ─────────────────────────────────────────────────────────
  // POST /register — Dynamic Client Registration (RFC 7591)
  // ─────────────────────────────────────────────────────────
  // No auth. ChatGPT auto-provisions a client_id here rather than a
  // developer pasting one into a form. Public client only (PKCE, no
  // client_secret) since ChatGPT's MCP connector cannot keep a secret.

  if (pathname.endsWith('/register') && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    const redirectUris = body.redirect_uris
    if (!Array.isArray(redirectUris) || redirectUris.length === 0 ||
      !redirectUris.every((u) => typeof u === 'string')) {
      return err('redirect_uris is required and must be a non-empty array of strings')
    }

    const clientName = typeof body.client_name === 'string' ? body.client_name : null
    const clientId = randomClientId()

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: insertError } = await adminClient
      .from('chatgpt_oauth_clients')
      .insert({
        client_id: clientId,
        client_name: clientName,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: 'none',
      })

    if (insertError) {
      console.error('Failed to register OAuth client:', insertError)
      return err('Failed to register client', 500)
    }

    return json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      client_name: clientName,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }, 201)
  }

  // ─────────────────────────────────────────────────────────
  // GET /authorize — OAuth Authorization Endpoint
  // ─────────────────────────────────────────────────────────

  if ((pathname.endsWith('/authorize') || pathname === '/authorize') && req.method === 'GET') {
    const clientId = url.searchParams.get('client_id')
    const redirectUri = url.searchParams.get('redirect_uri')
    const state = url.searchParams.get('state') ?? ''
    const email = url.searchParams.get('email')
    const password = url.searchParams.get('password')
    const codeChallenge = url.searchParams.get('code_challenge')
    const codeChallengeMethod = url.searchParams.get('code_challenge_method')

    if (!redirectUri) {
      return err('redirect_uri is required')
    }

    if (codeChallenge && codeChallengeMethod && codeChallengeMethod !== 'S256') {
      return err('Only the S256 code_challenge_method is supported')
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

      // Store the tokens now (keyed by user_id) so the token endpoint can
      // hand them back once the authorization code is exchanged. Without
      // this, the authorization_code grant has no tokens to return.
      const tokensStored = await storeTokens(
        adminClient,
        userId,
        authData.session.access_token,
        authData.session.refresh_token ?? '',
      )
      if (!tokensStored) {
        return err('Failed to store session tokens', 500)
      }

      // Store the authorization code
      const { error: storeError } = await adminClient
        .from('chatgpt_oauth_codes')
        .insert({
          code: authCode,
          state: state || null,
          user_id: userId,
          redirect_uri: redirectUri,
          client_id: clientId || null,
          code_challenge: codeChallenge || null,
          code_challenge_method: codeChallenge ? 'S256' : null,
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
    if (codeChallenge) {
      loginUrl.searchParams.set('code_challenge', codeChallenge)
      loginUrl.searchParams.set('code_challenge_method', 'S256')
    }

    return redirect(loginUrl.toString())
  }


  // ─────────────────────────────────────────────────────────
  // POST /token — OAuth Token Endpoint
  // ─────────────────────────────────────────────────────────

  if ((pathname.endsWith('/token') || pathname === '/token') && req.method === 'POST') {
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

      const result = exchangeData as {
        error?: string
        user_id?: string
        state?: string
        client_id?: string | null
        code_challenge?: string | null
        code_challenge_method?: string | null
      }
      if (result.error) {
        return err(result.error, 401)
      }

      // PKCE verification (RFC 7636) — required whenever the authorization
      // request included a code_challenge (e.g. every ChatGPT MCP flow via
      // Dynamic Client Registration). Skipped only for legacy codes issued
      // without one, for backward compatibility with the password grant.
      if (result.code_challenge) {
        const codeVerifier = body.code_verifier
        if (typeof codeVerifier !== 'string') {
          return err('code_verifier is required', 400)
        }
        const computedChallenge = await sha256Base64Url(codeVerifier)
        if (computedChallenge !== result.code_challenge) {
          return err('code_verifier does not match code_challenge', 400)
        }
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
