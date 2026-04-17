import { describe, it, expect } from 'vitest'
import { buildPrompt } from '../../lib/buildPrompt'

function makeHousehold(overrides: Record<string, unknown> = {}) {
  return {
    id: 'hh-1',
    name: 'Test House',
    default_adults: 2,
    default_children: 0,
    default_babies: 0,
    created_by: 'user-1',
    created_at: '2025-01-01',
    ...overrides,
  } as Parameters<typeof buildPrompt>[0]['household']
}

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ctx-1',
    household_id: 'hh-1',
    date: '2025-04-14',
    event_name: null,
    description: null,
    extra_adults: 0,
    extra_children: 0,
    extra_babies: 0,
    created_at: '2025-01-01',
    ...overrides,
  } as Parameters<typeof buildPrompt>[0]['contexts'][0]
}

describe('buildPrompt', () => {
  const baseArgs = {
    household: makeHousehold({ default_adults: 2, default_children: 1, default_babies: 1 }),
    date: '2025-04-14',
    contexts: [],
    dayTheme: null,
    complexity: 'easy' as const,
    includeTheme: true,
    suggestedIngredients: [],
  }

  it('includes the formatted date', () => {
    const result = buildPrompt(baseArgs)
    expect(result).toContain('Monday 14 April')
  })

  it('includes adults-only headcount', () => {
    const result = buildPrompt({
      ...baseArgs,
      household: makeHousehold({ default_adults: 3, default_children: 0, default_babies: 0 }),
    })
    expect(result).toContain('3 adults')
    // Headcount line should not mention children or babies
    const cookingLine = result.split('\n').find((l) => l.startsWith("I'm cooking for"))!
    expect(cookingLine).not.toContain('children')
    expect(cookingLine).not.toContain('bab')
  })

  it('includes children in headcount', () => {
    const result = buildPrompt({
      ...baseArgs,
      household: makeHousehold({ default_adults: 2, default_children: 2, default_babies: 0 }),
    })
    expect(result).toContain('2 adults')
    expect(result).toContain('2 children')
  })

  it('uses singular child for 1 in headcount', () => {
    const result = buildPrompt(baseArgs)
    expect(result).toContain('1 child,')
    expect(result).not.toMatch(/1 children/)
  })

  it('includes babies in headcount', () => {
    const result = buildPrompt(baseArgs)
    expect(result).toContain('1 weaning baby')
  })

  it('uses plural babies for 2+', () => {
    const result = buildPrompt({
      ...baseArgs,
      household: makeHousehold({ default_adults: 2, default_children: 0, default_babies: 2 }),
    })
    expect(result).toContain('2 weaning babies')
  })

  it('adds context extras to headcount', () => {
    const result = buildPrompt({
      ...baseArgs,
      household: makeHousehold({ default_adults: 2, default_children: 0, default_babies: 0 }),
      contexts: [makeContext({ extra_adults: 3, extra_children: 1 })],
    })
    expect(result).toContain('5 adults')
    expect(result).toContain('1 child')
  })

  it('includes event names', () => {
    const result = buildPrompt({
      ...baseArgs,
      contexts: [makeContext({ event_name: 'Birthday party' })],
    })
    expect(result).toContain('Birthday party')
  })

  it('includes easy complexity text', () => {
    const result = buildPrompt({ ...baseArgs, complexity: 'easy' })
    expect(result).toContain('under 30 minutes')
  })

  it('includes complicated complexity text', () => {
    const result = buildPrompt({ ...baseArgs, complexity: 'complicated' })
    expect(result).toContain('more involved')
    expect(result).toContain('over 30 minutes')
  })

  it('includes day theme when present and enabled', () => {
    const result = buildPrompt({
      ...baseArgs,
      dayTheme: 'Oily fish night',
      includeTheme: true,
    })
    expect(result).toContain('Oily fish night')
  })

  it('excludes day theme when disabled', () => {
    const result = buildPrompt({
      ...baseArgs,
      dayTheme: 'Oily fish night',
      includeTheme: false,
    })
    expect(result).not.toContain('Oily fish night')
  })

  it('excludes day theme when null', () => {
    const result = buildPrompt({
      ...baseArgs,
      dayTheme: null,
      includeTheme: true,
    })
    expect(result).not.toContain('theme for this day')
  })

  it('includes healthy eating guidance', () => {
    const result = buildPrompt(baseArgs)
    expect(result).toContain('healthy and whole-ingredient based')
    expect(result).toContain('appropriate for children')
  })

  it('includes baby guidance when babies present', () => {
    const result = buildPrompt(baseArgs)
    expect(result).toContain('weaning baby could have')
    expect(result).toContain('soft textures')
  })

  it('excludes baby guidance when no babies', () => {
    const result = buildPrompt({
      ...baseArgs,
      household: makeHousehold({ default_adults: 2, default_children: 1, default_babies: 0 }),
    })
    expect(result).not.toContain('weaning baby could have')
  })

  it('includes suggested ingredients as priority', () => {
    const result = buildPrompt({
      ...baseArgs,
      suggestedIngredients: ['Lentils', 'Sweet potato', 'Chickpeas'],
    })
    expect(result).toContain('Lentils')
    expect(result).toContain('Sweet potato')
    expect(result).toContain('Chickpeas')
    expect(result).toContain('include these ingredients as a priority')
    expect(result).toContain('any other whole ingredients can be used')
  })

  it('omits ingredient section when none suggested', () => {
    const result = buildPrompt({ ...baseArgs, suggestedIngredients: [] })
    expect(result).not.toContain('priority')
  })

  it('asks for 2-3 meal suggestions', () => {
    const result = buildPrompt(baseArgs)
    expect(result).toContain('2–3 meal ideas')
  })

  describe('ideas', () => {
    it('omits ideas when ideasMode is none', () => {
      const result = buildPrompt({
        ...baseArgs,
        ideas: [
          { title: 'Fajitas', thumbsUp: 2 },
          { title: 'Burgers', thumbsUp: 0 },
        ],
        ideasMode: 'none',
      })
      expect(result).not.toContain('Fajitas')
      expect(result).not.toContain('Burgers')
      expect(result).not.toContain('thumbed up')
      expect(result).toContain('2–3 meal ideas')
    })

    it('includes all idea titles when ideasMode is all', () => {
      const result = buildPrompt({
        ...baseArgs,
        ideas: [
          { title: 'Fajitas', thumbsUp: 0 },
          { title: 'Burgers', thumbsUp: 0 },
        ],
        ideasMode: 'all',
      })
      expect(result).toContain('suggested these meal ideas')
      expect(result).toContain('Fajitas')
      expect(result).toContain('Burgers')
    })

    it('includes only thumbed-up ideas when ideasMode is thumbed', () => {
      const result = buildPrompt({
        ...baseArgs,
        ideas: [
          { title: 'Fajitas', thumbsUp: 2 },
          { title: 'Burgers', thumbsUp: 0 },
        ],
        ideasMode: 'thumbed',
      })
      expect(result).toContain('thumbed up')
      expect(result).toContain('Fajitas')
      expect(result).not.toContain('Burgers')
    })

    it('asks for three recipes per idea when multiple ideas are thumbed up', () => {
      const result = buildPrompt({
        ...baseArgs,
        ideas: [
          { title: 'Fajitas', thumbsUp: 1 },
          { title: 'Pizza', thumbsUp: 2 },
        ],
        ideasMode: 'thumbed',
      })
      expect(result).toContain('three different recipes per idea')
      expect(result).not.toContain('2–3 meal ideas')
    })

    it('asks for recipes for the single thumbed-up idea', () => {
      const result = buildPrompt({
        ...baseArgs,
        ideas: [
          { title: 'Fajitas', thumbsUp: 1 },
          { title: 'Burgers', thumbsUp: 0 },
        ],
        ideasMode: 'thumbed',
      })
      expect(result).toContain('2–3 recipes for "Fajitas"')
      expect(result).not.toContain('three different recipes per idea')
    })

    it('defaults to the standard suggestion when ideasMode is thumbed but nothing thumbed', () => {
      const result = buildPrompt({
        ...baseArgs,
        ideas: [{ title: 'Fajitas', thumbsUp: 0 }],
        ideasMode: 'thumbed',
      })
      expect(result).not.toContain('thumbed up')
      expect(result).toContain('2–3 meal ideas')
    })
  })
})
