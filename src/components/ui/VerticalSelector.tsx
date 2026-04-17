import { useCallback, useId, useRef } from 'react'

export interface VerticalSelectorOption<T extends string> {
  value: T
  label: string
  description?: string
  icon?: string
  disabled?: boolean
}

type AccessibleNameProps =
  | {
      /** Visible label rendered above the radiogroup. */
      label: string
      ariaLabel?: string
    }
  | {
      label?: undefined
      /** Accessible label applied to the radiogroup when no visible label is shown. */
      ariaLabel: string
    }

type VerticalSelectorProps<T extends string> = AccessibleNameProps & {
  options: VerticalSelectorOption<T>[]
  value: T
  onChange: (value: T) => void
  /**
   * Optional id used to scope `data-testid` attributes on options.
   * Each option row gets `data-testid={`${testId}-option-${value}`}`.
   */
  testId?: string
}

/**
 * A mobile-first vertical list selector. Options stack top-to-bottom and
 * each row is a large tap target (min height 48px), making it easier to
 * use on touch devices than a native `<select>` dropdown.
 *
 * Rendered as a WAI-ARIA radiogroup: only the currently selected option
 * (or the first enabled option if none is selected) is in the tab order,
 * and Arrow / Home / End / Space / Enter keys work as expected.
 *
 * An accessible name is required — provide either a visible `label`
 * or an `ariaLabel`.
 */
export default function VerticalSelector<T extends string>({
  label,
  ariaLabel,
  options,
  value,
  onChange,
  testId,
}: VerticalSelectorProps<T>) {
  const reactId = useId()
  const groupId = testId ?? `vertical-selector-${reactId}`
  const labelId = label ? `${groupId}-label` : undefined

  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const enabledOptions = options.filter((o) => !o.disabled)
  const firstEnabledValue = enabledOptions[0]?.value
  const selectedIsEnabled = enabledOptions.some((o) => o.value === value)
  // The single option in the tab order (roving tabindex).
  const tabStopValue: T | undefined = selectedIsEnabled ? value : firstEnabledValue

  const focusAndSelect = useCallback(
    (target: T) => {
      const btn = buttonRefs.current[target]
      btn?.focus()
      if (target !== value) onChange(target)
    },
    [onChange, value],
  )

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    optValue: T,
  ) => {
    if (enabledOptions.length === 0) return
    const currentIdx = enabledOptions.findIndex((o) => o.value === optValue)
    const startIdx = currentIdx === -1 ? 0 : currentIdx

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        e.preventDefault()
        const next = enabledOptions[(startIdx + 1) % enabledOptions.length].value
        focusAndSelect(next)
        return
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        e.preventDefault()
        const prev =
          enabledOptions[(startIdx - 1 + enabledOptions.length) % enabledOptions.length].value
        focusAndSelect(prev)
        return
      }
      case 'Home': {
        e.preventDefault()
        focusAndSelect(enabledOptions[0].value)
        return
      }
      case 'End': {
        e.preventDefault()
        focusAndSelect(enabledOptions[enabledOptions.length - 1].value)
        return
      }
      case ' ':
      case 'Enter': {
        e.preventDefault()
        if (optValue !== value) onChange(optValue)
        return
      }
    }
  }

  return (
    <div data-testid={testId}>
      {label && (
        <div
          id={labelId}
          className="mb-1.5 block text-xs font-semibold text-gray-600"
        >
          {label}
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={!label ? ariaLabel : undefined}
        aria-labelledby={labelId}
        className="flex flex-col gap-2"
      >
        {options.map((opt) => {
          const isSelected = opt.value === value
          const isDisabled = !!opt.disabled
          const optionTestId = testId ? `${testId}-option-${opt.value}` : undefined
          const isTabStop = !isDisabled && opt.value === tabStopValue

          const baseClass =
            'flex min-h-[48px] w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
          const stateClass = isSelected
            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
          const disabledClass = isDisabled
            ? 'cursor-not-allowed opacity-50 hover:bg-white active:bg-white'
            : 'cursor-pointer'

          return (
            <button
              key={opt.value}
              ref={(el) => {
                buttonRefs.current[opt.value] = el
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isDisabled || undefined}
              disabled={isDisabled}
              tabIndex={isTabStop ? 0 : -1}
              onClick={() => {
                if (!isDisabled && !isSelected) onChange(opt.value)
              }}
              onKeyDown={(e) => {
                if (!isDisabled) handleKeyDown(e, opt.value)
              }}
              className={`${baseClass} ${stateClass} ${disabledClass}`}
              data-testid={optionTestId}
              data-value={opt.value}
              data-selected={isSelected ? 'true' : 'false'}
            >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300 bg-white'
                }`}
              >
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>
              {opt.icon && (
                <span aria-hidden="true" className="text-lg">
                  {opt.icon}
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{opt.label}</span>
                {opt.description && (
                  <span className="mt-0.5 text-xs text-gray-500">
                    {opt.description}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
