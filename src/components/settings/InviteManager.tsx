import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'
import RoleBadge from './RoleBadge'

export default function InviteManager() {
  const { user } = useAuth()
  const { currentHousehold, currentRole } = useHousehold()
  const queryClient = useQueryClient()
  const [inviteRole, setInviteRole] = useState<'member' | 'guest'>('member')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  if (!currentHousehold || (currentRole !== 'owner' && currentRole !== 'member')) {
    return null
  }

  const handleCreate = async () => {
    if (!user || !currentHousehold) return
    setCreating(true)

    try {
      const { error } = await supabase.from('household_invites').insert({
        household_id: currentHousehold.id,
        role: inviteRole,
        created_by: user.id,
      })

      if (!error) {
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
    const url = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Invite Links</h3>

      <div className="mb-3 flex items-center gap-2">
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as 'member' | 'guest')}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        >
          <option value="member">Member</option>
          <option value="guest">Guest</option>
        </select>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Generate invite'}
        </button>
      </div>

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
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <RoleBadge role={invite.role} />
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
