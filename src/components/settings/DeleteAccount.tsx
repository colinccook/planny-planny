import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import CollapsibleSection from '../ui/CollapsibleSection'

export default function DeleteAccount() {
  const { signOut } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc('delete_current_user')

    if (rpcError) {
      setDeleting(false)
      setError(rpcError.message)
      return
    }

    // Clear client-side session after server-side deletion.
    await signOut()
  }

  return (
    <CollapsibleSection title="Delete Account" defaultOpen={false}>
      <div className="p-4">
        <p className="mb-3 text-sm text-gray-600">
          Permanently delete your account. Households where you are the only
          owner will also be deleted along with all their data. This cannot be
          undone.
        </p>

        {error && (
          <p
            className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700"
            role="alert"
            data-testid="delete-account-error"
          >
            {error}
          </p>
        )}

        {confirming ? (
          <div
            className="rounded-md bg-red-50 p-3"
            data-testid="delete-account-confirm"
          >
            <p className="mb-2 text-sm font-medium text-red-900">
              Are you sure? Your account and all exclusively-owned household data
              will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                data-testid="delete-account-confirm-yes"
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
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
            data-testid="delete-account-button"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete account…
          </button>
        )}
      </div>
    </CollapsibleSection>
  )
}
