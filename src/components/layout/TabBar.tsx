import { NavLink, useLocation } from 'react-router-dom'
import { useCalendarDirection } from '../../hooks/useCalendarDirection'
import { useHousehold } from '../../hooks/useHousehold'

const tabs = [
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/ingredients', label: 'Ingredients', icon: '🥕' },
  { to: '/store-cupboard', label: 'Cupboard', icon: '🗄️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
] as const

export default function TabBar() {
  const location = useLocation()
  const { toggleDirection } = useCalendarDirection()
  const { memberships, isLoading } = useHousehold()

  // Until you belong to a household, the other tabs would be
  // dead ends — hide them so it's obvious to head to Settings.
  const hasHousehold = isLoading || memberships.length > 0
  const visibleTabs = hasHousehold ? tabs : tabs.filter((t) => t.to === '/settings')

  const handleCalendarTabClick = (e: React.MouseEvent) => {
    const isOnCalendar = location.pathname === '/calendar'
    if (!isOnCalendar) return // Normal navigation

    e.preventDefault()

    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      toggleDirection()
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
      <div className="safe-area-bottom mx-auto flex max-w-lg" data-testid="tab-bar">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            replace
            onClick={tab.to === '/calendar' ? handleCalendarTabClick : undefined}
            data-testid={`tab-${tab.to.slice(1)}`}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
