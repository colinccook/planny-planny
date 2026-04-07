import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import NumberStepper from './NumberStepper'

function renderStepper(props: Partial<Parameters<typeof NumberStepper>[0]> = {}) {
  const defaultProps = {
    id: 'test-stepper',
    label: 'Count',
    value: 3,
    min: 0,
    max: 99,
    onChange: vi.fn(),
    ...props,
  }
  render(createElement(NumberStepper, defaultProps))
  return defaultProps
}

describe('NumberStepper', () => {
  it('renders label, value, and buttons', () => {
    renderStepper({ value: 5 })
    expect(screen.getByText('Count')).toBeDefined()
    expect(screen.getByTestId('test-stepper-value').textContent).toBe('5')
    expect(screen.getByLabelText('Decrease Count')).toBeDefined()
    expect(screen.getByLabelText('Increase Count')).toBeDefined()
  })

  it('calls onChange with decremented value on minus click', () => {
    const props = renderStepper({ value: 5 })
    fireEvent.click(screen.getByLabelText('Decrease Count'))
    expect(props.onChange).toHaveBeenCalledWith(4)
  })

  it('calls onChange with incremented value on plus click', () => {
    const props = renderStepper({ value: 5 })
    fireEvent.click(screen.getByLabelText('Increase Count'))
    expect(props.onChange).toHaveBeenCalledWith(6)
  })

  it('disables decrement button when at min', () => {
    renderStepper({ value: 0, min: 0 })
    expect((screen.getByLabelText('Decrease Count') as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables increment button when at max', () => {
    renderStepper({ value: 99, max: 99 })
    expect((screen.getByLabelText('Increase Count') as HTMLButtonElement).disabled).toBe(true)
  })

  it('clamps displayed value to min when value is below min', () => {
    renderStepper({ value: -5, min: -2 })
    expect(screen.getByTestId('test-stepper-value').textContent).toBe('-2')
  })

  it('clamps displayed value to max when value exceeds max', () => {
    renderStepper({ value: 150, max: 99 })
    expect(screen.getByTestId('test-stepper-value').textContent).toBe('99')
  })

  it('does not call onChange when disabled', () => {
    const props = renderStepper({ value: 5, disabled: true })
    fireEvent.click(screen.getByLabelText('Decrease Count'))
    fireEvent.click(screen.getByLabelText('Increase Count'))
    expect(props.onChange).not.toHaveBeenCalled()
  })

  it('disables both buttons when disabled prop is true', () => {
    renderStepper({ value: 5, disabled: true })
    expect((screen.getByLabelText('Decrease Count') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('Increase Count') as HTMLButtonElement).disabled).toBe(true)
  })

  it('supports negative min values for event extras', () => {
    const props = renderStepper({ value: 0, min: -3, max: 99 })
    fireEvent.click(screen.getByLabelText('Decrease Count'))
    expect(props.onChange).toHaveBeenCalledWith(-1)
  })

  it('disables decrement at negative min', () => {
    renderStepper({ value: -3, min: -3 })
    expect((screen.getByLabelText('Decrease Count') as HTMLButtonElement).disabled).toBe(true)
  })

  it('has accessible aria-label on value display', () => {
    renderStepper({ value: 7, label: 'Default adults' })
    expect(screen.getByLabelText('Default adults: 7')).toBeDefined()
  })
})
