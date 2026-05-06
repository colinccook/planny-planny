import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useHousehold } from '../hooks/useHousehold'
import { useTodos } from '../hooks/useTodos'
import { toDateString } from '../lib/dates'
import TodoDetailView from '../components/calendar/TodoDetailView'
import { SkeletonFormField } from '../components/ui/Skeleton'

function TodoFormSkeleton() {
  return (
    <div className="flex flex-1 flex-col p-4" data-testid="todo-form-skeleton">
      <div className="flex-1 space-y-3">
        <SkeletonFormField />
        <SkeletonFormField />
        <SkeletonFormField />
      </div>
    </div>
  )
}

export default function TodoFormPage() {
  const { date, todoId } = useParams<{ date: string; todoId?: string }>()
  const navigate = useNavigate()
  const { currentHousehold, isLoading } = useHousehold()

  // For edit mode, we need to find the todo. Pull a wide-enough window:
  // from today (or the URL date if it's earlier) through the URL date —
  // mirrors `DayDetailView`'s todo window. This is the same query the
  // day view already runs, so it's served warm from the cache.
  const todayStr = toDateString(new Date())
  const startDate =
    date && date < todayStr ? date : todayStr
  const endDate = date && date > todayStr ? date : todayStr

  const { data: todos = [], isLoading: todosLoading } = useTodos(
    currentHousehold?.id,
    startDate,
    endDate,
  )

  const existingTodo = todoId ? todos.find((t) => t.id === todoId) : undefined
  const showSkeleton = isLoading || (todoId !== undefined && todosLoading)

  return (
    <AnimatePresence mode="wait">
      {showSkeleton ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <TodoFormSkeleton />
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
          <TodoDetailView
            householdId={currentHousehold.id}
            date={date}
            existingTodo={existingTodo}
            onBack={() => navigate(`/calendar/${date}`)}
            onSaved={() => navigate(`/calendar/${date}`)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
