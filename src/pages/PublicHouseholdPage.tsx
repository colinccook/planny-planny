import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Household = Database['public']['Tables']['households']['Row']
type MealPlan = Database['public']['Tables']['meal_plans']['Row']

export default function PublicHouseholdPage() {
  const { token } = useParams<{ token: string }>()
  const [household, setHousehold] = useState<Household | null>(null)
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const fetchData = async () => {
      const { data: hData, error: hError } = await supabase
        .from('households')
        .select('*')
        .eq('public_share_token', token)
        .single()

      if (hError || !hData) {
        setError('Shared plan not found or sharing has been disabled.')
        setLoading(false)
        return
      }

      setHousehold(hData)

      const today = new Date().toISOString().split('T')[0]
      const { data: plans } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('household_id', hData.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(14)

      setMealPlans(plans ?? [])
      setLoading(false)
    }

    fetchData()
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    )
  }

  if (error || !household) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow">
          <h2 className="mb-2 text-lg font-bold text-gray-900">Not Found</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 px-4 py-3">
        <h1 className="text-lg font-bold text-white">{household.name}</h1>
        <p className="text-sm text-emerald-100">Shared meal plan</p>
      </header>

      <main className="mx-auto max-w-sm p-4">
        {mealPlans.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <p className="text-sm text-gray-500">No upcoming meal plans.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mealPlans.map((plan) => (
              <div key={plan.id} className="rounded-lg bg-white p-3 shadow">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-emerald-600">
                    {formatDate(plan.date)}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-medium text-gray-900">{plan.title}</h3>
                {plan.description && (
                  <p className="mt-0.5 text-xs text-gray-500">{plan.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
