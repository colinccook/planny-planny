import { AnimatePresence, motion } from 'framer-motion'
import { useHousehold } from '../hooks/useHousehold'
import CalendarView from '../components/calendar/CalendarView'
import { SkeletonDayRow } from '../components/ui/Skeleton'

function CalendarSkeleton() {
  return (
    <div className="space-y-3 p-4" data-testid="calendar-skeleton">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonDayRow key={i} />
      ))}
    </div>
  )
}

export default function CalendarPage() {
  const { currentHousehold, currentRole, isLoading } = useHousehold()

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <CalendarSkeleton />
        </motion.div>
      ) : !currentHousehold ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">No household selected.</p>
          <p className="mt-1 text-sm text-gray-400">
            Create or join a household in Settings.
          </p>
        </div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <CalendarView
            household={currentHousehold}
            currentRole={currentRole}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
