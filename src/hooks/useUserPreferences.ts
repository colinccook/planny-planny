import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { setSoundsEnabled } from '../lib/sounds'
import { useAuth } from './useAuth'
import type { Database } from '../types/database'

/**
 * Per-user preferences stored on the `profiles` row.
 *
 * Keep this list to fields that should follow the user across devices.
 * Anything device-local (e.g. last scroll position) belongs in
 * localStorage, not here.
 */
export interface UserPreferences {
  /** Household the user was last in. `null` until they've made a choice. */
  lastHouseholdId: string | null
  /** Subtle UI sound effects toggle. Default `true` for new accounts. */
  soundEffectsEnabled: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  lastHouseholdId: null,
  soundEffectsEnabled: true,
}

const userPreferencesKey = (userId: string | undefined) =>
  ['user-preferences', userId] as const

/**
 * Fetch (and live-sync) the current user's preferences. Returns sensible
 * defaults while loading or for users not yet signed in, so callers don't
 * need to guard for `undefined`.
 *
 * The hook also subscribes to realtime updates on the user's own profile
 * row, so a preference change made on one device is reflected in the
 * other open tabs/devices within a few hundred ms.
 */
export function useUserPreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: userPreferencesKey(user?.id),
    queryFn: async (): Promise<UserPreferences> => {
      if (!user) return DEFAULT_PREFERENCES
      const { data, error } = await supabase
        .from('profiles')
        .select('last_household_id, sound_effects_enabled')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      if (!data) return DEFAULT_PREFERENCES
      return {
        lastHouseholdId: data.last_household_id,
        // Defensively coerce — a NULL would be possible if a future
        // migration relaxes the column.
        soundEffectsEnabled: data.sound_effects_enabled ?? true,
      }
    },
    enabled: !!user,
    // Preferences change rarely; keep them sticky to avoid re-fetching
    // on every component mount. Realtime + mutations keep them fresh.
    staleTime: 5 * 60 * 1000,
  })

  // Live-sync from another device.
  //
  // Depend on `user.id` rather than the whole `user` object — the auth
  // hook recreates the user reference on every refresh of the JWT, and
  // re-subscribing to a Supabase channel on every render thrashes the
  // websocket and (occasionally on flaky mobile networks) causes the
  // app to appear unresponsive while channels reconnect.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: userPreferencesKey(userId) })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  const mutate = useMutation({
    mutationFn: async (patch: Partial<UserPreferences>) => {
      if (!user) throw new Error('Not signed in')
      const dbPatch: Database['public']['Tables']['profiles']['Update'] = {}
      if (patch.lastHouseholdId !== undefined) {
        dbPatch.last_household_id = patch.lastHouseholdId
      }
      if (patch.soundEffectsEnabled !== undefined) {
        dbPatch.sound_effects_enabled = patch.soundEffectsEnabled
      }
      if (Object.keys(dbPatch).length === 0) return
      const { error } = await supabase
        .from('profiles')
        .update(dbPatch)
        .eq('id', user.id)
      if (error) throw error
    },
    // Optimistic write — these toggles should feel instant.
    onMutate: async (patch) => {
      if (!user) return { previous: undefined }
      await queryClient.cancelQueries({ queryKey: userPreferencesKey(user.id) })
      const previous = queryClient.getQueryData<UserPreferences>(
        userPreferencesKey(user.id),
      )
      queryClient.setQueryData<UserPreferences>(
        userPreferencesKey(user.id),
        (old) => ({ ...(old ?? DEFAULT_PREFERENCES), ...patch }),
      )
      return { previous }
    },
    onError: (_err, _patch, ctx) => {
      if (!user || !ctx?.previous) return
      queryClient.setQueryData(userPreferencesKey(user.id), ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userPreferencesKey(user?.id) })
    },
  })

  // Mirror the preference into the sounds module so call sites that
  // can't call this hook (e.g. mutation `onMutate` callbacks in
  // non-component modules) can still honour the user's opt-out.
  useEffect(() => {
    setSoundsEnabled(query.data?.soundEffectsEnabled ?? true)
  }, [query.data?.soundEffectsEnabled])

  return {
    preferences: query.data ?? DEFAULT_PREFERENCES,
    isLoading: query.isLoading,
    /** Patch one or more preferences. Optimistic. */
    setPreferences: (patch: Partial<UserPreferences>) => mutate.mutate(patch),
  }
}
