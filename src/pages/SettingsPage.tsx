import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import HouseholdSwitcher from '../components/settings/HouseholdSwitcher'
import CreateHouseholdForm from '../components/settings/CreateHouseholdForm'
import HouseholdSettings from '../components/settings/HouseholdSettings'
import DayPlaceholders from '../components/settings/DayPlaceholders'
import MemberList from '../components/settings/MemberList'
import InviteManager from '../components/settings/InviteManager'
import PublicShareToggle from '../components/settings/PublicShareToggle'
import MyMemberships from '../components/settings/MyMemberships'
import DeleteHousehold from '../components/settings/DeleteHousehold'
import DeleteAccount from '../components/settings/DeleteAccount'
import PreferencesSettings from '../components/settings/PreferencesSettings'
import CollapsibleSection from '../components/ui/CollapsibleSection'
import { SkeletonSettingsCard } from '../components/ui/Skeleton'

function SettingsSkeleton() {
  return (
    <div className="space-y-4" data-testid="settings-skeleton">
      <SkeletonSettingsCard />
      <SkeletonSettingsCard />
      <SkeletonSettingsCard />
    </div>
  )
}

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { isLoading, memberships } = useHousehold()

  const hasMemberships = memberships.length > 0

  return (
    <div className="mx-auto max-w-sm space-y-4 p-4" data-testid="settings-page">
      {/* Heading only — the "What do these levels mean?" link lives inside
          the My Memberships card (the first card on the page) so we don't
          render it twice. Putting it here as well used to (a) duplicate the
          `data-testid="access-levels-link"` (breaking single-element queries
          in tests) and (b) on narrow phones squeeze the header into a
          two-line layout that overlapped the safe-area inset. */}
      <h2 className="text-xl font-bold text-gray-900">Settings</h2>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SettingsSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="space-y-4">
              <MyMemberships />
              {hasMemberships && <HouseholdSwitcher />}
              <CreateHouseholdForm />

              {hasMemberships && (
                <>
                  <HouseholdSettings />
                  <DayPlaceholders />
                  <MemberList />
                  <InviteManager />
                  <PublicShareToggle />
                  <DeleteHousehold />
                </>
              )}

              <PreferencesSettings />

              <CollapsibleSection title="Account">
                <div className="p-4">
                  <p className="mb-1 text-xs text-gray-500">{user?.email}</p>
                  <button
                    onClick={signOut}
                    className="mt-2 w-full rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    Sign out
                  </button>
                </div>
              </CollapsibleSection>

              <DeleteAccount />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
