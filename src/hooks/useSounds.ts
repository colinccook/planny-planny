import { useCallback, useSyncExternalStore } from 'react'
import {
  playSound,
  subscribeSoundsEnabled,
  getSoundsEnabled,
  type SoundName,
} from '../lib/sounds'

/**
 * Returns a `play(name)` function that plays one of the synthesised
 * sounds in `src/lib/sounds.ts` — but only when the current user has
 * sound effects enabled in their preferences. When sounds are off, the
 * call is a no-op so callers don't have to gate every site themselves.
 *
 * The hook subscribes to the module-level `soundsEnabled` flag so it
 * re-renders the moment the user flips the toggle in Settings. The flag
 * is mirrored from the server preference by `useUserPreferences` —
 * which is why this hook deliberately does NOT depend on it (so simple
 * UI components can `useSounds()` without dragging in a Supabase
 * dependency, keeping unit tests cheap).
 */
export function useSounds() {
  const enabled = useSyncExternalStore(
    subscribeSoundsEnabled,
    getSoundsEnabled,
    // Server snapshot — used by SSR and React strict-mode hydration.
    getSoundsEnabled,
  )

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return
      playSound(name)
    },
    [enabled],
  )

  return { enabled, play }
}

export type { SoundName } from '../lib/sounds'
