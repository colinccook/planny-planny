import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * The single overlay (tray, modal, sheet) currently visible to the user.
 *
 * We hold this in a single `useState` rather than scattering boolean
 * `[showXxxTray, setShowXxxTray]` pairs across components. That makes it
 * impossible to open two trays at once — opening the second one closes
 * the first — and gives the back gesture / Esc handler a single place to
 * look.
 *
 * `id` is a string the caller picks. Use a stable namespacing convention
 * like `"day-detail:add-idea"` or `"day-detail:idea:<idea-id>"` so two
 * independent components don't clash.
 *
 * `data` is whatever the overlay needs to render (the selected meal id,
 * the idea object, etc.). Keeping it in the overlay state — rather than
 * in a separate `useState` next to the boolean — means opening and
 * payload always move together.
 */
export interface OpenOverlay {
  id: string
  // We deliberately type as `unknown` and ask consumers to narrow.
  // A discriminated union per call-site is cleaner than a giant global one.
  data?: unknown
}

export interface OverlayContextValue {
  current: OpenOverlay | null
  /** Open `id` (closes any other overlay). */
  open: (id: string, data?: unknown) => void
  /** Close `id`, but only if it's the currently-open one. */
  close: (id?: string) => void
  /** True iff `id` is the currently-open overlay. */
  isOpen: (id: string) => boolean
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<OpenOverlay | null>(null)

  const open = useCallback((id: string, data?: unknown) => {
    setCurrent({ id, data })
  }, [])

  const close = useCallback((id?: string) => {
    setCurrent((prev) => {
      if (prev === null) return null
      if (id !== undefined && prev.id !== id) return prev
      return null
    })
  }, [])

  const isOpen = useCallback(
    (id: string) => current?.id === id,
    [current],
  )

  const value = useMemo<OverlayContextValue>(
    () => ({ current, open, close, isOpen }),
    [current, open, close, isOpen],
  )

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}

/**
 * Access the global overlay slot. Most consumers will use the `useOverlay`
 * hook below which scopes the API to a single overlay id.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useOverlayContext(): OverlayContextValue {
  const ctx = useContext(OverlayContext)
  if (ctx === undefined) {
    throw new Error('useOverlay must be used within an OverlayProvider')
  }
  return ctx
}

export interface OverlaySlot<T = unknown> {
  isOpen: boolean
  /** The data passed to `open(id, data)`, or `null` when closed. */
  data: T | null
  open: (data?: T) => void
  close: () => void
}

/**
 * A scoped view onto the global overlay slot for a single overlay id.
 * This is the everyday API — it gives callers the same ergonomics as a
 * `useState<boolean>` while still routing through the shared store so
 * only one overlay is ever open.
 *
 *   const addIdea = useOverlay('day-detail:add-idea')
 *   <Tray isOpen={addIdea.isOpen} onClose={addIdea.close}>…</Tray>
 *   <button onClick={() => addIdea.open()}>+ Add idea</button>
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useOverlay<T = unknown>(id: string): OverlaySlot<T> {
  const ctx = useOverlayContext()
  const isOpen = ctx.current?.id === id
  return {
    isOpen,
    data: isOpen ? ((ctx.current?.data ?? null) as T | null) : null,
    open: (data?: T) => ctx.open(id, data),
    close: () => ctx.close(id),
  }
}
