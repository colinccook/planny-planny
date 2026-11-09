// @ChatGPTPlugin #UnitTesting #Backend #ChatGptPlugin #McpDataVolume
import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  groupMealsByDish,
  pageMealsByDate,
  summariseIngredients,
  type HistoryIngredient,
  type HistoryMealRow,
} from './mealHistory'

const chicken: HistoryIngredient = { id: 'i-1', name: 'Chicken', starred: true, warning: false }
const pasta: HistoryIngredient = { id: 'i-2', name: 'Pasta', starred: false, warning: false }
const salt: HistoryIngredient = { id: 'i-3', name: 'Salt', starred: false, warning: true }
const lentils: HistoryIngredient = { id: 'i-4', name: 'Lentils', starred: true, warning: false }

function meal(
  title: string,
  date: string,
  ingredients: HistoryIngredient[] = [],
  outcome: HistoryMealRow['outcome_status'] = null,
): HistoryMealRow {
  return { id: `${title}-${date}`, title, date, ingredients, outcome_status: outcome }
}

describe('meal history grouped by dish', () => {
  it('lists the dish that has gone longest without being planned first', () => {
    const dishes = groupMealsByDish([
      meal('Curry', '2026-10-20'),
      meal('Fish pie', '2026-03-01'),
      meal('Pizza', '2026-09-01'),
    ], '2026-11-09')

    expect(dishes.map((dish) => dish.title)).toEqual(['Fish pie', 'Pizza', 'Curry'])
    expect(dishes[0].days_since_last_planned).toBe(253)
  })

  it('treats differently-cased and spaced titles as the same dish', () => {
    const dishes = groupMealsByDish([
      meal('spag  bol', '2026-01-05'),
      meal('Spag Bol', '2026-06-05'),
    ], '2026-11-09')

    expect(dishes).toHaveLength(1)
    expect(dishes[0]).toMatchObject({
      title: 'Spag Bol',
      times_planned: 2,
      first_planned: '2026-01-05',
      last_planned: '2026-06-05',
    })
  })

  it('counts how often a dish happened as planned or did not happen', () => {
    const [dish] = groupMealsByDish([
      meal('Curry', '2026-01-01', [], 'as_planned'),
      meal('Curry', '2026-02-01', [], 'did_not_happen'),
      meal('Curry', '2026-03-01', [], null),
    ], '2026-11-09')

    expect(dish).toMatchObject({
      times_planned: 3,
      times_as_planned: 1,
      times_did_not_happen: 1,
    })
  })

  it('merges the ingredients used across every time the dish was planned', () => {
    const [dish] = groupMealsByDish([
      meal('Curry', '2026-01-01', [chicken]),
      meal('Curry', '2026-02-01', [chicken, salt]),
    ], '2026-11-09')

    expect(dish.ingredients).toEqual(['Chicken', 'Salt'])
  })

  it('ignores blank titles', () => {
    expect(groupMealsByDish([meal('   ', '2026-01-01')], '2026-11-09')).toEqual([])
  })
})

describe('ingredient usage summary', () => {
  it('ranks ingredients by how many meals used them', () => {
    const stats = summariseIngredients([
      meal('Curry', '2026-01-01', [chicken, salt]),
      meal('Roast', '2026-02-01', [chicken]),
      meal('Carbonara', '2026-03-01', [pasta]),
    ], [chicken, pasta, salt])

    expect(stats.map((stat) => [stat.name, stat.meal_count])).toEqual([
      ['Chicken', 2],
      ['Pasta', 1],
      ['Salt', 1],
    ])
  })

  it('includes household ingredients that were never used with a zero count', () => {
    const stats = summariseIngredients([meal('Curry', '2026-01-01', [chicken])], [chicken, lentils])

    expect(stats.find((stat) => stat.name === 'Lentils')).toEqual({
      name: 'Lentils',
      starred: true,
      warning: false,
      meal_count: 0,
      last_used: null,
      example_meals: [],
    })
  })

  it('reports the most recent use and up to three distinct example meals', () => {
    const stats = summariseIngredients([
      meal('Curry', '2026-01-01', [chicken]),
      meal('Roast', '2026-04-01', [chicken]),
      meal('Curry', '2026-05-01', [chicken]),
      meal('Fajitas', '2026-02-01', [chicken]),
      meal('Soup', '2026-03-01', [chicken]),
    ], [])

    expect(stats[0].last_used).toBe('2026-05-01')
    expect(stats[0].example_meals).toEqual(['Curry', 'Roast', 'Soup'])
  })
})

describe('days between dates', () => {
  it('counts whole days ignoring time zones', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(daysBetween('2025-11-09', '2026-11-09')).toBe(365)
  })
})

describe('paging meals on date boundaries', () => {
  const row = (id: string, date: string) => ({ id, date })

  it('returns everything with no next page when the rows fit', () => {
    expect(pageMealsByDate([row('a', '2026-01-01'), row('b', '2026-01-02')], 2)).toEqual({
      page: [row('a', '2026-01-01'), row('b', '2026-01-02')],
      has_more: false,
      next_from: null,
    })
  })

  it('ends the page before a day that would be split across pages', () => {
    const rows = [row('a', '2026-01-01'), row('b', '2026-01-02'), row('c', '2026-01-02')]

    expect(pageMealsByDate(rows, 2)).toEqual({
      page: [row('a', '2026-01-01')],
      has_more: true,
      next_from: '2026-01-02',
    })
  })

  it('points the next page at the first unreturned day', () => {
    const rows = [row('a', '2026-01-01'), row('b', '2026-01-02'), row('c', '2026-01-03')]

    expect(pageMealsByDate(rows, 2)).toEqual({
      page: [row('a', '2026-01-01'), row('b', '2026-01-02')],
      has_more: true,
      next_from: '2026-01-03',
    })
  })

  it('returns a single busy day whole rather than looping forever', () => {
    const rows = [row('a', '2026-01-01'), row('b', '2026-01-01'), row('c', '2026-01-01')]

    expect(pageMealsByDate(rows, 2)).toEqual({
      page: [row('a', '2026-01-01'), row('b', '2026-01-01')],
      has_more: true,
      next_from: '2026-01-01',
    })
  })
})
