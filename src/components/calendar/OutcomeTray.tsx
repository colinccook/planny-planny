import { useState } from 'react'
import Tray from '../ui/Tray'
import VerticalSelector from '../ui/VerticalSelector'
import {
  OUTCOME_REASONS,
  OUTCOME_REASON_LABELS,
  useDeleteMealOutcome,
  useUpsertMealOutcome,
  type MealOutcome,
  type MealOutcomeReason,
} from '../../hooks/useMealOutcomes'

interface OutcomeTrayProps {
  isOpen: boolean
  onClose: () => void
  mealPlanId: string
  householdId: string
  mealTitle: string
  /** The current outcome, if any. When set, the tray opens in
   *  "edit / clear" mode instead of "create" mode. */
  existing: MealOutcome | undefined
  /** Notified when an outcome is just-set so the parent can play
   *  the one-shot flourish animation on the meal card. */
  onJustSet?: (status: 'as_planned' | 'did_not_happen') => void
}

type Step = 'choose' | 'why'

/**
 * Bottom sheet for recording (or clearing) a meal outcome.
 *
 * Flow:
 *   1. "Yes, as planned" / "No, it didn't happen"
 *   2. If "no": pick a reason (and a free-text note for "Other")
 *   3. Save / Clear
 *
 * Mirrors the CopyMealTray pattern (overlay + Tray) so it composes
 * with the existing day-detail UI.
 */
export default function OutcomeTray({
  isOpen,
  onClose,
  mealPlanId,
  householdId,
  mealTitle,
  existing,
  onJustSet,
}: OutcomeTrayProps) {
  const upsert = useUpsertMealOutcome()
  const remove = useDeleteMealOutcome()

  // If an outcome already exists and it's a "did_not_happen" one,
  // pre-select that branch so the user lands directly on the why
  // selector with their previous answer pre-filled.
  //
  // Reset is handled by the parent passing `key={mealPlanId}` so a
  // brand-new tray instance mounts with fresh useState defaults
  // when the meal changes — this avoids a setState-in-effect anti-
  // pattern.
  const [step, setStep] = useState<Step>(
    existing?.status === 'did_not_happen' ? 'why' : 'choose',
  )
  const [reason, setReason] = useState<MealOutcomeReason>(
    (existing?.reason as MealOutcomeReason | null) ?? 'no_shopping',
  )
  const [note, setNote] = useState<string>(existing?.note ?? '')

  const isOtherWithoutNote = reason === 'other' && note.trim().length === 0
  const isBusy = upsert.isPending || remove.isPending

  const handleAsPlanned = async () => {
    await upsert.mutateAsync({
      mealPlanId,
      householdId,
      status: 'as_planned',
    })
    onJustSet?.('as_planned')
    onClose()
  }

  const handleSaveDidNotHappen = async () => {
    if (isOtherWithoutNote) return
    await upsert.mutateAsync({
      mealPlanId,
      householdId,
      status: 'did_not_happen',
      reason,
      note: reason === 'other' ? note.trim() : (note.trim() || null),
    })
    onJustSet?.('did_not_happen')
    onClose()
  }

  const handleClear = async () => {
    await remove.mutateAsync({ mealPlanId, householdId })
    onClose()
  }

  return (
    <Tray
      isOpen={isOpen}
      onClose={onClose}
      title={`Did the plan for "${mealTitle}" go as expected?`}
      description="This is the headline metric — your honest answer helps everyone learn what works."
    >
      <div className="space-y-4 pb-2" data-testid="outcome-tray-body">
        {step === 'choose' && (
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={handleAsPlanned}
              disabled={isBusy}
              className="rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
              data-testid="outcome-as-planned-button"
            >
              ✅ Yes, as planned
            </button>
            <button
              type="button"
              onClick={() => setStep('why')}
              disabled={isBusy}
              className="rounded-xl bg-gray-100 py-4 text-base font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-200 disabled:opacity-50"
              data-testid="outcome-did-not-happen-button"
            >
              ❌ No, it didn't happen
            </button>
            {existing && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isBusy}
                className="mt-2 text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
                data-testid="outcome-clear-button"
              >
                Clear outcome
              </button>
            )}
          </div>
        )}

        {step === 'why' && (
          <>
            <VerticalSelector<MealOutcomeReason>
              label="What got in the way?"
              options={OUTCOME_REASONS.map((r) => ({
                value: r,
                label: OUTCOME_REASON_LABELS[r],
              }))}
              value={reason}
              onChange={setReason}
              testId="outcome-reason-selector"
            />

            {reason === 'other' && (
              <div>
                <label
                  htmlFor="outcome-other-note"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tell us more
                </label>
                <textarea
                  id="outcome-other-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="What happened?"
                  data-testid="outcome-other-note"
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveDidNotHappen}
                disabled={isBusy || isOtherWithoutNote}
                className="rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                data-testid="outcome-save-button"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setStep('choose')}
                disabled={isBusy}
                className="rounded-xl bg-white py-3 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
                data-testid="outcome-back-button"
              >
                Back
              </button>
              {existing && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isBusy}
                  className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
                  data-testid="outcome-clear-button"
                >
                  Clear outcome
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Tray>
  )
}
