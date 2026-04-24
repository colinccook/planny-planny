import { useState, useMemo } from 'react'
import { useHousehold } from '../../hooks/useHousehold'
import {
  useDayPlaceholders,
  useUpsertDayPlaceholder,
  useDeleteDayPlaceholder,
} from '../../hooks/useDayPlaceholders'

const DAYS = [
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
  { index: 0, name: 'Sunday' },
]

export default function DayPlaceholders() {
  const { currentHousehold, currentRole } = useHousehold()
  const { data: placeholders = [], isLoading } = useDayPlaceholders(currentHousehold?.id)
  const upsertMutation = useUpsertDayPlaceholder()
  const deleteMutation = useDeleteDayPlaceholder()

  const [localEdits, setLocalEdits] = useState<Record<number, string>>({})
  const [savedDays, setSavedDays] = useState<Set<number>>(new Set())

  const canEdit = currentRole === 'owner' || currentRole === 'member'

  const serverLabels = useMemo(() => {
    const map: Record<number, string> = {}
    for (const p of placeholders) {
      map[p.day_of_week] = p.label
    }
    return map
  }, [placeholders])

  // Merge server labels with local edits (local edits take priority)
  const labels = { ...serverLabels, ...localEdits }

  const setLabel = (dayOfWeek: number, value: string) => {
    setLocalEdits((prev) => ({ ...prev, [dayOfWeek]: value }))
  }

  if (!currentHousehold) return null

  const handleSave = async (dayOfWeek: number) => {
    const label = labels[dayOfWeek]?.trim()
    if (!label) return

    await upsertMutation.mutateAsync({
      household_id: currentHousehold.id,
      day_of_week: dayOfWeek,
      label,
    })

    setSavedDays((prev) => new Set(prev).add(dayOfWeek))
    setTimeout(() => {
      setSavedDays((prev) => {
        const next = new Set(prev)
        next.delete(dayOfWeek)
        return next
      })
    }, 1500)
  }

  const handleDelete = async (dayOfWeek: number) => {
    const existing = placeholders.find((p) => p.day_of_week === dayOfWeek)
    if (!existing) return

    await deleteMutation.mutateAsync({
      id: existing.id,
      householdId: currentHousehold.id,
    })

    setLocalEdits((prev) => {
      // Build a new object excluding the deleted key (avoids dynamic delete).
      const next: Record<number, string> = {}
      for (const key of Object.keys(prev)) {
        const numericKey = Number(key)
        if (numericKey !== dayOfWeek) {
          next[numericKey] = prev[numericKey]
        }
      }
      return next
    })
  }

  const handleBlur = (dayOfWeek: number) => {
    const label = labels[dayOfWeek]?.trim()
    const existing = placeholders.find((p) => p.day_of_week === dayOfWeek)

    if (label && label !== existing?.label) {
      handleSave(dayOfWeek)
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow" data-testid="day-placeholders">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Day Placeholders</h3>
      <p className="mb-3 text-xs text-gray-500">
        Set default themes for each day (e.g. &quot;Oily fish Monday&quot;).
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {DAYS.map(({ index, name }) => {
            const existing = placeholders.find((p) => p.day_of_week === index)
            return (
              <div key={index} className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs font-medium text-gray-700">
                  {name}
                </label>
                <input
                  type="text"
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder={`e.g. ${name} theme`}
                  value={labels[index] ?? ''}
                  onChange={(e) => setLabel(index, e.target.value)}
                  onBlur={() => handleBlur(index)}
                  disabled={!canEdit}
                  aria-label={`${name} placeholder`}
                />
                {canEdit && existing && (
                  <button
                    onClick={() => handleDelete(index)}
                    className="shrink-0 rounded px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    aria-label={`Clear ${name}`}
                  >
                    ✕
                  </button>
                )}
                {savedDays.has(index) && (
                  <span className="text-xs text-emerald-600">✓</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!canEdit && (
        <p className="mt-2 text-xs text-gray-400">
          Only owners and members can edit day placeholders.
        </p>
      )}
    </div>
  )
}
