import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/ingredients', label: 'Ingredients', icon: '🥕' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
] as const

export default function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
      <div className="safe-area-bottom mx-auto flex max-w-lg">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
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
