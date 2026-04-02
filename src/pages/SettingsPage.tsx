import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import HouseholdSwitcher from '../components/settings/HouseholdSwitcher'
import CreateHouseholdForm from '../components/settings/CreateHouseholdForm'
import HouseholdSettings from '../components/settings/HouseholdSettings'
import DayPlaceholders from '../components/settings/DayPlaceholders'
import MemberList from '../components/settings/MemberList'
import InviteManager from '../components/settings/InviteManager'
import PublicShareToggle from '../components/settings/PublicShareToggle'

export default function SettingsPage() {
  const { user } = useAuth()
  const { isLoading } = useHousehold()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-4">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 p-4">
      <h2 className="text-xl font-bold text-gray-900">Settings</h2>

      <HouseholdSwitcher />
      <CreateHouseholdForm />
      <HouseholdSettings />
      <DayPlaceholders />
      <MemberList />
      <InviteManager />
      <PublicShareToggle />

      <div className="rounded-lg bg-white p-4 shadow">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Account</h3>
        <p className="text-xs text-gray-500">{user?.email}</p>
      </div>
    </div>
  )
}
