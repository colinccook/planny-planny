import { useHousehold } from '../hooks/useHousehold'
import CalendarView from '../components/calendar/CalendarView'

export default function CalendarPage() {
  const { currentHousehold, currentRole, isLoading } = useHousehold()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
      </div>
    )
  }

  if (!currentHousehold) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No household selected.</p>
        <p className="mt-1 text-sm text-gray-400">
          Create or join a household in Settings.
        </p>
      </div>
    )
  }

  return (
    <CalendarView
      household={currentHousehold}
      currentRole={currentRole}
    />
  )
}
