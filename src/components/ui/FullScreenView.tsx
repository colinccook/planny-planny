import type { ReactNode } from 'react'

interface FullScreenViewProps {
  title: string
  onBack: () => void
  children: ReactNode
}

export default function FullScreenView({ title, onBack, children }: FullScreenViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Title bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-emerald-600 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
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
        <h1 className="flex-1 text-lg font-bold text-white">{title}</h1>
      </div>

      {/* Content */}
      <div className="flex-1">{children}</div>
    </div>
  )
}
