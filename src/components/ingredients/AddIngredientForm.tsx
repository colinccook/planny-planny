import { useState, useRef, useEffect } from 'react'
import { useCreateIngredient } from '../../hooks/useIngredients'
import type { Database } from '../../types/database'

type Ingredient = Database['public']['Tables']['ingredients']['Row']

interface AddIngredientFormProps {
  householdId: string
  existingIngredients: Ingredient[]
}

export default function AddIngredientForm({
  householdId,
  existingIngredients,
}: AddIngredientFormProps) {
  const [name, setName] = useState('')
  const [starred, setStarred] = useState(false)
  const [warning, setWarning] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const createIngredient = useCreateIngredient()

  const trimmedName = name.trim()
  const duplicateExists = existingIngredients.some(
    (i) => i.name.toLowerCase() === trimmedName.toLowerCase()
  )

  const autocompleteSuggestions = trimmedName.length > 0
    ? existingIngredients
        .filter((i) => i.name.toLowerCase().includes(trimmedName.toLowerCase()))
        .slice(0, 5)
    : []

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmedName || duplicateExists) return

    createIngredient.mutate(
      { household_id: householdId, name: trimmedName, starred, warning },
      {
        onSuccess: () => {
          setName('')
          setStarred(false)
          setWarning(false)
          inputRef.current?.focus()
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white p-4 shadow">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <label htmlFor="ingredient-name" className="mb-1 block text-sm font-medium text-gray-700">
            Add ingredient
          </label>
          <input
            ref={inputRef}
            id="ingredient-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="e.g., Chicken breast"
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
          {duplicateExists && (
            <p className="mt-1 text-xs text-orange-600">
              This ingredient already exists
            </p>
          )}

          {showSuggestions && autocompleteSuggestions.length > 0 && !duplicateExists && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg"
              role="listbox"
            >
              {autocompleteSuggestions.map((ingredient) => (
                <button
                  key={ingredient.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50"
                  onClick={() => {
                    setName(ingredient.name)
                    setShowSuggestions(false)
                  }}
                >
                  {ingredient.name}
                  {ingredient.starred && ' ⭐'}
                  {ingredient.warning && ' ⚠️'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={starred}
              onChange={(e) => setStarred(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            ⭐ Star
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={warning}
              onChange={(e) => setWarning(e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            ⚠️ Warning
          </label>
          <button
            type="submit"
            disabled={!trimmedName || duplicateExists || createIngredient.isPending}
            className="ml-auto rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {createIngredient.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>

        {createIngredient.isError && (
          <p className="text-sm text-red-600">
            {createIngredient.error instanceof Error
              ? createIngredient.error.message
              : 'Failed to add ingredient'}
          </p>
        )}
      </div>
    </form>
  )
}
