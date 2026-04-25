import { useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useHousehold } from '../hooks/useHousehold'
import DayDetailView from '../components/calendar/DayDetailView'
import { getAdjacentDate } from '../lib/dates'
import { SkeletonMealCard, SkeletonBlock } from '../components/ui/Skeleton'

interface DayNavState {
  enterFrom?: 'left' | 'right'
}

function DayDetailSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="day-detail-skeleton">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonMealCard />
      <SkeletonMealCard />
    </div>
  )
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

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <DayDetailSkeleton />
        </motion.div>
      ) : !currentHousehold || !date ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">Day not found.</p>
        </div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        >
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
