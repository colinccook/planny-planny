import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useHousehold } from '../../hooks/useHousehold'
import { canEditMeals } from '../../lib/permissions'
import NumberStepper from '../ui/NumberStepper'
import CollapsibleSection from '../ui/CollapsibleSection'

export default function HouseholdSettings() {
  const { currentHousehold, currentRole } = useHousehold()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [defaultAdults, setDefaultAdults] = useState(2)
  const [defaultChildren, setDefaultChildren] = useState(0)
  const [defaultBabies, setDefaultBabies] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentHousehold) {
      // Sync external household record into local form state when it changes.
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(currentHousehold.name)
      setAlias(currentHousehold.alias ?? '')
      setDefaultAdults(currentHousehold.default_adults)
      setDefaultChildren(currentHousehold.default_children)
      setDefaultBabies(currentHousehold.default_babies)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [currentHousehold])

  if (!currentHousehold) return null

  const isReadOnly = !canEditMeals(currentRole)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly || !name.trim()) return

    setError(null)
    setSaving(true)
    setSaved(false)

    try {
      const { error: updateError } = await supabase
        .from('households')
        .update({
          name: name.trim(),
          alias: alias.trim() || null,
          default_adults: defaultAdults,
          default_children: defaultChildren,
          default_babies: defaultBabies,
        })
        .eq('id', currentHousehold.id)

      if (updateError) throw updateError

      await queryClient.invalidateQueries({ queryKey: ['my-households'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CollapsibleSection title="Household Settings">
      <div className="p-4">
        {isReadOnly && (
          <p className="mb-3 rounded-md bg-gray-50 p-2 text-xs text-gray-500">
            You don&apos;t have edit access. Settings are read-only.
          </p>
        )}

        {error && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label htmlFor="settings-name" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label htmlFor="settings-alias" className="mb-1 block text-sm font-medium text-gray-700">
              Alias
            </label>
            <input
              id="settings-alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g., 123 Oak Street"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <NumberStepper
              id="settings-adults"
              label="Default adults"
              value={defaultAdults}
              min={0}
              max={99}
              onChange={setDefaultAdults}
              disabled={isReadOnly}
            />
            <NumberStepper
              id="settings-children"
              label="Default children"
              value={defaultChildren}
              min={0}
              max={99}
              onChange={setDefaultChildren}
              disabled={isReadOnly}
            />
            <NumberStepper
              id="settings-babies"
              label="Default babies"
              value={defaultBabies}
              min={0}
              max={99}
              onChange={setDefaultBabies}
              disabled={isReadOnly}
            />
          </div>

          {!isReadOnly && (
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
          )}
        </form>
      </div>
    </CollapsibleSection>
  )
}
