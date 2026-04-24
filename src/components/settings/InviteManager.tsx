import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'
import { copyToClipboard } from '../../lib/clipboard'
import { buildInviteUrl } from '../../lib/appUrl'
import { useToast } from '../../hooks/useToast'
import { canInviteMembers, INVITABLE_ROLES, type InvitableRole } from '../../lib/permissions'
import RoleBadge from './RoleBadge'
import AccessLevelsLink from './AccessLevelsLink'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function InviteManager() {
  const { user } = useAuth()
  const { currentHousehold, currentRole } = useHousehold()
  const queryClient = useQueryClient()
  const [inviteRole, setInviteRole] = useState<InvitableRole>('member')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['household-invites', currentHousehold?.id],
    queryFn: async () => {
      if (!currentHousehold) return []
      const { data, error } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!currentHousehold,
  })

  // Owners and members can issue invites; honoured guests
  // explicitly cannot (only members and above can bring new
  // people into the household).
  if (!currentHousehold || !canInviteMembers(currentRole)) {
    return null
  }

  const handleCreate = async () => {
    if (!user || !currentHousehold) return
    setError(null)

    const email = inviteEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setCreating(true)

    try {
      const { error: insertError } = await supabase.from('household_invites').insert({
        household_id: currentHousehold.id,
        role: inviteRole,
        email,
        created_by: user.id,
      })

      if (insertError) {
        setError(insertError.message)
      } else {
        setInviteEmail('')
        await queryClient.invalidateQueries({
          queryKey: ['household-invites', currentHousehold.id],
        })
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('household_invites').delete().eq('id', id)

    if (!error) {
      await queryClient.invalidateQueries({
        queryKey: ['household-invites', currentHousehold.id],
      })
    }
  }

  const copyLink = async (token: string, id: string) => {
    const url = buildInviteUrl(token)
    await copyToClipboard(url)
    setCopiedId(id)
    showToast('Copied invite link to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Invite Links</h3>
        <AccessLevelsLink />
      </div>

      <p className="mb-3 text-xs text-gray-500">
        Invite links are tied to a specific email address and stop
        working once that person has joined.
      </p>

      <div className="mb-2 space-y-2">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="friend@example.com"
          aria-label="Recipient email"
          data-testid="invite-email-input"
          className="w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as InvitableRole)}
            aria-label="Invite role"
            data-testid="invite-role-select"
            className="min-h-[44px] flex-1 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            {INVITABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {role === 'member'
                  ? 'Member'
                  : role === 'honoured_guest'
                    ? 'Honoured Guest'
                    : 'Voting Guest'}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={creating || !inviteEmail.trim()}
            data-testid="generate-invite-button"
            className="min-h-[44px] rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Generate invite'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600" role="alert" data-testid="invite-error">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="h-8 animate-pulse rounded bg-gray-100" />
      ) : invites.length === 0 ? (
        <p className="text-sm text-gray-500">No active invites.</p>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center justify-between rounded-md border border-gray-100 p-2"
              data-testid={`invite-row-${invite.id}`}
            >
              <div className="flex flex-col gap-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <RoleBadge role={invite.role} />
                  <span className="truncate text-xs font-medium text-gray-700">
                    {invite.email ?? 'Anyone with link'}
                  </span>
                </div>
                <code className="truncate text-xs text-gray-500">
                  /invite/{invite.token}
                </code>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => copyLink(invite.token, invite.id)}
                  className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                >
                  {copiedId === invite.id ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => handleDelete(invite.id)}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
