import { useConnectedApps } from '../../hooks/useConnectedApps'
import CollapsibleSection from '../ui/CollapsibleSection'

export default function ConnectedApps() {
  const { apps, loading, error, revokingKey, revoke } = useConnectedApps()

  return (
    <CollapsibleSection title="Connected apps">
      <div className="space-y-3 p-4">
        {loading && <p className="text-sm text-gray-500">Loading connected apps…</p>}

        {!loading && apps.length === 0 && !error && (
          <p className="text-sm text-gray-500">No apps are connected to your account.</p>
        )}

        {apps.map((app) => {
          const key = `${app.source}:${app.id}`
          return (
          <div
            key={key}
            data-testid={`connected-app-${app.source}-${app.id}`}
            className="rounded-lg border border-gray-200 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{app.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Permissions: {app.permissions.join(', ') || 'Planny Planny access'}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Revoke ${app.name}`}
                disabled={revokingKey === key}
                onClick={() => void revoke(app)}
                className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {revokingKey === key ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          </div>
          )
        })}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </CollapsibleSection>
  )
}
