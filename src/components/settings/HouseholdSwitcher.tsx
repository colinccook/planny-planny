import { useHousehold } from '../../hooks/useHousehold'
import RoleBadge from './RoleBadge'
import { SkeletonBlock } from '../ui/Skeleton'

export default function HouseholdSwitcher() {
  const { households, currentHousehold, switchHousehold, isLoading } = useHousehold()

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-4 shadow" data-testid="household-switcher-skeleton">
        <SkeletonBlock className="h-5 w-32" />
      </div>
    )
  }

  if (households.length === 0) {
    return (
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-gray-500">No households yet. Create one below!</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <label htmlFor="household-select" className="mb-1 block text-sm font-medium text-gray-700">
        Current Household
      </label>
      <select
        id="household-select"
        value={currentHousehold?.id ?? ''}
        onChange={(e) => switchHousehold(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
      >
        {households.map((h) => (
          <option key={h.id} value={h.id}>
            {h.alias ?? h.name}
          </option>
        ))}
      </select>
      {currentHousehold && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">{currentHousehold.name}</span>
          <HouseholdRoleBadges householdId={currentHousehold.id} />
        </div>
      )}
    </div>
  )
}

function HouseholdRoleBadges({ householdId }: { householdId: string }) {
  const { households, currentRole } = useHousehold()
  const household = households.find((h) => h.id === householdId)
  if (!household || !currentRole) return null

  return <RoleBadge role={currentRole} />
}
