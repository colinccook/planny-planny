import { useEffect, useState } from 'react'
import type { OAuthGrant } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import CollapsibleSection from '../ui/CollapsibleSection'

export default function ConnectedApps() {
  const [grants, setGrants] = useState<OAuthGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokingClientId, setRevokingClientId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadGrants() {
      const { data, error: grantsError } = await supabase.auth.oauth.listGrants()
      if (!active) return

      if (grantsError) {
        setError(grantsError.message)
      } else {
        setGrants(data ?? [])
      }
      setLoading(false)
    }

    void loadGrants()

    return () => {
      active = false
    }
  }, [])

  const revoke = async (clientId: string) => {
    setRevokingClientId(clientId)
    setError(null)

    const { error: revokeError } = await supabase.auth.oauth.revokeGrant({ clientId })
    if (revokeError) {
      setError(revokeError.message)
    } else {
      setGrants((current) => current.filter((grant) => grant.client.id !== clientId))
    }
    setRevokingClientId(null)
  }

  return (
    <CollapsibleSection title="Connected apps">
      <div className="space-y-3 p-4">
        {loading && <p className="text-sm text-gray-500">Loading connected apps…</p>}

        {!loading && grants.length === 0 && !error && (
          <p className="text-sm text-gray-500">No apps are connected to your account.</p>
        )}

        {grants.map((grant) => (
          <div key={grant.client.id} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{grant.client.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Permissions: {grant.scopes.join(', ') || 'Planny Planny access'}
                </p>
              </div>
              <button
                type="button"
                disabled={revokingClientId === grant.client.id}
                onClick={() => void revoke(grant.client.id)}
                className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {revokingClientId === grant.client.id ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          </div>
        ))}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </CollapsibleSection>
  )
}
