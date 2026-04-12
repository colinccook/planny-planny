import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type Direction = 'forward' | 'backward'

interface CalendarDirectionContextValue {
  direction: Direction
  toggleDirection: () => void
  infoDismissed: boolean
  dismissInfo: () => void
}

const CalendarDirectionContext = createContext<CalendarDirectionContextValue | null>(null)

export function CalendarDirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<Direction>('forward')
  const [infoDismissed, setInfoDismissed] = useState(false)

  const toggleDirection = useCallback(() => {
    setDirection((prev) => {
      const next = prev === 'forward' ? 'backward' : 'forward'
      if (next === 'backward') {
        setInfoDismissed(false)
      }
      return next
    })
  }, [])

  const dismissInfo = useCallback(() => {
    setInfoDismissed(true)
  }, [])

  return (
    <CalendarDirectionContext.Provider
      value={{ direction, toggleDirection, infoDismissed, dismissInfo }}
    >
      {children}
    </CalendarDirectionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCalendarDirection() {
  const ctx = useContext(CalendarDirectionContext)
  if (!ctx) {
    throw new Error('useCalendarDirection must be used within CalendarDirectionProvider')
  }
  return ctx
}
