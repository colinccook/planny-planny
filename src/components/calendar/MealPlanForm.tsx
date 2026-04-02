import { useState, useMemo, useRef, type FormEvent } from 'react'
import { useCreateMealPlan, useUpdateMealPlan, useSetMealIngredients } from '../../hooks/useMealPlans'
import type { MealPlanWithIngredients } from '../../hooks/useMealPlans'
import { useIngredients, useCreateIngredient } from '../../hooks/useIngredients'
import IngredientTag from '../ingredients/IngredientTag'
import IngredientSuggestions from '../ingredients/IngredientSuggestions'
import type { Database } from '../../types/database'

type Ingredient = Database['public']['Tables']['ingredients']['Row']

interface MealPlanFormProps {
  householdId: string
  date: string
  existingMeal?: MealPlanWithIngredients
  onClose: () => void
}

export default function MealPlanForm({
  householdId,
  date,
  existingMeal,
  onClose,
}: MealPlanFormProps) {
  const [title, setTitle] = useState(existingMeal?.title ?? '')
  const [description, setDescription] = useState(existingMeal?.description ?? '')
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>(() => {
    if (!existingMeal) return []
    return existingMeal.meal_plan_ingredients
      .map((mpi) => mpi.ingredients)
      .filter(Boolean)
  })
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const createMeal = useCreateMealPlan()
  const updateMeal = useUpdateMealPlan()
  const setMealIngredients = useSetMealIngredients()
  const createIngredient = useCreateIngredient()
  const { data: allIngredients = [] } = useIngredients(householdId)

  const isPending =
    createMeal.isPending || updateMeal.isPending || setMealIngredients.isPending

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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
    onClose()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-emerald-200 bg-white p-3 shadow-sm"
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="meal-title" className="sr-only">
            Meal title
          </label>
          <input
            id="meal-title"
            type="text"
            placeholder="What's for dinner?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            autoFocus
            required
          />
        </div>

        <div>
          <label htmlFor="meal-description" className="sr-only">
            Description
          </label>
          <textarea
            id="meal-description"
            placeholder="Optional notes…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="ingredient-search"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Ingredients
          </label>

          {selectedIngredients.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1" data-testid="selected-ingredients">
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

          <div className="relative">
            <input
              ref={searchRef}
              id="ingredient-search"
              type="text"
              placeholder="Search or add ingredients…"
              value={ingredientSearch}
              onChange={(e) => {
                setIngredientSearch(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => {
                setTimeout(() => setShowDropdown(false), 200)
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />

            {showDropdown && ingredientSearch.trim() && (
              <div
                className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
                data-testid="ingredient-dropdown"
              >
                {filteredIngredients.slice(0, 8).map((ingredient) => (
                  <button
                    key={ingredient.id}
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-emerald-50"
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
                    className="w-full px-3 py-1.5 text-left text-sm text-emerald-600 hover:bg-emerald-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCreateAndAdd}
                  >
                    + Create &ldquo;{ingredientSearch.trim()}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-2">
            <IngredientSuggestions
              householdId={householdId}
              onAddIngredient={addIngredient}
              excludeIds={Array.from(selectedIds)}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : existingMeal ? 'Update' : 'Add meal'}
        </button>
      </div>
    </form>
  )
}
