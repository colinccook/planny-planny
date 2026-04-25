import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { useCupboardIngredients } from '../hooks/useCupboardIngredients'
import { useStoreCupboard } from '../hooks/useStoreCupboard'
import { copyToClipboard } from '../lib/clipboard'
import { useToast } from '../hooks/useToast'
import CupboardHeader from '../components/store-cupboard/CupboardHeader'
import CupboardList from '../components/store-cupboard/CupboardList'

export default function StoreCupboardPage() {
  const { user } = useAuth()
  const { currentHousehold, isLoading: householdLoading } = useHousehold()
  const { ingredients, isLoading: ingredientsLoading } = useCupboardIngredients(
    currentHousehold?.id
  )
  const { dismissedIds, dismiss, undismiss, resetAll } = useStoreCupboard(user?.id)

  const [showHidden, setShowHidden] = useState(false)
  const { showToast } = useToast()

  const visibleIngredients = ingredients.filter(
    (ing) => showHidden || !dismissedIds.includes(ing.id)
  )

  const handleShare = useCallback(async () => {
    const lines = visibleIngredients
      .filter((ing) => !dismissedIds.includes(ing.id))
      .map((ing) => `• ${ing.name}`)

    const text = lines.length > 0
      ? `🛒 Shopping List\n${lines.join('\n')}`
      : 'Shopping list is empty!'

    await copyToClipboard(text)
    showToast('Copied shopping list to clipboard')
  }, [visibleIngredients, dismissedIds, showToast])

  const isLoading = householdLoading || ingredientsLoading

  const dismissedCount = ingredients.filter((ing) =>
    dismissedIds.includes(ing.id)
  ).length
  const activeCount = ingredients.length - dismissedCount

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="p-4"
        >
          <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </motion.div>
      ) : !currentHousehold ? (
        <div className="p-4">
          <p className="text-sm text-gray-500">
            Join or create a household to see your store cupboard.
          </p>
        </div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-4 p-4"
        >
          <CupboardHeader
            visibleCount={showHidden ? ingredients.length : activeCount}
            totalCount={ingredients.length}
            showHidden={showHidden}
            onToggleShowHidden={() => setShowHidden(!showHidden)}
            onResetAll={resetAll}
            onShare={handleShare}
          />

          <CupboardList
            ingredients={ingredients}
            dismissedIds={dismissedIds}
            showHidden={showHidden}
            onDismiss={dismiss}
            onUndismiss={undismiss}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
