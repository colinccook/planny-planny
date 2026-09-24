import { useState } from 'react'
import { copyToClipboard } from '../../lib/clipboard'
import { buildClaudeMcpServerUrl } from '../../lib/mcpUrl'
import { useToast } from '../../hooks/useToast'
import CollapsibleSection from '../ui/CollapsibleSection'

export default function AddToClaude() {
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  // Claude uses a dedicated MCP resource so its temporary OAuth compatibility
  // bridge cannot change the published ChatGPT plugin's issuer or grants.
  const mcpUrl = buildClaudeMcpServerUrl()

  const copyUrl = async () => {
    await copyToClipboard(mcpUrl)
    setCopied(true)
    showToast('Copied MCP server URL to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <CollapsibleSection title="Add to Claude" defaultOpen={false}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gray-700">
          Manage your meal plan from the Claude app by adding Planny Planny as a
          custom connector.
        </p>

        <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>
            In Claude, open <span className="font-medium">Settings → Connectors</span> and
            choose <span className="font-medium">Add custom connector</span>.
          </li>
          <li>
            Name it <span className="font-medium">Planny Planny</span> and paste the
            server URL below.
          </li>
          <li>
            Turn on <span className="font-medium">Requires sign-in</span> and leave the
            client ID and client secret blank — the server registers Claude
            automatically.
          </li>
          <li>
            Sign in, approve access and confirm your Planny Planny password to
            create a separate connector session.
          </li>
        </ol>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Server URL</p>
          <p className="mt-1 break-all font-mono text-xs text-gray-900" data-testid="mcp-server-url">
            {mcpUrl}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void copyUrl()}
          className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {copied ? 'Copied!' : 'Copy server URL for Claude'}
        </button>

        <p className="text-xs text-gray-500">
          Claude connects to the same household tools as the ChatGPT plugin
          through a separate connector URL, so the ChatGPT connection is not
          changed. Your household permissions still apply, and you can revoke
          Claude from Connected apps below.
        </p>
      </div>
    </CollapsibleSection>
  )
}
