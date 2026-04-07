import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'
import NumberStepper from '../ui/NumberStepper'

export default function CreateHouseholdForm() {
  const { user } = useAuth()
  const { switchHousehold } = useHousehold()
  const queryClient = useQueryClient()

  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [defaultAdults, setDefaultAdults] = useState(2)
  const [defaultChildren, setDefaultChildren] = useState(0)
  const [defaultBabies, setDefaultBabies] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return

    setError(null)
    setSubmitting(true)

    try {
      const { data: household, error: insertError } = await supabase
        .from('households')
        .insert({
          name: name.trim(),
          alias: alias.trim() || null,
          default_adults: defaultAdults,
          default_children: defaultChildren,
          default_babies: defaultBabies,
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const { error: memberError } = await supabase.from('household_members').insert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      })

      if (memberError) throw memberError

      await queryClient.invalidateQueries({ queryKey: ['my-households'] })
      switchHousehold(household.id)

      setName('')
      setAlias('')
      setDefaultAdults(2)
      setDefaultChildren(0)
      setDefaultBabies(0)
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-medium text-gray-900">Create new household</span>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 p-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="household-name" className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="household-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Household"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="household-alias" className="mb-1 block text-sm font-medium text-gray-700">
              Alias
            </label>
            <input
              id="household-alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g., 123 Oak Street"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <NumberStepper
              id="default-adults"
              label="Default adults"
              value={defaultAdults}
              min={0}
              max={99}
              onChange={setDefaultAdults}
            />
            <NumberStepper
              id="default-children"
              label="Default children"
              value={defaultChildren}
              min={0}
              max={99}
              onChange={setDefaultChildren}
            />
            <NumberStepper
              id="default-babies"
              label="Default babies"
              value={defaultBabies}
              min={0}
              max={99}
              onChange={setDefaultBabies}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create household'}
          </button>
        </form>
      )}
    </div>
  )
}
