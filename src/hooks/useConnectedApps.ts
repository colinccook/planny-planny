import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  listCompatibilityOAuthGrants,
  revokeCompatibilityOAuthGrant,
} from '../lib/oauthBridgeGrants'
import { useAuth } from './useAuth'

export interface ConnectedApp {
  id: string
  name: string
  permissions: string[]
  source: 'supabase' | 'compatibility'
}

export function useConnectedApps() {
  const { session, loading: authLoading } = useAuth()
  const [apps, setApps] = useState<ConnectedApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokingKey, setRevokingKey] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !session) return

    let active = true
    const activeSession = session
    async function loadApps() {
      setLoading(true)
      setError(null)

      const [nativeResult, compatibilityResult] = await Promise.allSettled([
        supabase.auth.oauth.listGrants(),
        listCompatibilityOAuthGrants(activeSession.access_token),
      ])
      if (!active) return

      const nextApps: ConnectedApp[] = []
      const errors: string[] = []

      if (nativeResult.status === 'fulfilled') {
        if (nativeResult.value.error) {
          errors.push(nativeResult.value.error.message)
        } else {
          nextApps.push(...(nativeResult.value.data ?? []).map((grant) => ({
            id: grant.client.id,
            name: grant.client.name,
            permissions: grant.scopes,
            source: 'supabase' as const,
          })))
        }
      } else {
        errors.push(nativeResult.reason instanceof Error
          ? nativeResult.reason.message
          : 'Unable to load ChatGPT connections.')
      }

      if (compatibilityResult.status === 'fulfilled') {
        nextApps.push(...compatibilityResult.value.map((grant) => ({
          id: grant.client_id,
          name: grant.client_name,
          permissions: ['Planny Planny MCP access'],
          source: 'compatibility' as const,
        })))
      } else {
        errors.push(compatibilityResult.reason instanceof Error
          ? compatibilityResult.reason.message
          : 'Unable to load Claude connections.')
      }

      setApps(nextApps)
      setError(errors.length > 0 ? errors.join(' ') : null)
      setLoading(false)
    }

    void loadApps().catch((loadError: unknown) => {
      if (!active) return
      setError(loadError instanceof Error ? loadError.message : 'Unable to load connected apps.')
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [authLoading, session])

  const revoke = useCallback(async (app: ConnectedApp) => {
    if (!session) {
      throw new Error('Sign in to revoke a connected app.')
    }

    const key = `${app.source}:${app.id}`
    setRevokingKey(key)
    setError(null)
    try {
      if (app.source === 'supabase') {
        const { error: revokeError } = await supabase.auth.oauth.revokeGrant({
          clientId: app.id,
        })
        if (revokeError) throw revokeError
      } else {
        await revokeCompatibilityOAuthGrant(session.access_token, app.id)
      }
      setApps((current) => current.filter(
        (candidate) => candidate.id !== app.id || candidate.source !== app.source,
      ))
    } catch (revokeError) {
      setError(revokeError instanceof Error
        ? revokeError.message
        : 'Unable to revoke connected app.')
    } finally {
      setRevokingKey(null)
    }
  }, [session])

  return {
    apps: session ? apps : [],
    loading: authLoading || (session ? loading : false),
    error: session ? error : null,
    revokingKey,
    revoke,
  }
}
