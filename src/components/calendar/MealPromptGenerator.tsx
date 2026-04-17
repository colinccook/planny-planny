import { useState, useMemo } from 'react'
import type { Database } from '../../types/database'
import { useIngredients, useIngredientUsageStats } from '../../hooks/useIngredients'
import { buildPrompt } from '../../lib/buildPrompt'
import { copyToClipboard } from '../../lib/clipboard'
import { useToast } from '../../hooks/useToast'
import type { Complexity, IdeasMode, PromptIdea } from '../../lib/buildPrompt'
import VerticalSelector from '../ui/VerticalSelector'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']

interface MealPromptGeneratorProps {
  household: Household
  date: string
  contexts: DayContext[]
  dayTheme: string | null
  ideas?: PromptIdea[]
}

export default function MealPromptGenerator({
  household,
  date,
  contexts,
  dayTheme,
  ideas = [],
}: MealPromptGeneratorProps) {
  const [complexity, setComplexity] = useState<Complexity>('easy')
  const [includeTheme, setIncludeTheme] = useState(true)
  const hasThumbed = useMemo(() => ideas.some((idea) => idea.thumbsUp > 0), [ideas])
  const defaultIdeasMode: IdeasMode = hasThumbed ? 'thumbed' : 'all'
  const [ideasModeOverride, setIdeasModeOverride] = useState<IdeasMode | null>(null)
  const ideasMode = ideasModeOverride ?? defaultIdeasMode
  const [promptOverride, setPromptOverride] = useState<string | null>(null)
  const { showToast } = useToast()

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
        ideas,
        ideasMode,
      }),
    [household, date, contexts, dayTheme, complexity, includeTheme, suggestedIngredients, ideas, ideasMode],
  )

  const displayPrompt = promptOverride ?? generatedPrompt

  const handleCopy = async () => {
    await copyToClipboard(displayPrompt)
    showToast('Copied prompt to clipboard')
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

  const handleIdeasModeChange = (mode: IdeasMode) => {
    setIdeasModeOverride(mode)
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
            className={`flex-1 rounded-l-lg px-3 py-3 text-sm font-medium transition-colors ${
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
            className={`flex-1 rounded-r-lg px-3 py-3 text-sm font-medium transition-colors ${
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
          className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          data-testid="theme-toggle"
        >
          <input
            type="checkbox"
            checked={includeTheme}
            onChange={handleThemeToggle}
            className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Include day theme: &ldquo;{dayTheme}&rdquo;</span>
        </label>
      )}

      {/* Ideas selector */}
      {ideas.length > 0 && (
        <VerticalSelector<IdeasMode>
          label="Include household ideas?"
          testId="ideas-mode-selector"
          value={ideasMode}
          onChange={handleIdeasModeChange}
          options={[
            { value: 'none', label: "Don\u2019t include ideas" },
            { value: 'all', label: 'Include all ideas' },
            {
              value: 'thumbed',
              label: 'Only include thumbed up ideas',
              disabled: !hasThumbed,
              description: !hasThumbed
                ? 'Thumbs up an idea to enable this option'
                : undefined,
            },
          ]}
        />
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
        className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        data-testid="copy-prompt-button"
      >
        📋 Copy prompt to clipboard
      </button>
    </div>
  )
}
