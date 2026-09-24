// Planny Planny — MCP OAuth Compatibility Server
//
// This function handles the temporary OAuth 2.0 compatibility flow used by
// Claude's dedicated MCP resource, plus the legacy Custom GPT password grant:
//   1. Authorization endpoint (/authorize) — generates authorization codes
//   2. Token endpoint (/token) — exchanges codes/credentials for tokens
//   3. Refresh flow — refreshes access tokens using refresh tokens
//
// Endpoints:
//   GET  /authorize — generates auth code, redirects to login
//   POST /token     — exchanges code/credentials for tokens, or refreshes
//
// Authorization flow (3-legged OAuth):
//   Claude redirects user to /authorize?client_id=...&redirect_uri=...&state=...
//   → User logs in with email/password (redirect to app's login page)
//   → After login, redirect back to Claude with ?code=...&state=...
//   → Claude exchanges code for tokens (POST /token with code)
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
import {
  assertRegisteredRedirect,
  buildAuthorizationRedirect,
  buildOAuthBridgeUrl,
  parseAuthorizationRequest,
  parseRedirectUris,
  readBearerToken,
  type OAuthAuthorizationRequest,
  type OAuthClientRecord,
} from '../_shared/oauthCompatibility.ts'

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
    if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      return Object.fromEntries(new URLSearchParams(await req.text()))
    }
    return await req.json() as Record<string, unknown>
  } catch {
    return err('Invalid request body')
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

function randomAuthorizationCode(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer)
}

async function findOAuthClient(
  adminClient: ReturnType<typeof createClient>,
  clientId: string,
): Promise<OAuthClientRecord | null> {
  const { data, error } = await adminClient
    .from('chatgpt_oauth_clients')
    .select('client_id, client_name, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load OAuth client:', error)
    return null
  }
  return data as OAuthClientRecord | null
}

async function storeTokens(
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  userId: string,
  clientId: string,
  accessToken: string,
  refreshToken: string,
): Promise<boolean> {
  const { data: existingToken, error: existingTokenError } = await adminClient
    .from('chatgpt_oauth_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (existingTokenError) {
    console.error('Failed to load the existing OAuth token:', existingTokenError)
    return false
  }

  if (existingToken?.refresh_token &&
    existingToken.refresh_token !== refreshToken &&
    !await revokeSupabaseSession(
      supabaseUrl,
      supabaseAnonKey,
      existingToken.refresh_token,
    )) {
    return false
  }

  const expiresIn = 3600 // 1 hour
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  const { error: storeError } = await adminClient
    .from('chatgpt_oauth_tokens')
    .upsert({
      user_id: userId,
      client_id: clientId,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: expiresAt.toISOString(),
    }, { onConflict: 'user_id,client_id' })

  if (storeError) {
    console.error('Failed to store OAuth token:', storeError)
    return false
  }
  return true
}

function isInvalidRefreshToken(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false
  }
  const code = error.code
  return code === 'refresh_token_not_found' ||
    code === 'refresh_token_already_used' ||
    code === 'session_not_found' ||
    code === 'session_expired'
}

