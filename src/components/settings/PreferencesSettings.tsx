import { useUserPreferences } from '../../hooks/useUserPreferences'
import { playSound } from '../../lib/sounds'
import CollapsibleSection from '../ui/CollapsibleSection'

/**
 * Settings card for personal preferences that follow the user across
 * devices (i.e. live on the `profiles` row, not in localStorage).
 *
 * Currently exposes a single toggle: subtle UI sound effects. The
 * default is on; users who find them distracting can opt out here and
 * the choice will be remembered the next time they sign in (anywhere).
 */
export default function PreferencesSettings() {
  const { preferences, setPreferences } = useUserPreferences()
  const enabled = preferences.soundEffectsEnabled

  const handleToggle = (next: boolean) => {
    setPreferences({ soundEffectsEnabled: next })
    // Play a tiny preview when turning on so the user can hear what
    // they've enabled. Use the raw `playSound` directly because the
    // optimistic preference update may not have propagated to the
    // `useSounds` hook for the same render.
    if (next) playSound('done')
  }

  return (
    <CollapsibleSection title="Preferences">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <label
              htmlFor="settings-sound-effects"
              className="block text-sm font-medium text-gray-900"
            >
              Sound effects
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              Subtle, friendly sounds when meals are added, todos are ticked
              off, and as you swipe between days. Saved to your account.
            </p>
          </div>
          <button
            id="settings-sound-effects"
            type="button"
            role="switch"
            aria-checked={enabled}
            data-testid="sound-effects-toggle"
            onClick={() => handleToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none ${
              enabled ? 'bg-emerald-600' : 'bg-gray-300'
            }`}
          >
            <span
              aria-hidden
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
            <span className="sr-only">
              {enabled ? 'Sound effects on' : 'Sound effects off'}
            </span>
          </button>
        </div>
      </div>
    </CollapsibleSection>
  )
}
