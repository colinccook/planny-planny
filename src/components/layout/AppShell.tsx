import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import TabBar from './TabBar'

export default function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between bg-emerald-600 px-4 py-3">
        <h1 className="text-lg font-bold text-white">Planny Planny</h1>
        <button
          onClick={signOut}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-700 hover:text-white"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 pb-16">{children}</main>

      <TabBar />
    </div>
  )
}