async function revokeSupabaseSession(
  supabaseUrl: string,
  supabaseAnonKey: string,
  refreshToken: string,
): Promise<boolean> {
  const connectorClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { data, error: refreshError } = await connectorClient.auth.refreshSession({
    refresh_token: refreshToken,
  })
  if (refreshError || !data.session) {
    if (isInvalidRefreshToken(refreshError)) {
      return true
    }
    console.error('Failed to refresh the connector session before revocation:', refreshError)
    return false
  }

  const { error: signOutError } = await connectorClient.auth.signOut({ scope: 'local' })
  if (signOutError) {
    console.error('Failed to revoke the Supabase connector session:', signOutError)
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

  const stored = await storeTokens(
    adminClient,
    supabaseUrl,
    supabaseAnonKey,
    user.id,
    'legacy-custom-gpt',
    accessToken,
    refreshToken,
  )
  if (!stored) {
    await revokeSupabaseSession(supabaseUrl, supabaseAnonKey, refreshToken)
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
  // The path will be just the pathname, stripping the function mount point
  const pathname = new URL(req.url).pathname
  
  console.log('OAuth endpoint:', req.method, pathname)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const appUrl = Deno.env.get('APP_URL') ?? 'http://127.0.0.1:5173'

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

    let redirectUris: string[]
    try {
      redirectUris = parseRedirectUris(body.redirect_uris)
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Invalid redirect_uris')
    }

    const clientName = typeof body.client_name === 'string' && body.client_name.trim().length > 0
      ? body.client_name.trim().slice(0, 200)
      : null
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
  // GET /grants — list compatibility grants for the signed-in user
  // ─────────────────────────────────────────────────────────

  if (pathname.endsWith('/grants') && req.method === 'GET') {
    let accessToken: string
    try {
      accessToken = readBearerToken(req.headers.get('Authorization'))
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Authentication required', 401)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
    if (userError || !userData.user) {
      return err('The Supabase session is invalid or expired', 401)
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: tokenRows, error: tokenError } = await adminClient
      .from('chatgpt_oauth_tokens')
      .select('client_id, created_at')
      .eq('user_id', userData.user.id)
      .neq('client_id', 'legacy-custom-gpt')

    if (tokenError) {
      console.error('Failed to list compatibility OAuth grants:', tokenError)
      return err('Failed to list connected apps', 500)
    }

    const clientIds = (tokenRows ?? []).map((row) => row.client_id as string)
    let clients: OAuthClientRecord[] = []
    if (clientIds.length > 0) {
      const { data: clientRows, error: clientError } = await adminClient
        .from('chatgpt_oauth_clients')
        .select('client_id, client_name, redirect_uris')
        .in('client_id', clientIds)
      if (clientError) {
        console.error('Failed to load connected OAuth clients:', clientError)
        return err('Failed to list connected apps', 500)
      }
      clients = (clientRows ?? []) as OAuthClientRecord[]
    }

    const clientsById = new Map(clients.map((client) => [client.client_id, client]))
    return json({
      grants: (tokenRows ?? []).map((row) => ({
        client_id: row.client_id,
        client_name: clientsById.get(row.client_id as string)?.client_name ?? 'MCP client',
        granted_at: row.created_at,
      })),
    })
  }

  // ─────────────────────────────────────────────────────────
  // POST /grants/revoke — revoke one connector session
  // ─────────────────────────────────────────────────────────

  if (pathname.endsWith('/grants/revoke') && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    let accessToken: string
    try {
      accessToken = readBearerToken(req.headers.get('Authorization'))
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Authentication required', 401)
    }
    const clientId = body.client_id
    if (typeof clientId !== 'string' || clientId.length === 0) {
      return err('client_id is required')
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
    if (userError || !userData.user) {
      return err('The Supabase session is invalid or expired', 401)
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: tokenRow, error: tokenError } = await adminClient
      .from('chatgpt_oauth_tokens')
      .select('refresh_token')
      .eq('user_id', userData.user.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (tokenError) {
      console.error('Failed to load compatibility OAuth grant:', tokenError)
      return err('Failed to revoke connected app', 500)
    }
    if (!tokenRow) {
      return err('Connected app was not found', 404)
    }

    const sessionRevoked = await revokeSupabaseSession(
      supabaseUrl,
      supabaseAnonKey,
      tokenRow.refresh_token,
    )
    if (!sessionRevoked) {
      return err('Failed to revoke connected app', 500)
    }

    const { error: deleteError } = await adminClient
      .from('chatgpt_oauth_tokens')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('client_id', clientId)
    if (deleteError) {
      console.error('Failed to delete compatibility OAuth grant:', deleteError)
      return err('Failed to revoke connected app', 500)
    }

    return json({ revoked: true })
  }

  // ─────────────────────────────────────────────────────────
  // GET /authorize — OAuth Authorization Endpoint
  // ─────────────────────────────────────────────────────────

  if ((pathname.endsWith('/authorize') || pathname === '/authorize') && req.method === 'GET') {
    let authorizationRequest: OAuthAuthorizationRequest
    try {
      authorizationRequest = parseAuthorizationRequest(
        Object.fromEntries(url.searchParams.entries()),
      )
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Invalid authorization request')
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const client = await findOAuthClient(adminClient, authorizationRequest.clientId)
    if (!client) {
      return err('Unknown OAuth client')
    }

    try {
      assertRegisteredRedirect(client, authorizationRequest)
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Invalid redirect_uri')
    }

    return redirect(buildOAuthBridgeUrl(appUrl, authorizationRequest, client.client_name))
  }

  // ─────────────────────────────────────────────────────────
  // POST /authorize — approve or deny from the SPA
  // ─────────────────────────────────────────────────────────

  if ((pathname.endsWith('/authorize') || pathname === '/authorize') && req.method === 'POST') {
    const body = await parseBody(req)
    if (body instanceof Response) return body

    let authorizationRequest: OAuthAuthorizationRequest
    let accessToken: string
    try {
      authorizationRequest = parseAuthorizationRequest(body)
      accessToken = readBearerToken(req.headers.get('Authorization'))
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Invalid authorization request')
    }

    const action = body.action
    if (action !== 'approve' && action !== 'deny') {
      return err('action must be approve or deny')
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const client = await findOAuthClient(adminClient, authorizationRequest.clientId)
    if (!client) {
      return err('Unknown OAuth client')
    }

    try {
      assertRegisteredRedirect(client, authorizationRequest)
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Invalid redirect_uri')
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
    if (userError || !userData.user) {
      return err('The Supabase session is invalid or expired', 401)
    }

    if (action === 'deny') {
      return json({
        redirect_url: buildAuthorizationRedirect(
          authorizationRequest.redirectUri,
          authorizationRequest.state,
          { error: 'access_denied', errorDescription: 'User denied the request' },
        ),
      })
    }

    const connectorAccessToken = body.connector_access_token
    const connectorRefreshToken = body.connector_refresh_token
    if (typeof connectorAccessToken !== 'string' || connectorAccessToken.length === 0 ||
      typeof connectorRefreshToken !== 'string' || connectorRefreshToken.length === 0) {
      return err('A separate Supabase connector session is required')
    }

    const { data: connectorUserData, error: connectorUserError } =
      await userClient.auth.getUser(connectorAccessToken)
    if (connectorUserError || !connectorUserData.user ||
      connectorUserData.user.id !== userData.user.id) {
      return err('The connector session does not belong to the signed-in user', 401)
    }

    const tokensStored = await storeTokens(
      adminClient,
      supabaseUrl,
      supabaseAnonKey,
      userData.user.id,
      authorizationRequest.clientId,
      connectorAccessToken,
      connectorRefreshToken,
    )
    if (!tokensStored) {
      await revokeSupabaseSession(
        supabaseUrl,
        supabaseAnonKey,
        connectorRefreshToken,
      )
      return err('Failed to store session tokens', 500)
    }

    const authCode = randomAuthorizationCode()
    const { error: storeError } = await adminClient
      .from('chatgpt_oauth_codes')
      .insert({
        code: authCode,
        state: authorizationRequest.state || null,
        user_id: userData.user.id,
        redirect_uri: authorizationRequest.redirectUri,
        client_id: authorizationRequest.clientId,
        code_challenge: authorizationRequest.codeChallenge,
        code_challenge_method: authorizationRequest.codeChallengeMethod,
      })

    if (storeError) {
      console.error('Failed to store OAuth authorization code:', storeError)
      if (await revokeSupabaseSession(
        supabaseUrl,
        supabaseAnonKey,
        connectorRefreshToken,
      )) {
        const { error: cleanupError } = await adminClient
          .from('chatgpt_oauth_tokens')
          .delete()
          .eq('user_id', userData.user.id)
          .eq('client_id', authorizationRequest.clientId)
          .eq('refresh_token', connectorRefreshToken)
        if (cleanupError) {
          console.error('Failed to clean up the connector grant:', cleanupError)
        }
      }
      return err('Failed to store authorization code', 500)
    }

    return json({
      redirect_url: buildAuthorizationRedirect(
        authorizationRequest.redirectUri,
        authorizationRequest.state,
        { code: authCode },
      ),
    })
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
      const clientId = body.client_id

      if (typeof code !== 'string' || typeof redirectUri !== 'string' ||
        typeof clientId !== 'string') {
        return err('code, redirect_uri and client_id are required')
      }

      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      // Exchange code for user ID using the database function
      const { data: exchangeData, error: exchangeError } = await adminClient
        .rpc('exchange_mcp_oauth_code', {
          p_code: code,
          p_redirect_uri: redirectUri,
          p_client_id: clientId,
        })

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

      const codeVerifier = body.code_verifier
      if (typeof codeVerifier !== 'string' || !result.code_challenge ||
        result.code_challenge_method !== 'S256') {
        return err('A valid PKCE code_verifier is required', 400)
      }
      const computedChallenge = await sha256Base64Url(codeVerifier)
      if (computedChallenge !== result.code_challenge) {
        return err('code_verifier does not match code_challenge', 400)
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
        .eq('client_id', clientId)
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
        scope: 'chatgpt-plugin',
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
      const clientId = body.client_id

      if (typeof refreshToken !== 'string') {
        return err('refresh_token is required')
      }
      if (clientId !== undefined && typeof clientId !== 'string') {
        return err('client_id must be a string')
      }

      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      let storedTokenQuery = adminClient
        .from('chatgpt_oauth_tokens')
        .select('id, user_id, client_id')
        .eq('refresh_token', refreshToken)
      if (typeof clientId === 'string') {
        storedTokenQuery = storedTokenQuery.eq('client_id', clientId)
      }
      const { data: storedToken, error: storedTokenError } =
        await storedTokenQuery.maybeSingle()

      if (storedTokenError) {
        console.error('Failed to load the OAuth refresh grant:', storedTokenError)
        return err('Failed to refresh token', 500)
      }
      if (!storedToken) {
        return err('Invalid or expired refresh token', 401)
      }

      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })

      // Use the refresh token to get a new access token
      const { data, error } = await client.auth.refreshSession({
        refresh_token: refreshToken,
      })

      if (error || !data.session) {
        return err('Invalid or expired refresh token', 401)
      }

      const user = data.session.user
      if (user.id !== storedToken.user_id) {
        console.error('Refreshed OAuth session user does not match its stored grant')
        return err('Invalid or expired refresh token', 401)
      }
      const newAccessToken = data.session.access_token
      const newRefreshToken = data.session.refresh_token ?? refreshToken

      const expiresIn = 3600 // 1 hour
      const expiresAt = new Date(Date.now() + expiresIn * 1000)

      const { data: updatedToken, error: updateError } = await adminClient
        .from('chatgpt_oauth_tokens')
        .update({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          access_token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', storedToken.id)
        .eq('refresh_token', refreshToken)
        .select('id')
        .maybeSingle()

      if (updateError || !updatedToken) {
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
