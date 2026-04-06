import { useParams, useNavigate } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { useMealPlans } from '../hooks/useMealPlans'
import AddMealView from '../components/calendar/AddMealView'

export default function MealFormPage() {
  const { date, mealId } = useParams<{ date: string; mealId?: string }>()
  const navigate = useNavigate()
  const { currentHousehold, isLoading } = useHousehold()

  const { data: meals = [], isLoading: mealsLoading } = useMealPlans(
    currentHousehold?.id,
    date ?? '',
    date ?? '',
  )

  const existingMeal = mealId ? meals.find((m) => m.id === mealId) : undefined

  if (isLoading || (mealId && mealsLoading)) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
      </div>
    )
  }

  if (!currentHousehold || !date) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Invalid page.</p>
      </div>
    )
  }

  return (
    <AddMealView
      householdId={currentHousehold.id}
      date={date}
      existingMeal={existingMeal}
      onBack={() => navigate(`/calendar/${date}`)}
      onSaved={() => navigate(`/calendar/${date}`)}
    />
  )
}
