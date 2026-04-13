import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'

interface HeaderOverride {
  title: string
  onBack: () => void
}

interface HeaderOverrideContextValue {
  override: HeaderOverride | null
  setOverride: (override: HeaderOverride) => void
  clearOverride: () => void
}

const HeaderOverrideContext = createContext<HeaderOverrideContextValue | null>(null)

export function HeaderOverrideProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<HeaderOverride | null>(null)

  const setOverride = useCallback((o: HeaderOverride) => {
    setOverrideState(o)
  }, [])

  const clearOverride = useCallback(() => {
    setOverrideState(null)
  }, [])

  return (
    <HeaderOverrideContext.Provider value={{ override, setOverride, clearOverride }}>
      {children}
    </HeaderOverrideContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHeaderOverride() {
  const ctx = useContext(HeaderOverrideContext)
  if (!ctx) {
    throw new Error('useHeaderOverride must be used within HeaderOverrideProvider')
  }
  return ctx
}

/**
 * Registers a header override while the component is mounted.
 * Clears the override on unmount.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRegisterHeaderOverride(title: string, onBack: () => void) {
  const { setOverride, clearOverride } = useHeaderOverride()
  const onBackRef = useRef(onBack)

  useEffect(() => {
    onBackRef.current = onBack
  })

  useEffect(() => {
    setOverride({ title, onBack: () => onBackRef.current() })
    return () => {
      clearOverride()
    }
  }, [title, setOverride, clearOverride])
}
