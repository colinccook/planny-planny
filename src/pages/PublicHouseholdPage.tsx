import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Household = Database['public']['Tables']['households']['Row']
type MealPlan = Database['public']['Tables']['meal_plans']['Row']
type MealIdea = Database['public']['Tables']['meal_ideas']['Row']

interface IdeaWithCount extends MealIdea {
  reactionCount: number
}

interface MealPlanWithCount extends MealPlan {
  reactionCount: number
}

export default function PublicHouseholdPage() {
  const { token } = useParams<{ token: string }>()
  const [household, setHousehold] = useState<Household | null>(null)
  const [mealPlans, setMealPlans] = useState<MealPlanWithCount[]>([])
  const [ideas, setIdeas] = useState<IdeaWithCount[]>([])
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

      const { data: ideaRows } = await supabase
        .from('meal_ideas')
        .select('*')
        .eq('household_id', hData.id)
        .order('created_at', { ascending: false })

      // Fetch all reactions in one go and aggregate client-side.
      // The RLS policy added in migration 20260424000001 lets
      // anonymous viewers read reactions belonging to a shared
      // household; voter identity is intentionally never shown.
      const { data: reactionRows } = await supabase
        .from('reactions')
        .select('target_type, target_id')
        .eq('household_id', hData.id)

      const counts = new Map<string, number>()
      for (const r of reactionRows ?? []) {
        const key = `${r.target_type}:${r.target_id}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      setMealPlans(
        (plans ?? []).map((p) => ({
          ...p,
          reactionCount: counts.get(`meal_plan:${p.id}`) ?? 0,
        })),
      )
      setIdeas(
        (ideaRows ?? []).map((i) => ({
          ...i,
          reactionCount: counts.get(`meal_idea:${i.id}`) ?? 0,
        })),
      )
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

      <main className="mx-auto max-w-sm space-y-6 p-4">
        <section data-testid="public-meals-section">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Upcoming meals</h2>
          {mealPlans.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center shadow">
              <p className="text-sm text-gray-500">No upcoming meal plans.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mealPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg bg-white p-3 shadow"
                  data-testid={`public-meal-${plan.id}`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-emerald-600">
                      {formatDate(plan.date)}
                    </span>
                    {plan.reactionCount > 0 && (
                      <span
                        className="text-xs text-gray-500"
                        data-testid={`public-meal-votes-${plan.id}`}
                        aria-label={`${plan.reactionCount} ${plan.reactionCount === 1 ? 'vote' : 'votes'}`}
                      >
                        👍 {plan.reactionCount}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-medium text-gray-900">{plan.title}</h3>
                  {plan.description && (
                    <p className="mt-0.5 text-xs text-gray-500">{plan.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section data-testid="public-ideas-section">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Meal ideas</h2>
          {ideas.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center shadow">
              <p className="text-sm text-gray-500">No meal ideas yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {ideas.map((idea) => (
                <li
                  key={idea.id}
                  className="flex items-center justify-between rounded-lg bg-white p-3 shadow"
                  data-testid={`public-idea-${idea.id}`}
                >
                  <span className="truncate text-sm font-medium text-gray-900">
                    {idea.title}
                  </span>
                  <span
                    className="shrink-0 text-xs text-gray-500"
                    data-testid={`public-idea-votes-${idea.id}`}
                    aria-label={`${idea.reactionCount} ${idea.reactionCount === 1 ? 'vote' : 'votes'}`}
                  >
                    👍 {idea.reactionCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="rounded-md bg-emerald-50 p-3 text-center text-xs text-emerald-700">
          Public viewers see meals, ideas and vote totals. Events
          and individual voter names are kept private to household
          members.
        </p>
      </main>
    </div>
  )
}
