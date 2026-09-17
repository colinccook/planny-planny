import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import type { OAuthAuthorizationDetails } from '@supabase/supabase-js'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm your Planny Planny identity',
  email: 'Read your account email address',
  profile: 'Read your basic account profile',
}

function redirectBrowser(url: string) {
  window.location.assign(url)
}

export default function OAuthConsentPage({
  redirectToClient = redirectBrowser,
}: {
  redirectToClient?: (url: string) => void
}) {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const authorizationId = searchParams.get('authorization_id')
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (authLoading || !user || !authorizationId) return

    let active = true
    const requestId = authorizationId

    async function loadAuthorization() {
      const { data, error: authorizationError } =
        await supabase.auth.oauth.getAuthorizationDetails(requestId)

      if (!active) return

      if (authorizationError || !data) {
        setError(authorizationError?.message ?? 'This authorization request is invalid or expired.')
        setLoading(false)
        return
      }

      if ('redirect_url' in data) {
        redirectToClient(data.redirect_url)
        return
      }

      setDetails(data)
      setLoading(false)
    }

    void loadAuthorization()

    return () => {
      active = false
    }
  }, [authLoading, authorizationId, redirectToClient, user])

  if (!authorizationId) {
    return <ConsentMessage title="Invalid request" message="The authorization request is missing its identifier." />
  }

  if (!authLoading && !user) {
    const redirect = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  const handleDecision = async (decision: 'approve' | 'deny') => {
    setSubmitting(true)
    setError(null)

    const response = decision === 'approve'
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })

    if (response.error || !response.data) {
      setError(response.error?.message ?? 'Unable to complete the authorization request.')
      setSubmitting(false)
      return
    }

    redirectToClient(response.data.redirect_url)
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div aria-label="Loading authorization request" className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    )
  }

  if (!details) {
    return <ConsentMessage title="Unable to connect" message={error ?? 'No authorization request was found.'} />
  }

  const scopes = details.scope.split(' ').filter(Boolean)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <section className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl" aria-hidden="true">
            🍽️
          </div>
          <h1 className="text-xl font-bold text-gray-900">Connect {details.client.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            This will let ChatGPT use Planny Planny on your behalf.
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">ChatGPT will be able to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Read your active household's meals, ideas, events, outcomes and todos</li>
            <li>Create and update plans when you ask it to</li>
            <li>Act only with the access level your household already gives you</li>
            {scopes.map((scope) => (
              <li key={scope}>{SCOPE_LABELS[scope] ?? `Use the ${scope} permission`}</li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-500">
          Planny Planny's database permissions still apply to every action. You can revoke this
          connection later from your account settings.
        </p>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleDecision('deny')}
            className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Deny
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleDecision('approve')}
            className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Connecting…' : 'Allow'}
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
