import { useState, useMemo, useRef } from 'react'
import FullScreenView from '../ui/FullScreenView'
import Tray from '../ui/Tray'
import IngredientTag from '../ingredients/IngredientTag'
import {
  useCreateMealPlan,
  useUpdateMealPlan,
  useSetMealIngredients,
} from '../../hooks/useMealPlans'
import type { MealPlanWithIngredients } from '../../hooks/useMealPlans'
import {
  useIngredients,
  useCreateIngredient,
  useIngredientUsageStats,
} from '../../hooks/useIngredients'
import type { Database } from '../../types/database'

type Ingredient = Database['public']['Tables']['ingredients']['Row']

interface AddMealViewProps {
  householdId: string
  date: string
  existingMeal?: MealPlanWithIngredients
  onBack: () => void
  onSaved: () => void
}

export default function AddMealView({
  householdId,
  date,
  existingMeal,
  onBack,
  onSaved,
}: AddMealViewProps) {
  const [title, setTitle] = useState(existingMeal?.title ?? '')
  const [description, setDescription] = useState(
    existingMeal?.description ?? '',
  )
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>(
    () => {
      if (!existingMeal) return []
      return existingMeal.meal_plan_ingredients
        .map((mpi) => mpi.ingredients)
        .filter(Boolean)
    },
  )

  const [showTitleTray, setShowTitleTray] = useState(false)
  const [showNotesTray, setShowNotesTray] = useState(false)
  const [showIngredientsTray, setShowIngredientsTray] = useState(false)

  const [ingredientSearch, setIngredientSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const createMeal = useCreateMealPlan()
  const updateMeal = useUpdateMealPlan()
  const setMealIngredients = useSetMealIngredients()
  const createIngredient = useCreateIngredient()
  const { data: allIngredients = [] } = useIngredients(householdId)
  const { data: usageStats = [] } = useIngredientUsageStats(householdId)

  const isPending =
    createMeal.isPending ||
    updateMeal.isPending ||
    setMealIngredients.isPending

  const selectedIds = useMemo(
    () => new Set(selectedIngredients.map((i) => i.id)),
    [selectedIngredients],
  )

  const filteredIngredients = useMemo(() => {
    const search = ingredientSearch.trim().toLowerCase()
    if (!search) return []
    return allIngredients.filter(
      (i) => !selectedIds.has(i.id) && i.name.toLowerCase().includes(search),
    )
  }, [allIngredients, ingredientSearch, selectedIds])

  const exactMatch = useMemo(() => {
    const search = ingredientSearch.trim().toLowerCase()
    if (!search) return undefined
    return allIngredients.find((i) => i.name.toLowerCase() === search)
  }, [allIngredients, ingredientSearch])

  const leastCommonIngredients = useMemo(() => {
    const statsMap = new Map<string, number>()
    for (const stat of usageStats) {
      statsMap.set(stat.ingredient_id, stat.usage_count)
    }
    return allIngredients
      .filter((i) => !i.warning && !selectedIds.has(i.id))
      .sort((a, b) => {
        const aCount = statsMap.get(a.id) ?? 0
        const bCount = statsMap.get(b.id) ?? 0
        return aCount - bCount
      })
      .slice(0, 12)
  }, [allIngredients, usageStats, selectedIds])

  const addIngredient = (ingredient: Ingredient) => {
    if (!selectedIds.has(ingredient.id)) {
      setSelectedIngredients((prev) => [...prev, ingredient])
    }
    setIngredientSearch('')
    setShowDropdown(false)
    searchRef.current?.focus()
  }

  const removeIngredient = (id: string) => {
    setSelectedIngredients((prev) => prev.filter((i) => i.id !== id))
  }

  const handleCreateAndAdd = async () => {
    const name = ingredientSearch.trim()
    if (!name) return
    const newIngredient = await createIngredient.mutateAsync({
      household_id: householdId,
      name,
    })
    addIngredient(newIngredient)
  }

  const handleSearchKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const search = ingredientSearch.trim()
      if (!search) return

      if (exactMatch && !selectedIds.has(exactMatch.id)) {
        addIngredient(exactMatch)
      } else if (filteredIngredients.length === 1) {
        addIngredient(filteredIngredients[0])
      } else if (!exactMatch) {
        await handleCreateAndAdd()
      }
    }
  }

  const handleSave = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const ingredientIds = selectedIngredients.map((i) => i.id)

    if (existingMeal) {
      await updateMeal.mutateAsync({
        id: existingMeal.id,
        householdId,
        title: trimmedTitle,
        description: description.trim() || null,
      })
      await setMealIngredients.mutateAsync({
        mealPlanId: existingMeal.id,
        householdId,
        ingredientIds,
      })
    } else {
      const newMeal = await createMeal.mutateAsync({
        household_id: householdId,
        date,
        title: trimmedTitle,
        description: description.trim() || null,
      })
      if (ingredientIds.length > 0) {
        await setMealIngredients.mutateAsync({
          mealPlanId: newMeal.id,
          householdId,
          ingredientIds,
        })
      }
    }
    onSaved()
  }

  return (
    <FullScreenView
      title={existingMeal ? 'Edit Meal' : 'Add Meal'}
      onBack={onBack}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1 space-y-3">
          {/* Title field */}
          <button
            type="button"
            onClick={() => setShowTitleTray(true)}
            className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
            data-testid="title-field"
          >
            <p className="text-xs font-medium text-gray-500">Meal name</p>
            <p
              className={`mt-1 text-base ${title ? 'font-semibold text-gray-900' : 'text-gray-400'}`}
            >
              {title || "What's for dinner?"}
            </p>
          </button>

          {/* Notes field */}
          <button
            type="button"
            onClick={() => setShowNotesTray(true)}
            className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
            data-testid="notes-field"
          >
            <p className="text-xs font-medium text-gray-500">Notes</p>
            <p
              className={`mt-1 text-sm ${description ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {description || 'Optional notes'}
            </p>
          </button>

          {/* Ingredients field */}
          <button
            type="button"
            onClick={() => setShowIngredientsTray(true)}
            className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
            data-testid="ingredients-field"
          >
            <p className="text-xs font-medium text-gray-500">Ingredients</p>
            {selectedIngredients.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedIngredients.map((ingredient) => (
                  <IngredientTag
                    key={ingredient.id}
                    name={ingredient.name}
                    starred={ingredient.starred}
                    warning={ingredient.warning}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400">
                Tap to add ingredients
              </p>
            )}
          </button>
        </div>

        {/* Save button */}
        <div className="mt-6 pb-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !title.trim()}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            data-testid="save-meal-button"
          >
            {isPending
              ? 'Saving…'
              : existingMeal
                ? 'Update Meal'
                : 'Save Meal'}
          </button>
        </div>
      </div>

      {/* Title Tray */}
      <Tray
        isOpen={showTitleTray}
        onClose={() => setShowTitleTray(false)}
        title="What's for dinner?"
        description="Give your meal a name"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chicken curry"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          autoFocus
          data-testid="meal-title-input"
        />
      </Tray>

      {/* Notes Tray */}
      <Tray
        isOpen={showNotesTray}
        onClose={() => setShowNotesTray(false)}
        title="Optional notes"
        description="Add any extra details about this meal"
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Use the leftover chicken from yesterday"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          autoFocus
          data-testid="meal-notes-input"
        />
      </Tray>

      {/* Ingredients Tray */}
      <Tray
        isOpen={showIngredientsTray}
        onClose={() => setShowIngredientsTray(false)}
        title="Ingredients"
        description="Search and add ingredients for this meal"
      >
        <div className="space-y-4">
          {/* Selected ingredients */}
          {selectedIngredients.length > 0 && (
            <div
              className="flex flex-wrap gap-1"
              data-testid="selected-ingredients"
            >
              {selectedIngredients.map((ingredient) => (
                <IngredientTag
                  key={ingredient.id}
                  name={ingredient.name}
                  starred={ingredient.starred}
                  warning={ingredient.warning}
                  variant="removable"
                  onRemove={() => removeIngredient(ingredient.id)}
                />
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search or add ingredients…"
              value={ingredientSearch}
              onChange={(e) => {
                setIngredientSearch(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              data-testid="ingredient-search-input"
            />

            {showDropdown && ingredientSearch.trim() && (
              <div
                className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                data-testid="ingredient-dropdown"
              >
                {filteredIngredients.slice(0, 8).map((ingredient) => (
                  <button
                    key={ingredient.id}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addIngredient(ingredient)}
                  >
                    {ingredient.name}
                    {ingredient.starred && ' ⭐'}
                    {ingredient.warning && ' ⚠️'}
                  </button>
                ))}
                {!exactMatch && ingredientSearch.trim() && (
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCreateAndAdd}
                  >
                    + Create &ldquo;{ingredientSearch.trim()}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Least common ingredients suggestions */}
          {leastCommonIngredients.length > 0 && (
            <div data-testid="ingredient-ideas">
              <h4 className="mb-2 text-xs font-semibold text-gray-600">
                💡 Ideas — ingredients you rarely use
              </h4>
              <div className="flex flex-wrap gap-2">
                {leastCommonIngredients.map((ingredient) => (
                  <IngredientTag
                    key={ingredient.id}
                    name={ingredient.name}
                    starred={ingredient.starred}
                    variant="addable"
                    onAdd={() => addIngredient(ingredient)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add Ingredients button */}
          <button
            type="button"
            onClick={() => setShowIngredientsTray(false)}
            className="w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            data-testid="add-ingredients-button"
          >
            Add Ingredients
          </button>
        </div>
      </Tray>
    </FullScreenView>
  )
}
