import { useState, useMemo } from 'react'
import type { Database } from '../../types/database'
import { useIngredients, useIngredientUsageStats } from '../../hooks/useIngredients'
import { buildPrompt } from '../../lib/buildPrompt'
import type { Complexity } from '../../lib/buildPrompt'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']

interface MealPromptGeneratorProps {
  household: Household
  date: string
  contexts: DayContext[]
  dayTheme: string | null
}

export default function MealPromptGenerator({
  household,
  date,
  contexts,
  dayTheme,
}: MealPromptGeneratorProps) {
  const [complexity, setComplexity] = useState<Complexity>('easy')
  const [includeTheme, setIncludeTheme] = useState(true)
  const [copied, setCopied] = useState(false)
  const [promptOverride, setPromptOverride] = useState<string | null>(null)

  const { data: allIngredients = [] } = useIngredients(household.id)
  const { data: usageStats = [] } = useIngredientUsageStats(household.id)

  const suggestedIngredients = useMemo(() => {
    const statsMap = new Map<string, number>()
    for (const stat of usageStats) {
      statsMap.set(stat.ingredient_id, stat.usage_count)
    }
    return allIngredients
      .filter((i) => !i.warning)
      .sort((a, b) => {
        const aCount = statsMap.get(a.id) ?? 0
        const bCount = statsMap.get(b.id) ?? 0
        return aCount - bCount
      })
      .slice(0, 8)
      .map((i) => i.name)
  }, [allIngredients, usageStats])

  const generatedPrompt = useMemo(
    () =>
      buildPrompt({
        household,
        date,
        contexts,
        dayTheme,
        complexity,
        includeTheme,
        suggestedIngredients,
      }),
    [household, date, contexts, dayTheme, complexity, includeTheme, suggestedIngredients],
  )

  const displayPrompt = promptOverride ?? generatedPrompt

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayPrompt)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = displayPrompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Reset override when inputs change
  const handleComplexityChange = (c: Complexity) => {
    setComplexity(c)
    setPromptOverride(null)
  }

  const handleThemeToggle = () => {
    setIncludeTheme((prev) => !prev)
    setPromptOverride(null)
  }

  return (
    <div className="space-y-4" data-testid="meal-prompt-generator">
      <p className="text-sm text-gray-500">
        This creates a prompt you can paste into ChatGPT or another AI assistant to get
        meal suggestions tailored to your household.
      </p>

      {/* Complexity toggle */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
          How much time do you have?
        </label>
        <div className="flex rounded-lg border border-gray-200" data-testid="complexity-toggle">
          <button
            type="button"
            onClick={() => handleComplexityChange('easy')}
            className={`flex-1 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
              complexity === 'easy'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            data-testid="complexity-easy"
          >
            ⚡ Easy (under 30 min)
          </button>
          <button
            type="button"
            onClick={() => handleComplexityChange('complicated')}
            className={`flex-1 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors ${
              complexity === 'complicated'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            data-testid="complexity-complicated"
          >
            👨‍🍳 Involved (30+ min)
          </button>
        </div>
      </div>

      {/* Day theme checkbox */}
      {dayTheme && (
        <label
          className="flex items-center gap-2 text-sm text-gray-700"
          data-testid="theme-toggle"
        >
          <input
            type="checkbox"
            checked={includeTheme}
            onChange={handleThemeToggle}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Include day theme: &ldquo;{dayTheme}&rdquo;
        </label>
      )}

      {/* Editable prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
          Your AI prompt
        </label>
        <textarea
          value={displayPrompt}
          onChange={(e) => setPromptOverride(e.target.value)}
          className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          rows={10}
          data-testid="prompt-textarea"
        />
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className={`w-full rounded-lg py-3 text-sm font-semibold transition-colors ${
          copied
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
        data-testid="copy-prompt-button"
      >
        {copied ? '✓ Copied to clipboard!' : '📋 Copy prompt to clipboard'}
      </button>
    </div>
  )
}
