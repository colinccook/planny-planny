import { useCallback } from 'react'

interface NumberStepperProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
}

export default function NumberStepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
  disabled = false,
}: NumberStepperProps) {
  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max]
  )

  const decrement = () => {
    if (!disabled) onChange(clamp(value - 1))
  }

  const increment = () => {
    if (!disabled) onChange(clamp(value + 1))
  }

  const displayValue = clamp(value)

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || displayValue <= min}
          aria-label={`Decrease ${label}`}
          data-testid={`${id}-decrement`}
          className="flex h-10 w-10 items-center justify-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-lg font-bold text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-gray-50"
        >
          −
        </button>
        <span
          id={id}
          role="status"
          aria-live="polite"
          aria-label={`${label}: ${displayValue}`}
          data-testid={`${id}-value`}
          className="flex h-10 min-w-[3rem] items-center justify-center border-y border-gray-300 bg-white text-sm font-semibold text-gray-900 tabular-nums"
        >
          {displayValue}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={disabled || displayValue >= max}
          aria-label={`Increase ${label}`}
          data-testid={`${id}-increment`}
          className="flex h-10 w-10 items-center justify-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-lg font-bold text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-gray-50"
        >
          +
        </button>
      </div>
    </div>
  )
}
