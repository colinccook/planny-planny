import { useCallback } from 'react'
import { useAuth } from './useAuth'
import {
  completeOAuthBridgeAuthorization,
  type OAuthBridgeDecision,
  type OAuthBridgeRequest,
} from '../lib/oauthBridge'

export function useOAuthBridge() {
  const { user, session, loading } = useAuth()

  const completeAuthorization = useCallback(async (
    request: OAuthBridgeRequest,
    decision: OAuthBridgeDecision,
    password?: string,
  ): Promise<string> => {
    if (!session || !user?.email) {
      throw new Error('Sign in to complete this authorization request.')
    }
    return completeOAuthBridgeAuthorization(request, decision, {
      browserSession: session,
      email: user.email,
      password,
    })
  }, [session, user])

  return {
    user,
    loading,
    completeAuthorization,
  }
}
