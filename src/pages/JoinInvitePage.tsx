import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import RoleBadge from '../components/settings/RoleBadge'

interface InviteInfo {
  id: string
  role: 'member' | 'honoured_guest' | 'voting_guest'
  household_id: string
  email: string | null
  households: { name: string } | null
}

export default function JoinInvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const fetchInvite = async () => {
      const { data, error: fetchError } = await supabase
        .from('household_invites')
        .select('id, role, household_id, email, households(name)')
        .eq('token', token)
        .single()

      if (fetchError || !data) {
        setError('Invite not found or has already been used.')
      } else {
        setInvite(data as unknown as InviteInfo)
      }
      setLoading(false)
    }

    fetchInvite()
  }, [token])

  useEffect(() => {
    if (!authLoading && !user && token) {
      navigate(`/register?redirect=/invite/${token}`, { replace: true })
    }
  }, [authLoading, user, token, navigate])

  // Once we know the invite + the user, check the email matches.
  const emailMismatch =
    !!invite &&
    !!invite.email &&
    !!user?.email &&
    invite.email.toLowerCase() !== user.email.toLowerCase()

  const handleJoin = async () => {
    if (!user || !invite) return
    if (emailMismatch) return
    setJoining(true)
    setError(null)

    try {
      const { error: memberError } = await supabase.from('household_members').insert({
        household_id: invite.household_id,
        user_id: user.id,
        role: invite.role,
      })

      if (memberError) {
        if (memberError.code === '23505') {
          // Already a member — just redirect (the invite has
          // probably already been consumed by the trigger).
          navigate('/calendar', { replace: true })
          return
        }
        throw memberError
      }

      // The DB trigger consume_invite_on_join cleans up the
      // matching invite row automatically.
      navigate('/calendar', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join household')
      setJoining(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow">
          <h2 className="mb-2 text-lg font-bold text-gray-900">Invalid Invite</h2>
          <p className="mb-4 text-sm text-gray-500">{error}</p>
          <Link
            to="/calendar"
            className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to app
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Join Household</h2>
        <p className="mb-4 text-sm text-gray-500">
          You&apos;ve been invited to join{' '}
          <span className="font-medium text-gray-900">
            {invite?.households?.name ?? 'a household'}
          </span>
        </p>

        <div className="mb-4 flex justify-center">
          <RoleBadge role={invite?.role ?? 'honoured_guest'} />
        </div>

        {emailMismatch && (
          <div
            className="mb-3 rounded-md bg-amber-50 p-3 text-left text-xs text-amber-800"
            role="alert"
            data-testid="invite-email-mismatch"
          >
            <p className="font-semibold">This invite isn&apos;t for you.</p>
            <p className="mt-1">
              It was sent to <span className="font-medium">{invite?.email}</span>{' '}
              but you&apos;re signed in as{' '}
              <span className="font-medium">{user?.email}</span>. Sign out and
              sign in with the invited email, or ask the inviter to send a new
              link.
            </p>
          </div>
        )}

        {error && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button
          onClick={handleJoin}
          disabled={joining || emailMismatch}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          data-testid="join-household-button"
        >
          {joining ? 'Joining…' : 'Join household'}
        </button>
      </div>
    </div>
  )
}
