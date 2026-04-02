import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'
import RoleBadge from './RoleBadge'

interface MemberRow {
  user_id: string
  role: string
  joined_at: string
  profiles: { display_name: string; avatar_url: string | null } | null
}

export default function MemberList() {
  const { user } = useAuth()
  const { currentHousehold, currentRole } = useHousehold()
  const queryClient = useQueryClient()

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

  const handleRemove = async (userId: string) => {
    if (!currentHousehold) return

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', currentHousehold.id)
      .eq('user_id', userId)

    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ['household-members', currentHousehold.id] })
    }
  }

  if (!currentHousehold) return null

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Members</h3>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-500">No members found.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {members.map((member) => (
            <li key={member.user_id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">
                  {member.profiles?.display_name ?? 'Unknown user'}
                </span>
                <RoleBadge role={member.role} />
                {member.user_id === user?.id && (
                  <span className="text-xs text-gray-400">(you)</span>
                )}
              </div>
              {currentRole === 'owner' && member.user_id !== user?.id && (
                <button
                  onClick={() => handleRemove(member.user_id)}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
