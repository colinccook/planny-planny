import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useHousehold } from '../../hooks/useHousehold'
import { canDeleteHousehold } from '../../lib/permissions'
import CollapsibleSection from '../ui/CollapsibleSection'

export default function DeleteHousehold() {
  const { currentHousehold, currentRole, memberships, switchHousehold } = useHousehold()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!currentHousehold || !canDeleteHousehold(currentRole)) return null

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    const { error: deleteError } = await supabase
      .from('households')
      .delete()
      .eq('id', currentHousehold.id)

    setDeleting(false)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    // Switch to another household if possible, otherwise go to settings
    const next = memberships.find((m) => m.household.id !== currentHousehold.id)
    await queryClient.invalidateQueries({ queryKey: ['my-households'] })

    if (next) {
      switchHousehold(next.household.id)
    } else {
      navigate('/settings')
    }
  }

  return (
    <CollapsibleSection title="Delete Household" defaultOpen={false}>
      <div className="p-4">
        <p className="mb-3 text-sm text-gray-600">
          Permanently delete{' '}
          <span className="font-semibold">{currentHousehold.name}</span> and all its
          data — meals, members, invites, and day placeholders. This cannot be undone.
        </p>

        {error && (
          <p
            className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700"
            role="alert"
            data-testid="delete-household-error"
          >
            {error}
          </p>
        )}

        {confirming ? (
          <div
            className="rounded-md bg-red-50 p-3"
            data-testid="delete-household-confirm"
          >
            <p className="mb-2 text-sm font-medium text-red-900">
              Are you sure? This will permanently delete{' '}
              <span className="font-semibold">{currentHousehold.name}</span> and
              everything in it.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                data-testid="delete-household-confirm-yes"
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            data-testid="delete-household-button"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete household…
          </button>
        )}
      </div>
    </CollapsibleSection>
  )
}
