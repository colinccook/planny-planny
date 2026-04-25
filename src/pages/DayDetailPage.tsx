import { useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import DayDetailView from '../components/calendar/DayDetailView'
import { getAdjacentDate } from '../lib/dates'

interface DayNavState {
  enterFrom?: 'left' | 'right'
}

export default function DayDetailPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentHousehold, currentRole, isLoading } = useHousehold()

  const enterFrom = (location.state as DayNavState | null)?.enterFrom ?? null

  // Clear router state after first render so a back-then-forward navigation
  // doesn't replay the slide animation unexpectedly.
  useEffect(() => {
    if (enterFrom) {
      window.history.replaceState({ ...window.history.state, usr: null }, '')
    }
  }, [enterFrom, date])

  const { prevDate, nextDate } = useMemo(() => {
    if (!date) return { prevDate: null, nextDate: null }
    return {
      prevDate: getAdjacentDate(date, -1),
      nextDate: getAdjacentDate(date, 1),
    }
  }, [date])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
      </div>
    )
  }

  if (!currentHousehold || !date) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Day not found.</p>
      </div>
    )
  }

  return (
    <DayDetailView
      date={date}
      household={currentHousehold}
      currentRole={currentRole}
      onBack={() => navigate('/calendar')}
      onAddMeal={() => navigate(`/calendar/${date}/add`)}
      onEditMeal={(mealId) => navigate(`/calendar/${date}/edit/${mealId}`)}
      enterFrom={enterFrom}
      onPrevDay={
        prevDate
          ? () => navigate(`/calendar/${prevDate}`, { state: { enterFrom: 'left' } })
          : undefined
      }
      onNextDay={
        nextDate
          ? () => navigate(`/calendar/${nextDate}`, { state: { enterFrom: 'right' } })
          : undefined
      }
    />
  )
}
