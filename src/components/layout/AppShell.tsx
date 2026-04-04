import type { ReactNode } from 'react'
import { useHousehold } from '../../hooks/useHousehold'
import { usePlanStreak } from '../../hooks/usePlanStreak'
import TabBar from './TabBar'

export default function AppShell({ children }: { children: ReactNode }) {
  const { currentHousehold } = useHousehold()
  const { data: streak } = usePlanStreak(currentHousehold?.id)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="safe-area-top flex items-center justify-between bg-emerald-600 px-4 py-3">
        <h1 className="text-lg font-bold text-white">Planny Planny</h1>
        <span
          className="flex items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-sm font-medium text-white"
          aria-label={`${streak ?? 0} day planning streak`}
        >
          🔥 {streak ?? 0}
        </span>
      </header>

      <main className="flex-1 pb-16">{children}</main>

      <TabBar />
    </div>
  )
}
