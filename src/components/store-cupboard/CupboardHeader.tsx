interface CupboardHeaderProps {
  visibleCount: number
  totalCount: number
  showHidden: boolean
  onToggleShowHidden: () => void
  onResetAll: () => void
  onShare: () => void
}

export default function CupboardHeader({
  visibleCount,
  totalCount,
  showHidden,
  onToggleShowHidden,
  onResetAll,
  onShare,
}: CupboardHeaderProps) {
  const hiddenCount = totalCount - visibleCount

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Store Cupboard</h2>
        <button
          type="button"
          onClick={onShare}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white active:bg-emerald-700"
          aria-label="Share shopping list"
        >
          <span>📋</span>
          <span>Share</span>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleShowHidden}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              showHidden
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600'
            }`}
            aria-label={showHidden ? 'Hide cupboard items' : 'Show cupboard items'}
            aria-pressed={showHidden}
          >
            {showHidden ? 'Hide in-cupboard' : `Show hidden (${hiddenCount})`}
          </button>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={onResetAll}
              className="rounded-full px-3 py-1 text-xs font-medium text-red-600 bg-red-50 active:bg-red-100"
              aria-label="Show all ingredients"
            >
              Reset all
            </button>
          )}
        </div>

        <span className="text-xs text-gray-500">
          {visibleCount} item{visibleCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
