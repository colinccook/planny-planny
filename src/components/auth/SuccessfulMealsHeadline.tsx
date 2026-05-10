import { usePublicStat } from '../../hooks/usePublicStat'

/**
 * The unauthenticated welcome screen leads with the single number
 * Planny Planny is built around: how many planned meals have actually
 * happened across every household using the app.
 *
 * This is "the headline metric" — it's the answer to the question
 * "did Planny Planny help?" Every other feature exists in service of
 * making this number bigger.
 *
 * The number is read through the public `get_public_stat` RPC, which
 * is anon-callable and cached in the database (see the
 * `20260510000002_public_stats.sql` migration). When the value is
 * unknown (loading or RPC unavailable) or zero (fresh database) we
 * hide the headline rather than showing "0 meals" — celebrating the
 * absence of meals would be the wrong message.
 */
export default function SuccessfulMealsHeadline() {
  const { data } = usePublicStat('successful_meals_total')

  if (data === null || data === undefined || data <= 0) return null

  return (
    <div className="text-center" data-testid="successful-meals-headline">
      <p className="text-base font-medium text-emerald-700">
        Successfully helped families plan{' '}
        <strong className="text-emerald-800">{data.toLocaleString()}</strong>{' '}
        meals
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        Welcome to Planny Planny
      </p>
    </div>
  )
}
