import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useHousehold } from '../hooks/useHousehold'
import { useMealPlans } from '../hooks/useMealPlans'
import AddMealView from '../components/calendar/AddMealView'
import { SkeletonFormField } from '../components/ui/Skeleton'

function MealFormSkeleton() {
  return (
    <div className="flex flex-1 flex-col p-4" data-testid="meal-form-skeleton">
      <div className="flex-1 space-y-3">
        <SkeletonFormField />
        <SkeletonFormField />
        <SkeletonFormField />
      </div>
    </div>
  )
}

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
  const showSkeleton = isLoading || (mealId !== undefined && mealsLoading)

  return (
    <AnimatePresence mode="wait">
      {showSkeleton ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <MealFormSkeleton />
        </motion.div>
      ) : !currentHousehold || !date ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">Invalid page.</p>
        </div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <AddMealView
            householdId={currentHousehold.id}
            date={date}
            existingMeal={existingMeal}
            onBack={() => navigate(`/calendar/${date}`)}
            onSaved={() => navigate(`/calendar/${date}`)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
