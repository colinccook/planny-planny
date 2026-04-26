import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useHousehold } from '../../hooks/useHousehold'
import { usePlanStreak } from '../../hooks/usePlanStreak'
import { HeaderOverrideProvider, useHeaderOverride } from '../../hooks/useHeaderOverride'
import { CalendarDirectionProvider } from '../../hooks/useCalendarDirection'
import HeaderCountBadge from '../ui/HeaderCountBadge'
import TabBar from './TabBar'

const ALWAYS_ACCESSIBLE = new Set(['/settings'])

function AppShellInner({ children }: { children: ReactNode }) {
  const { currentHousehold, memberships, isLoading } = useHousehold()
  const { data: streak, isSuccess } = usePlanStreak(currentHousehold?.id)
  const { override } = useHeaderOverride()
  const location = useLocation()

  // If you've left or been removed from your last household,
  // every other tab would be a dead end. Bounce to /settings so
  // you can join or create one.
  const noHouseholds = !isLoading && memberships.length === 0
  if (noHouseholds && !ALWAYS_ACCESSIBLE.has(location.pathname)) {
    return <Navigate to="/settings" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="safe-area-top sticky top-0 z-10 flex items-center gap-3 bg-emerald-600 px-4 pb-3">
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
              <HeaderCountBadge
                icon="🔥"
                count={streak}
                hideWhenZero={false}
                ariaLabel={`${streak} ${streak === 1 ? 'day' : 'days'} planning streak`}
                testId="streak-badge"
              />
            )}
          </>
        )}
      </header>

      <main className="flex-1 pb-safe-tab-bar">{children}</main>

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
