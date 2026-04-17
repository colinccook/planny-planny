import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import VerticalSelector from './VerticalSelector'

type Mode = 'none' | 'all' | 'thumbed'

const OPTIONS = [
  { value: 'none' as Mode, label: "Don't include ideas" },
  { value: 'all' as Mode, label: 'Include all ideas' },
  { value: 'thumbed' as Mode, label: 'Only include thumbed up ideas' },
]

describe('VerticalSelector', () => {
  afterEach(() => cleanup())

  it('renders all options with correct aria-checked state', () => {
    render(
      createElement(VerticalSelector<Mode>, {
        label: 'Include household ideas?',
        options: OPTIONS,
        value: 'all',
        onChange: vi.fn(),
        testId: 'ideas',
      }),
    )
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(screen.getByTestId('ideas-option-none').getAttribute('aria-checked')).toBe('false')
    expect(screen.getByTestId('ideas-option-all').getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('ideas-option-thumbed').getAttribute('aria-checked')).toBe('false')
  })

  it('calls onChange with the clicked option value', () => {
    const onChange = vi.fn()
    render(
      createElement(VerticalSelector<Mode>, {
        label: 'Include household ideas?',
        options: OPTIONS,
        value: 'all',
        onChange,
        testId: 'ideas',
      }),
    )
    fireEvent.click(screen.getByTestId('ideas-option-none'))
    expect(onChange).toHaveBeenCalledWith('none')
  })

  it('does not call onChange when the already-selected option is clicked', () => {
    const onChange = vi.fn()
    render(
      createElement(VerticalSelector<Mode>, {
        options: OPTIONS,
        value: 'all',
        onChange,
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    fireEvent.click(screen.getByTestId('ideas-option-all'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not call onChange when a disabled option is clicked', () => {
    const onChange = vi.fn()
    const optionsWithDisabled = [
      ...OPTIONS.slice(0, 2),
      { ...OPTIONS[2], disabled: true },
    ]
    render(
      createElement(VerticalSelector<Mode>, {
        options: optionsWithDisabled,
        value: 'all',
        onChange,
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    const disabledOption = screen.getByTestId('ideas-option-thumbed')
    expect(disabledOption.getAttribute('aria-disabled')).toBe('true')
    expect((disabledOption as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(disabledOption)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('exposes the radiogroup with the label linkage', () => {
    render(
      createElement(VerticalSelector<Mode>, {
        label: 'Include household ideas?',
        options: OPTIONS,
        value: 'all',
        onChange: vi.fn(),
        testId: 'ideas',
      }),
    )
    const group = screen.getByRole('radiogroup')
    const labelledBy = group.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy!)?.textContent).toContain('Include household ideas?')
  })

  it('falls back to aria-label when no visible label is provided', () => {
    render(
      createElement(VerticalSelector<Mode>, {
        options: OPTIONS,
        value: 'all',
        onChange: vi.fn(),
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    const group = screen.getByRole('radiogroup')
    expect(group.getAttribute('aria-label')).toBe('Ideas mode')
  })

  it('each option is rendered as a tap target at least 48px tall', () => {
    render(
      createElement(VerticalSelector<Mode>, {
        options: OPTIONS,
        value: 'all',
        onChange: vi.fn(),
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    const btn = screen.getByTestId('ideas-option-none')
    expect(btn.className).toContain('min-h-[48px]')
  })
})
