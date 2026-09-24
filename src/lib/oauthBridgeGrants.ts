import { buildOAuthCompatibilityServerUrl } from './mcpUrl'

export interface CompatibilityOAuthGrant {
  client_id: string
  client_name: string
  granted_at: string
}

interface FetchResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

type FetchLike = (
  input: string,
  init: {
    method: 'GET' | 'POST'
    headers: Record<string, string>
    body?: string
  },
) => Promise<FetchResponse>

async function readResponse(
  response: FetchResponse,
): Promise<Record<string, unknown>> {
  const body = await response.json()
  return body && typeof body === 'object'
    ? body as Record<string, unknown>
    : {}
}

export async function listCompatibilityOAuthGrants(
  accessToken: string,
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): Promise<CompatibilityOAuthGrant[]> {
  const response = await fetchImpl(
    `${buildOAuthCompatibilityServerUrl()}/grants`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  const body = await readResponse(response)
  if (!response.ok || !Array.isArray(body.grants)) {
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : `Unable to load connected apps (${response.status}).`,
    )
  }

  return body.grants.filter((grant): grant is CompatibilityOAuthGrant => {
    if (!grant || typeof grant !== 'object') return false
    const value = grant as Record<string, unknown>
    return typeof value.client_id === 'string' &&
      typeof value.client_name === 'string' &&
      typeof value.granted_at === 'string'
  })
}

export async function revokeCompatibilityOAuthGrant(
  accessToken: string,
  clientId: string,
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): Promise<void> {
  const response = await fetchImpl(
    `${buildOAuthCompatibilityServerUrl()}/grants/revoke`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId }),
    },
  )
  const body = await readResponse(response)
  if (!response.ok) {
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : `Unable to revoke connected app (${response.status}).`,
    )
  }
}
