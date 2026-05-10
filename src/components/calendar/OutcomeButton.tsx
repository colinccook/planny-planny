import { OUTCOME_REASON_LABELS, type MealOutcome } from '../../hooks/useMealOutcomes'

interface OutcomeButtonProps {
  outcome: MealOutcome | undefined
  onClick: () => void
  mealTitle: string
}

/**
 * Small pill rendered at the bottom of `<MealCard>` that lets an
 * editor record (or revisit) whether the meal actually happened.
 *
 * Three visual states:
 *   • unset            — neutral grey "How did it go?" pill
 *   • as_planned       — green ✅ pill
 *   • did_not_happen   — neutral grey pill with the reason as a sub-line
 *
 * The button only renders when the parent (MealCard) decides we're
 * allowed to record — see canRecordOutcomes / canRecordOutcomeOn.
 */
export default function OutcomeButton({
  outcome,
  onClick,
  mealTitle,
}: OutcomeButtonProps) {
  if (!outcome) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
        data-testid="outcome-button"
        data-outcome-state="unset"
        aria-label={`How did the ${mealTitle} plan go?`}
      >
        <span aria-hidden>📝</span>
        <span>How did it go?</span>
      </button>
    )
  }

  if (outcome.status === 'as_planned') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-200"
        data-testid="outcome-button"
        data-outcome-state="as_planned"
        aria-label={`${mealTitle} happened as planned. Tap to change.`}
      >
        <span aria-hidden>✅</span>
        <span>As planned</span>
      </button>
    )
  }

  // did_not_happen — show the reason as a compact sub-line so the user
  // doesn't have to open the tray to see why.
  const reasonLabel =
    outcome.reason === 'other' && outcome.note
      ? outcome.note
      : (outcome.reason && OUTCOME_REASON_LABELS[outcome.reason]) ?? "Didn't happen"
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-col items-start gap-0.5 rounded-2xl bg-gray-100 px-3 py-1.5 text-left text-xs font-medium text-gray-600 hover:bg-gray-200"
      data-testid="outcome-button"
      data-outcome-state="did_not_happen"
      aria-label={`${mealTitle} did not happen: ${reasonLabel}. Tap to change.`}
    >
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>—</span>
        <span>Didn't happen</span>
      </span>
      <span className="text-[11px] font-normal text-gray-500">{reasonLabel}</span>
    </button>
  )
}
