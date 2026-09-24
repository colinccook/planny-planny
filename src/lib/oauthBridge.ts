import { createClient, type Session } from '@supabase/supabase-js'
import { buildOAuthCompatibilityServerUrl } from './mcpUrl'

export interface OAuthBridgeRequest {
  clientId: string
  clientName: string
  redirectUri: string
  state: string
  scope: string
  resource: string
  codeChallenge: string
  codeChallengeMethod: 'S256'
}

export type OAuthBridgeDecision = 'approve' | 'deny'

interface FetchResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

type FetchLike = (
  input: string,
  init: {
    method: 'POST'
    headers: Record<string, string>
    body: string
  },
) => Promise<FetchResponse>

type ConnectorSessionFactory = (email: string, password: string) => Promise<Session>

interface OAuthBridgeIdentity {
  browserSession: Session
  email: string
  password?: string
}

function requiredParam(params: URLSearchParams, name: string): string {
  const value = params.get(name)
  if (!value) {
    throw new Error(`The authorization request is missing ${name}.`)
  }
  return value
}

export function parseOAuthBridgeRequest(params: URLSearchParams): OAuthBridgeRequest {
  const codeChallengeMethod = requiredParam(params, 'code_challenge_method')
  if (codeChallengeMethod.toUpperCase() !== 'S256') {
    throw new Error('The authorization request must use PKCE S256.')
  }

  return {
    clientId: requiredParam(params, 'client_id'),
    clientName: params.get('client_name') || 'AI assistant',
    redirectUri: requiredParam(params, 'redirect_uri'),
    state: params.get('state') ?? '',
    scope: params.get('scope') || 'chatgpt-plugin',
    resource: params.get('resource') ?? '',
    codeChallenge: requiredParam(params, 'code_challenge'),
    codeChallengeMethod: 'S256',
  }
}

export async function completeOAuthBridgeAuthorization(
  request: OAuthBridgeRequest,
  decision: OAuthBridgeDecision,
  identity: OAuthBridgeIdentity,
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
  connectorSessionFactory: ConnectorSessionFactory = createConnectorSession,
): Promise<string> {
  let connectorSession: Session | null = null
  if (decision === 'approve') {
    if (!identity.password) {
      throw new Error('Enter your password to create a separate connector session.')
    }
    connectorSession = await connectorSessionFactory(identity.email, identity.password)
    if (connectorSession.user.id !== identity.browserSession.user.id) {
      throw new Error('The confirmed account does not match the signed-in user.')
    }
  }

  const response = await fetchImpl(
    `${buildOAuthCompatibilityServerUrl()}/authorize`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${identity.browserSession.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: decision,
        response_type: 'code',
        client_id: request.clientId,
        redirect_uri: request.redirectUri,
        state: request.state,
        scope: request.scope,
        resource: request.resource,
        code_challenge: request.codeChallenge,
        code_challenge_method: request.codeChallengeMethod,
        ...(connectorSession
          ? {
              connector_access_token: connectorSession.access_token,
              connector_refresh_token: connectorSession.refresh_token,
            }
          : {}),
      }),
    },
  )

  const body = await response.json() as {
    redirect_url?: unknown
    error?: unknown
  }
  if (!response.ok || typeof body.redirect_url !== 'string') {
    const message = typeof body.error === 'string'
      ? body.error
      : `Authorization failed with status ${response.status}.`
    throw new Error(message)
  }
  return body.redirect_url
}

async function createConnectorSession(email: string, password: string): Promise<Session> {
  const connectorClient = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
  const { data, error } = await connectorClient.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error('Password confirmation failed.')
  }
  return data.session
}
