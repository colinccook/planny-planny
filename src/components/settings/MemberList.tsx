import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'
import {
  ACCESS_LEVELS,
  canManageMembers,
  type Role,
} from '../../lib/permissions'
import RoleBadge from './RoleBadge'
import AccessLevelsLink from './AccessLevelsLink'
import AccessLevelsList from './AccessLevelsList'
import Tray from '../ui/Tray'
import { SkeletonBlock } from '../ui/Skeleton'

interface MemberRow {
  user_id: string
  role: string
  joined_at: string
  profiles: { display_name: string; avatar_url: string | null } | null
}

const ROLE_KEYS = new Set<string>(ACCESS_LEVELS.map((l) => l.key))
const SELECTABLE_ROLES = new Set<string>(['owner', 'member', 'honoured_guest', 'voting_guest'])

export default function MemberList() {
  const { user } = useAuth()
  const { currentHousehold, currentRole } = useHousehold()
  const queryClient = useQueryClient()
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null)
  const [savingRole, setSavingRole] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['household-members', currentHousehold?.id],
    queryFn: async () => {
      if (!currentHousehold) return []
      const { data, error } = await supabase
        .from('household_members')
        .select('user_id, role, joined_at, profiles(display_name, avatar_url)')
        .eq('household_id', currentHousehold.id)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as MemberRow[]
    },
    enabled: !!currentHousehold,
  })

  if (!currentHousehold) return null

  const isOwner = canManageMembers(currentRole)

  const handleRemove = async (userId: string) => {
    if (!currentHousehold) return

    setError(null)
    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', currentHousehold.id)
      .eq('user_id', userId)

    if (error) {
      setError(error.message)
      return
    }
    await queryClient.invalidateQueries({
      queryKey: ['household-members', currentHousehold.id],
    })
  }

  const handleChangeRole = async (newRole: string) => {
    if (!editingMember || !currentHousehold) return
    if (!SELECTABLE_ROLES.has(newRole)) return
    if (newRole === editingMember.role) {
      setEditingMember(null)
      return
    }

    setSavingRole(true)
    setError(null)

    const { error } = await supabase
      .from('household_members')
      .update({ role: newRole as Role })
      .eq('household_id', currentHousehold.id)
      .eq('user_id', editingMember.user_id)

    setSavingRole(false)

    if (error) {
      setError(error.message)
      return
    }

    await queryClient.invalidateQueries({
      queryKey: ['household-members', currentHousehold.id],
    })
    await queryClient.invalidateQueries({ queryKey: ['my-households'] })
    setEditingMember(null)
  }

  const openEditor = (member: MemberRow) => {
    if (!isOwner) return
    if (!ROLE_KEYS.has(member.role)) return
    setEditingMember(member)
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow" data-testid="member-list">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Members</h3>
        <AccessLevelsLink />
      </div>

      {isOwner && (
        <p className="mb-2 text-xs text-gray-500">
          Tap a member to change their access level.
        </p>
      )}

      {error && (
        <p className="mb-2 text-xs text-red-600" role="alert" data-testid="member-list-error">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2" data-testid="member-list-skeleton">
          {[1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-10" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-500">No members found.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {members.map((member) => {
            const displayName = member.profiles?.display_name ?? 'Unknown user'
            const isSelf = member.user_id === user?.id
            const isClickable = isOwner && !isSelf

            const inner = (
              <>
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-sm text-gray-900">{displayName}</span>
                  <RoleBadge role={member.role} />
                  {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                </div>
                {isOwner && !isSelf && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(member.user_id)
                    }}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    data-testid={`remove-member-${member.user_id}`}
                  >
                    Remove
                  </button>
                )}
              </>
            )

            return (
              <li
                key={member.user_id}
                className="flex items-center justify-between py-2"
                data-testid={`member-row-${member.user_id}`}
              >
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => openEditor(member)}
                    className="flex flex-1 items-center justify-between rounded px-1 py-1 text-left hover:bg-gray-50"
                    data-testid={`edit-member-${member.user_id}`}
                    aria-label={`Change access level for ${displayName}`}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="flex flex-1 items-center justify-between px-1 py-1">
                    {inner}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Tray
        isOpen={editingMember !== null}
        onClose={() => (savingRole ? undefined : setEditingMember(null))}
        title={`Access level: ${editingMember?.profiles?.display_name ?? ''}`}
        description="Tap a level to change what this person can do."
      >
        <AccessLevelsList
          currentKey={editingMember?.role}
          onSelect={handleChangeRole}
          disabled={savingRole}
          // The "public" entry is informational — it's not a role
          // a household member can hold.
          filter={(level) => level.key !== 'public'}
        />
      </Tray>
    </div>
  )
}
