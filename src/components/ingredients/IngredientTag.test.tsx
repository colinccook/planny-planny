import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import IngredientTag from './IngredientTag'

describe('IngredientTag', () => {
  it('renders ingredient name', () => {
    render(createElement(IngredientTag, { name: 'Chicken' }))
    expect(screen.getByText('Chicken')).toBeDefined()
  })

  it('applies emerald styles by default', () => {
    render(createElement(IngredientTag, { name: 'Tomato' }))
    const tag = screen.getByText('Tomato').parentElement!
    expect(tag.className).toContain('bg-emerald-100')
    expect(tag.className).toContain('text-emerald-800')
  })

  it('applies orange styles when warning is set', () => {
    render(createElement(IngredientTag, { name: 'Peanuts', warning: true }))
    const tag = screen.getByText('Peanuts').parentElement!
    expect(tag.className).toContain('bg-orange-100')
    expect(tag.className).toContain('text-orange-800')
  })

  it('shows star icon when starred', () => {
    render(createElement(IngredientTag, { name: 'Salmon', starred: true }))
    expect(screen.getByLabelText('starred')).toBeDefined()
  })

  it('does not show star icon when not starred', () => {
    render(createElement(IngredientTag, { name: 'Salmon' }))
    expect(screen.queryByLabelText('starred')).toBeNull()
  })

  it('shows warning icon when warning is set', () => {
    render(createElement(IngredientTag, { name: 'Nuts', warning: true }))
    expect(screen.getByLabelText('warning')).toBeDefined()
  })

  it('shows remove button for removable variant', () => {
    const onRemove = () => {}
    render(createElement(IngredientTag, { name: 'Rice', variant: 'removable', onRemove }))
    expect(screen.getByLabelText('Remove Rice')).toBeDefined()
  })

  it('shows add button for addable variant', () => {
    const onAdd = () => {}
    render(createElement(IngredientTag, { name: 'Pasta', variant: 'addable', onAdd }))
    expect(screen.getByLabelText('Add Pasta')).toBeDefined()
  })

  it('does not show action buttons for default variant', () => {
    render(createElement(IngredientTag, { name: 'Bread' }))
    expect(screen.queryByLabelText('Remove Bread')).toBeNull()
    expect(screen.queryByLabelText('Add Bread')).toBeNull()
  })
})
