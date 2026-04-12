import { useState, useCallback } from 'react'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { useCupboardIngredients } from '../hooks/useCupboardIngredients'
import { useStoreCupboard } from '../hooks/useStoreCupboard'
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

    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }, [visibleIngredients, dismissedIds])

  if (householdLoading || ingredientsLoading) {
    return (
      <div className="p-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (!currentHousehold) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">
          Join or create a household to see your store cupboard.
        </p>
      </div>
    )
  }

  const dismissedCount = ingredients.filter((ing) =>
    dismissedIds.includes(ing.id)
  ).length
  const activeCount = ingredients.length - dismissedCount

  return (
    <div className="space-y-4 p-4">
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
    </div>
  )
}
