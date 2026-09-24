export interface OAuthClientRecord {
  client_id: string
  client_name: string | null
  redirect_uris: string[]
}

export interface OAuthAuthorizationRequest {
  clientId: string
  redirectUri: string
  state: string
  scope: string
  resource: string
  codeChallenge: string
  codeChallengeMethod: string
}

const DANGEROUS_REDIRECT_SCHEMES = new Set([
  'about:',
  'blob:',
  'data:',
  'file:',
  'javascript:',
  'vbscript:',
])

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function parseRedirectUris(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('redirect_uris is required and must be a non-empty array of strings')
  }
  if (value.length > 10) {
    throw new Error('redirect_uris cannot contain more than 10 URLs')
  }

  return value.map((candidate) => {
    if (typeof candidate !== 'string' || candidate.length === 0) {
      throw new Error('redirect_uris is required and must be a non-empty array of strings')
    }

    let parsed: URL
    try {
      parsed = new URL(candidate)
    } catch {
      throw new Error(`Invalid redirect URI: ${candidate}`)
    }

    if (!parsed.protocol || !parsed.host) {
      throw new Error(`Invalid redirect URI: ${candidate}`)
    }
    if (DANGEROUS_REDIRECT_SCHEMES.has(parsed.protocol.toLowerCase())) {
      throw new Error(`Redirect URI scheme is not allowed: ${parsed.protocol}`)
    }
    if (parsed.protocol === 'http:' && !isLoopbackHost(parsed.hostname)) {
      throw new Error('HTTP redirect URIs are only allowed for loopback hosts')
    }
    if (parsed.hash) {
      throw new Error('Redirect URIs cannot contain fragments')
    }

    return candidate
  })
}

export function parseAuthorizationRequest(
  values: Record<string, unknown>,
): OAuthAuthorizationRequest {
  const clientId = values.client_id
  const redirectUri = values.redirect_uri
  const responseType = values.response_type
  const codeChallenge = values.code_challenge
  const codeChallengeMethod = values.code_challenge_method

  if (typeof clientId !== 'string' || clientId.length === 0) {
    throw new Error('client_id is required')
  }
  if (typeof redirectUri !== 'string' || redirectUri.length === 0) {
    throw new Error('redirect_uri is required')
  }
  if (responseType !== undefined && responseType !== 'code') {
    throw new Error('Only response_type=code is supported')
  }
  if (typeof codeChallenge !== 'string' || codeChallenge.length < 43 || codeChallenge.length > 128) {
    throw new Error('PKCE requires a code_challenge between 43 and 128 characters')
  }
  if (typeof codeChallengeMethod !== 'string' || codeChallengeMethod.toUpperCase() !== 'S256') {
    throw new Error('PKCE requires code_challenge_method=S256')
  }

  return {
    clientId,
    redirectUri,
    state: typeof values.state === 'string' ? values.state : '',
    scope: typeof values.scope === 'string' && values.scope.length > 0
      ? values.scope
      : 'chatgpt-plugin',
    resource: typeof values.resource === 'string' ? values.resource : '',
    codeChallenge,
    codeChallengeMethod: 'S256',
  }
}

export function assertRegisteredRedirect(
  client: OAuthClientRecord,
  request: OAuthAuthorizationRequest,
): void {
  if (client.client_id !== request.clientId) {
    throw new Error('Unknown OAuth client')
  }
  if (!client.redirect_uris.includes(request.redirectUri)) {
    throw new Error('redirect_uri is not registered for this client')
  }
}

export function buildOAuthBridgeUrl(
  appUrl: string,
  request: OAuthAuthorizationRequest,
  clientName: string | null,
): string {
  const base = new URL(appUrl)
  if (!base.pathname.endsWith('/')) {
    base.pathname += '/'
  }

  const bridge = new URL('oauth/authorize', base)
  bridge.searchParams.set('client_id', request.clientId)
  bridge.searchParams.set('client_name', clientName || 'AI assistant')
  bridge.searchParams.set('redirect_uri', request.redirectUri)
  bridge.searchParams.set('state', request.state)
  bridge.searchParams.set('scope', request.scope)
  bridge.searchParams.set('resource', request.resource)
  bridge.searchParams.set('code_challenge', request.codeChallenge)
  bridge.searchParams.set('code_challenge_method', request.codeChallengeMethod)
  return bridge.toString()
}

export function buildAuthorizationRedirect(
  redirectUri: string,
  state: string,
  result: { code: string } | { error: string; errorDescription: string },
): string {
  const redirect = new URL(redirectUri)
  if ('code' in result) {
    redirect.searchParams.set('code', result.code)
  } else {
    redirect.searchParams.set('error', result.error)
    redirect.searchParams.set('error_description', result.errorDescription)
  }
  if (state) {
    redirect.searchParams.set('state', state)
  }
  return redirect.toString()
}

export function readBearerToken(header: string | null): string {
  const match = header?.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) {
    throw new Error('A Supabase access token is required')
  }
  return match[1]
}
