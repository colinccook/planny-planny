import { useState, useCallback, type ReactNode } from 'react'
import { ToastContext } from '../../hooks/useToast'

interface Toast {
  id: number
  message: string
}

let nextId = 0

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            data-testid="toast"
            className="pointer-events-auto animate-fade-in-up rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
