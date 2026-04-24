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
    if (!labelledBy) throw new Error('Expected aria-labelledby attribute')
    expect(document.getElementById(labelledBy)?.textContent).toContain('Include household ideas?')
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

  it('renders a description under the label when provided', () => {
    const optionsWithDesc = [
      { value: 'all' as Mode, label: 'Include all ideas' },
      {
        value: 'thumbed' as Mode,
        label: 'Only include thumbed up ideas',
        disabled: true,
        description: 'Thumbs up an idea to enable this option',
      },
    ]
    render(
      createElement(VerticalSelector<Mode>, {
        options: optionsWithDesc,
        value: 'all',
        onChange: vi.fn(),
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    const disabledOption = screen.getByTestId('ideas-option-thumbed')
    expect(disabledOption.textContent).toContain('Only include thumbed up ideas')
    expect(disabledOption.textContent).toContain('Thumbs up an idea to enable this option')
  })

  it('renders an icon when provided', () => {
    const optionsWithIcon = [
      { value: 'all' as Mode, label: 'Include all ideas', icon: '💡' },
    ]
    render(
      createElement(VerticalSelector<Mode>, {
        options: optionsWithIcon,
        value: 'all',
        onChange: vi.fn(),
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    expect(screen.getByTestId('ideas-option-all').textContent).toContain('💡')
  })

  it('uses a roving tab index so only one option is tabbable', () => {
    render(
      createElement(VerticalSelector<Mode>, {
        options: OPTIONS,
        value: 'all',
        onChange: vi.fn(),
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    const tabIndexes = OPTIONS.map((o) =>
      screen.getByTestId(`ideas-option-${o.value}`).getAttribute('tabindex'),
    )
    expect(tabIndexes.filter((t) => t === '0')).toHaveLength(1)
    expect(screen.getByTestId('ideas-option-all').getAttribute('tabindex')).toBe('0')
  })

  it('falls back to the first enabled option as the tab stop when nothing is selected', () => {
    const optionsWithDisabled = [
      { value: 'none' as Mode, label: 'First', disabled: true },
      { value: 'all' as Mode, label: 'Second' },
      { value: 'thumbed' as Mode, label: 'Third' },
    ]
    render(
      createElement(VerticalSelector<Mode>, {
        options: optionsWithDisabled,
        // current value is a disabled option — no selected tab stop
        value: 'none',
        onChange: vi.fn(),
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    expect(screen.getByTestId('ideas-option-none').getAttribute('tabindex')).toBe('-1')
    expect(screen.getByTestId('ideas-option-all').getAttribute('tabindex')).toBe('0')
    expect(screen.getByTestId('ideas-option-thumbed').getAttribute('tabindex')).toBe('-1')
  })

  it('ArrowDown moves focus to the next enabled option and selects it', () => {
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
    const current = screen.getByTestId('ideas-option-all')
    current.focus()
    fireEvent.keyDown(current, { key: 'ArrowDown' })
    expect(onChange).toHaveBeenCalledWith('thumbed')
    expect(document.activeElement).toBe(screen.getByTestId('ideas-option-thumbed'))
  })

  it('ArrowUp wraps to the last enabled option', () => {
    const onChange = vi.fn()
    render(
      createElement(VerticalSelector<Mode>, {
        options: OPTIONS,
        value: 'none',
        onChange,
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    const current = screen.getByTestId('ideas-option-none')
    current.focus()
    fireEvent.keyDown(current, { key: 'ArrowUp' })
    expect(onChange).toHaveBeenCalledWith('thumbed')
  })

  it('ArrowDown skips disabled options', () => {
    const onChange = vi.fn()
    const optionsWithDisabled = [
      { value: 'none' as Mode, label: 'First' },
      { value: 'all' as Mode, label: 'Second', disabled: true },
      { value: 'thumbed' as Mode, label: 'Third' },
    ]
    render(
      createElement(VerticalSelector<Mode>, {
        options: optionsWithDisabled,
        value: 'none',
        onChange,
        testId: 'ideas',
        ariaLabel: 'Ideas mode',
      }),
    )
    const current = screen.getByTestId('ideas-option-none')
    current.focus()
    fireEvent.keyDown(current, { key: 'ArrowDown' })
    expect(onChange).toHaveBeenCalledWith('thumbed')
  })

  it('Home and End move to first and last enabled options', () => {
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
    const current = screen.getByTestId('ideas-option-all')
    current.focus()
    fireEvent.keyDown(current, { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('thumbed')
    fireEvent.keyDown(screen.getByTestId('ideas-option-thumbed'), { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('none')
  })

  it('Space on a focused unselected option selects it', () => {
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
    // Tab would land on the selected one; simulate user arrowing then pressing space.
    const current = screen.getByTestId('ideas-option-none')
    current.focus()
    fireEvent.keyDown(current, { key: ' ' })
    expect(onChange).toHaveBeenCalledWith('none')
  })
})
