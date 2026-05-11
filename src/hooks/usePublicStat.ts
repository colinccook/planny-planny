import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'

/**
 * Public, anonymously-readable counter for the welcome screen.
 *
 * Reads through the `get_public_stat` SECURITY DEFINER RPC, which:
 *   - returns the cached value if it was refreshed within 24 hours,
 *   - otherwise recomputes on the fly and caches the result.
 *
 * The cron job `refresh-public-stats` warms the cache once per day so
 * the very first visitor of the day still gets a snappy response.
 *
 * Returns `null` while loading, on error, or when the RPC isn't
 * available (e.g. local dev without the migrations applied) so the
 * welcome page can decide to hide the headline rather than render a
 * placeholder. Callers should treat `0` as "no meals recorded yet"
 * and hide the headline too.
 */
export function usePublicStat(key: string) {
  return useQuery({
    queryKey: queryKeys.publicStat(key),
    queryFn: async (): Promise<number | null> => {
      // The Database['public']['Functions'] type is intentionally
      // empty — see the comment in src/types/database.ts. Cast the
      // RPC name and result so this single call site doesn't force
      // a wider Supabase type rewrite.
      const { data, error } = await supabase.rpc(
        'get_public_stat' as never,
        { p_key: key } as never,
      )
      if (error) return null
      const num = Number(data)
      return Number.isFinite(num) ? num : null
    },
    // Six hours: this is a global counter that doesn't change second
    // to second; we don't want every login page mount to round-trip.
    staleTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
