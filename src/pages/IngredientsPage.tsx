import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useHousehold } from '../hooks/useHousehold'
import { canEditMeals } from '../lib/permissions'
import AddIngredientForm from '../components/ingredients/AddIngredientForm'
import IngredientsList from '../components/ingredients/IngredientsList'
import type { SortOption } from '../components/ingredients/IngredientsList'
import { useIngredients } from '../hooks/useIngredients'
import { SkeletonBlock } from '../components/ui/Skeleton'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'alphabetical', label: 'A–Z' },
  { value: 'most-used', label: 'Most Used' },
  { value: 'least-recent', label: 'Least Recent' },
  { value: 'starred-first', label: 'Starred First' },
]

export default function IngredientsPage() {
  const { currentHousehold, currentRole, isLoading: householdLoading } = useHousehold()
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical')
  const { data: ingredients = [] } = useIngredients(currentHousehold?.id)

  const canEdit = canEditMeals(currentRole)

  return (
    <AnimatePresence mode="wait">
      {householdLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="p-4"
          data-testid="ingredients-skeleton"
        >
          <SkeletonBlock className="h-8 w-48" />
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </motion.div>
      ) : !currentHousehold ? (
        <div className="p-4">
          <p className="text-sm text-gray-500">Join or create a household to manage ingredients.</p>
        </div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-4 p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Ingredients</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort ingredients"
              className="min-h-[44px] rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {canEdit && (
            <AddIngredientForm
              householdId={currentHousehold.id}
              existingIngredients={ingredients}
            />
          )}

          <IngredientsList householdId={currentHousehold.id} sortBy={sortBy} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
