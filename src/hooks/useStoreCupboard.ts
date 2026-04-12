import { useCallback, useMemo, useSyncExternalStore } from 'react'

const STORAGE_PREFIX = 'cupboard:'

interface CupboardState {
  dismissedIngredientIds: string[]
}

const EMPTY_STATE: CupboardState = { dismissedIngredientIds: [] }

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function readState(userId: string): CupboardState {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (raw) {
      const parsed = JSON.parse(raw) as CupboardState
      if (Array.isArray(parsed.dismissedIngredientIds)) {
        return parsed
      }
    }
  } catch {
    // Corrupted data — return default
  }
  return EMPTY_STATE
}

function writeState(userId: string, state: CupboardState): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(state))
  window.dispatchEvent(new Event('cupboard-change'))
}

// Snapshot cache: only create new objects when localStorage content changes
let cachedKey = ''
let cachedRaw = ''
let cachedState: CupboardState = EMPTY_STATE

function getSnapshotFor(userId: string): CupboardState {
  const key = getStorageKey(userId)
  const raw = localStorage.getItem(key) ?? ''
  if (key === cachedKey && raw === cachedRaw) {
    return cachedState
  }
  cachedKey = key
  cachedRaw = raw
  cachedState = raw ? readState(userId) : EMPTY_STATE
  return cachedState
}

function subscribe(callback: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(STORAGE_PREFIX)) {
      callback()
    }
  }
  const handleCupboardChange = () => callback()
  window.addEventListener('storage', handleStorage)
  window.addEventListener('cupboard-change', handleCupboardChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('cupboard-change', handleCupboardChange)
  }
}

export function useStoreCupboard(userId: string | undefined) {
  const getSnapshot = useCallback(
    () => (userId ? getSnapshotFor(userId) : EMPTY_STATE),
    [userId]
  )

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const dismissedIds = useMemo(
    () => state.dismissedIngredientIds,
    [state]
  )

  const dismiss = useCallback(
    (ingredientId: string) => {
      if (!userId) return
      const current = readState(userId)
      if (current.dismissedIngredientIds.includes(ingredientId)) return
      writeState(userId, {
        dismissedIngredientIds: [...current.dismissedIngredientIds, ingredientId],
      })
    },
    [userId]
  )

  const undismiss = useCallback(
    (ingredientId: string) => {
      if (!userId) return
      const current = readState(userId)
      writeState(userId, {
        dismissedIngredientIds: current.dismissedIngredientIds.filter(
          (id) => id !== ingredientId
        ),
      })
    },
    [userId]
  )

  const resetAll = useCallback(() => {
    if (!userId) return
    writeState(userId, { dismissedIngredientIds: [] })
  }, [userId])

  return {
    dismissedIds,
    isDismissed: useCallback(
      (id: string) => dismissedIds.includes(id),
      [dismissedIds]
    ),
    dismiss,
    undismiss,
    resetAll,
  }
}
