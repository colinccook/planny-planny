import { useParams, useNavigate } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import DayDetailView from '../components/calendar/DayDetailView'

export default function DayDetailPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const { currentHousehold, currentRole, isLoading } = useHousehold()

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
    />
  )
}
