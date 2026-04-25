import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'
import { roleLabel } from '../../lib/permissions'
import RoleBadge from './RoleBadge'
import AccessLevelsLink from './AccessLevelsLink'

/**
 * Panel listing every household the signed-in user is a member
 * of, with their role and a "Leave" action.
 *
 * The DB enforces the last-owner safeguard via a trigger; if the
 * delete fails (e.g. you're the only owner) we surface the error
 * inline so the user knows why.
 */
export default function MyMemberships() {
  const { user } = useAuth()
  const { memberships, currentHousehold, switchHousehold, isLoading } = useHousehold()
  const queryClient = useQueryClient()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  if (!user) return null

  const handleLeave = async (householdId: string) => {
    if (!user) return
    setLeavingId(householdId)
    setError(null)

    const { error: deleteError } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', user.id)

    setLeavingId(null)
    setConfirmingId(null)

    if (deleteError) {
      // The `prevent_last_owner_removal` function (via the
      // `protect_last_owner` trigger) raises SQLSTATE P0001 when
      // removing this row would leave the household with no owners.
      // Match on the code so the friendly message survives the
      // wording being tweaked.
      const isLastOwner =
        deleteError.code === 'P0001' ||
        /last owner/i.test(deleteError.message)
      setError(
        isLastOwner
          ? "You're the only owner of this household. Promote someone else first."
          : deleteError.message,
      )
      return
    }

    // If we just left the household we were viewing, switch to
    // another one we still belong to (if any). The provider's
    // own effects will handle the empty case.
    if (currentHousehold?.id === householdId) {
      const next = memberships.find((m) => m.household.id !== householdId)
      if (next) switchHousehold(next.household.id)
    }
    await queryClient.invalidateQueries({ queryKey: ['my-households'] })
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow" data-testid="my-memberships">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">My Memberships</h3>
        <AccessLevelsLink />
      </div>

      {error && (
        <p
          className="mb-2 rounded-md bg-red-50 p-2 text-xs text-red-700"
          role="alert"
          data-testid="memberships-error"
        >
          {error}
        </p>
      )}

      {memberships.length === 0 ? (
        <p className="text-sm text-gray-500" data-testid="memberships-empty">
          You aren&apos;t a member of any household yet. Create one
          below or accept an invite.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {memberships.map(({ household, role }) => {
            const isCurrent = currentHousehold?.id === household.id
            const isConfirming = confirmingId === household.id
            const isLeaving = leavingId === household.id

            return (
              <li
                key={household.id}
                className="flex flex-col gap-2 py-2"
                data-testid={`membership-row-${household.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {household.alias ?? household.name}
                    </span>
                    <RoleBadge role={role} />
                    {isCurrent && (
                      <span className="text-xs text-emerald-700">(viewing)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(household.id)}
                    disabled={isLeaving}
                    className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    data-testid={`leave-household-${household.id}`}
                  >
                    Leave
                  </button>
                </div>

                {isConfirming && (
                  <div
                    className="rounded-md bg-amber-50 p-2 text-xs text-amber-900"
                    data-testid={`leave-confirm-${household.id}`}
                  >
                    <p>
                      Leave <span className="font-semibold">{household.name}</span>?
                      You&apos;ll lose your {roleLabel(role).toLowerCase()} access
                      and need a new invite to return.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleLeave(household.id)}
                        disabled={isLeaving}
                        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        data-testid={`leave-confirm-yes-${household.id}`}
                      >
                        {isLeaving ? 'Leaving…' : 'Yes, leave'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={isLeaving}
                        className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-amber-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
