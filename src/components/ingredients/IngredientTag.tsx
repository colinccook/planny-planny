interface IngredientTagProps {
  name: string
  starred?: boolean
  warning?: boolean
  variant?: 'default' | 'removable' | 'addable'
  onRemove?: () => void
  onAdd?: () => void
}

export default function IngredientTag({
  name,
  starred,
  warning,
  variant = 'default',
  onRemove,
  onAdd,
}: IngredientTagProps) {
  const baseClasses = warning
    ? 'bg-orange-100 text-orange-800'
    : 'bg-emerald-100 text-emerald-800'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${baseClasses}`}
    >
      {starred && <span aria-label="starred">⭐</span>}
      {warning && <span aria-label="warning">⚠️</span>}
      <span>{name}</span>
      {variant === 'removable' && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
      {variant === 'addable' && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
          aria-label={`Add ${name}`}
        >
          +
        </button>
      )}
    </span>
  )
}
