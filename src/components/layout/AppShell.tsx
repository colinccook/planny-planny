import type { ReactNode } from 'react'
import { useHousehold } from '../../hooks/useHousehold'
import { usePlanStreak } from '../../hooks/usePlanStreak'
import { HeaderOverrideProvider, useHeaderOverride } from '../../hooks/useHeaderOverride'
import { CalendarDirectionProvider } from '../../hooks/useCalendarDirection'
import TabBar from './TabBar'

function AppShellInner({ children }: { children: ReactNode }) {
  const { currentHousehold } = useHousehold()
  const { data: streak, isSuccess } = usePlanStreak(currentHousehold?.id)
  const { override } = useHeaderOverride()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="safe-area-top flex items-center gap-3 bg-emerald-600 px-4 py-3">
        {override ? (
          <>
            <button
              type="button"
              onClick={override.onBack}
              className="rounded-md p-1 text-emerald-100 hover:bg-emerald-700 hover:text-white"
              aria-label="Go back"
              data-testid="back-button"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="flex-1 text-lg font-bold text-white">{override.title}</h1>
          </>
        ) : (
          <>
            <h1 className="flex-1 text-lg font-bold text-white">Planny Planny</h1>
            {isSuccess && (
              <span
                className="flex items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-sm font-medium text-white"
                aria-label={`${streak} ${streak === 1 ? 'day' : 'days'} planning streak`}
              >
                🔥 {streak}
              </span>
            )}
          </>
        )}
      </header>

      <main className="flex-1 pb-16">{children}</main>

      <TabBar />
    </div>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <CalendarDirectionProvider>
      <HeaderOverrideProvider>
        <AppShellInner>{children}</AppShellInner>
      </HeaderOverrideProvider>
    </CalendarDirectionProvider>
  )
}
