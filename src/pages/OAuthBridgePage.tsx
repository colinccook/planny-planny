import { useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useOAuthBridge } from '../hooks/useOAuthBridge'
import {
  parseOAuthBridgeRequest,
  type OAuthBridgeDecision,
} from '../lib/oauthBridge'

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm your Planny Planny identity',
  email: 'Read your account email address',
  profile: 'Read your basic account profile',
  offline_access: 'Stay connected until you revoke access',
  'chatgpt-plugin': 'Use the Planny Planny meal-planning tools',
}

function redirectBrowser(url: string) {
  window.location.assign(url)
}

export default function OAuthBridgePage({
  redirectToClient = redirectBrowser,
}: {
  redirectToClient?: (url: string) => void
}) {
  const { user, loading: authLoading, completeAuthorization } = useOAuthBridge()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<OAuthBridgeDecision | null>(null)

  const parsed = useMemo(() => {
    try {
      return { request: parseOAuthBridgeRequest(searchParams), error: null }
    } catch (parseError) {
      return {
        request: null,
        error: parseError instanceof Error
          ? parseError.message
          : 'This authorization request is invalid.',
      }
    }
  }, [searchParams])

  if (parsed.error || !parsed.request) {
    return (
      <ConsentMessage
        title="Invalid request"
        message={parsed.error ?? 'This authorization request is invalid.'}
      />
    )
  }

  if (!authLoading && !user) {
    const redirect = `/oauth/authorize?${searchParams.toString()}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div
          aria-label="Loading authorization request"
          className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"
        />
      </div>
    )
  }

  const scopes = parsed.request.scope.split(' ').filter(Boolean)
  const redirectHost = new URL(parsed.request.redirectUri).hostname

  const handleDecision = async (decision: OAuthBridgeDecision) => {
    if (decision === 'approve' && password.length === 0) {
      setError('Enter your password to create a separate connector session.')
      return
    }
    setSubmitting(decision)
    setError(null)
    try {
      const redirectUrl = await completeAuthorization(
        parsed.request,
        decision,
        decision === 'approve' ? password : undefined,
      )
      redirectToClient(redirectUrl)
    } catch (authorizationError) {
      setError(authorizationError instanceof Error
        ? authorizationError.message
        : 'Unable to complete the authorization request.')
      setSubmitting(null)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <section className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl" aria-hidden="true">
            🍽️
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Connect {parsed.request.clientName}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This will let {parsed.request.clientName} use Planny Planny on your behalf.
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">{parsed.request.clientName} will be able to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Read and update the active household's meal plan when you ask it to</li>
            <li>Act only with the access level your household already gives you</li>
            {scopes.map((scope) => (
              <li key={scope}>{SCOPE_LABELS[scope] ?? `Use the ${scope} permission`}</li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-500">
          Approval returns to {redirectHost}. You can revoke this connection later from
          Connected apps in Settings.
        </p>

        <div className="space-y-2">
          <label htmlFor="connector-password" className="block text-sm font-medium text-gray-700">
            Confirm your Planny Planny password
          </label>
          <input
            id="connector-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="text-xs text-gray-500">
            Your password goes directly to Supabase to create a separate, revocable
            session for this connector.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => void handleDecision('deny')}
            className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {submitting === 'deny' ? 'Denying…' : 'Deny'}
          </button>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => void handleDecision('approve')}
            className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting === 'approve' ? 'Connecting…' : 'Allow'}
          </button>
        </div>
      </section>
    </main>
  )
}

function ConsentMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-200">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p role="alert" className="mt-2 text-sm text-gray-600">{message}</p>
      </section>
    </main>
  )
}
