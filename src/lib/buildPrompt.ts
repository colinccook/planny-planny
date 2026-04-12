import type { Database } from '../types/database'

type Household = Database['public']['Tables']['households']['Row']
type DayContext = Database['public']['Tables']['day_contexts']['Row']

export type Complexity = 'easy' | 'complicated'

export interface BuildPromptArgs {
  household: Household
  date: string
  contexts: DayContext[]
  dayTheme: string | null
  complexity: Complexity
  includeTheme: boolean
  suggestedIngredients: string[]
}

export function buildPrompt({
  household,
  date,
  contexts,
  dayTheme,
  complexity,
  includeTheme,
  suggestedIngredients,
}: BuildPromptArgs): string {
  const [y, m, d] = date.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const dayLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(dateObj)

  // Calculate total headcount
  const extraAdults = contexts.reduce((sum, c) => sum + c.extra_adults, 0)
  const extraChildren = contexts.reduce((sum, c) => sum + c.extra_children, 0)
  const extraBabies = contexts.reduce((sum, c) => sum + c.extra_babies, 0)
  const totalAdults = household.default_adults + extraAdults
  const totalChildren = household.default_children + extraChildren
  const totalBabies = household.default_babies + extraBabies

  const lines: string[] = []

  lines.push(`I need a meal idea for ${dayLabel}.`)
  lines.push('')

  // Headcount
  const peopleParts: string[] = []
  if (totalAdults > 0) peopleParts.push(`${totalAdults} adult${totalAdults !== 1 ? 's' : ''}`)
  if (totalChildren > 0) peopleParts.push(`${totalChildren} child${totalChildren !== 1 ? 'ren' : ''}`)
  if (totalBabies > 0) peopleParts.push(`${totalBabies} weaning bab${totalBabies !== 1 ? 'ies' : 'y'}`)
  lines.push(`I'm cooking for ${peopleParts.join(', ')}.`)

  // Events
  const events = contexts.filter((c) => c.event_name)
  if (events.length > 0) {
    const eventNames = events.map((c) => c.event_name).join(', ')
    lines.push(`There's an event on this day: ${eventNames}.`)
  }

  // Day theme
  if (includeTheme && dayTheme) {
    lines.push(`The theme for this day is "${dayTheme}" — please take this into consideration.`)
  }

  lines.push('')

  // Complexity
  if (complexity === 'easy') {
    lines.push('I want something easy that takes under 30 minutes to prepare.')
  } else {
    lines.push('I have more time, so the recipe can be more involved (over 30 minutes is fine).')
  }

  lines.push('')

  // Health & dietary guidance
  lines.push('Please keep the meal healthy and whole-ingredient based. Prioritise flavour that is appropriate for children.')
  if (totalBabies > 0) {
    lines.push('Include guidance on what a weaning baby could have from this meal (soft textures, no added salt/sugar, age-appropriate portions).')
  }

  // Suggested ingredients
  if (suggestedIngredients.length > 0) {
    lines.push('')
    lines.push(`You can include these ingredients as a priority: ${suggestedIngredients.join(', ')}.`)
    lines.push('But any other whole ingredients can be used too, so long as they are appropriate for the household members at the time.')
  }

  lines.push('')
  lines.push('Please suggest 2–3 meal ideas with a brief description and key ingredients for each.')

  return lines.join('\n')
}
