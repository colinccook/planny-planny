import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useHousehold } from '../../hooks/useHousehold'

export default function PublicShareToggle() {
  const { currentHousehold, currentRole } = useHousehold()
  const queryClient = useQueryClient()
  const [toggling, setToggling] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!currentHousehold || (currentRole !== 'owner' && currentRole !== 'member')) {
    return null
  }

  const isEnabled = !!currentHousehold.public_share_token

  const handleToggle = async () => {
    setToggling(true)

    try {
      const newToken = isEnabled ? null : crypto.randomUUID()

      const { error } = await supabase
        .from('households')
        .update({ public_share_token: newToken })
        .eq('id', currentHousehold.id)

      if (!error) {
        await queryClient.invalidateQueries({ queryKey: ['my-households'] })
      }
    } finally {
      setToggling(false)
    }
  }

  const copyLink = async () => {
    if (!currentHousehold.public_share_token) return
    const url = `${window.location.origin}/shared/${currentHousehold.public_share_token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Public Sharing</h3>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-700">Share meal plan publicly</p>
          <p className="text-xs text-gray-500">Anyone with the link can view your meal plans</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          disabled={toggling}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 ${
            isEnabled ? 'bg-emerald-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {isEnabled && currentHousehold.public_share_token && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-100 p-2">
          <code className="flex-1 truncate text-xs text-gray-500">
            {window.location.origin}/shared/{currentHousehold.public_share_token}
          </code>
          <button
            onClick={copyLink}
            className="shrink-0 rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
