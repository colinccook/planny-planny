import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement } from 'react'

const mockShowToast = vi.fn()
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

const mockCopyToClipboard = vi.fn().mockResolvedValue(undefined)
vi.mock('../../lib/clipboard', () => ({
  copyToClipboard: (text: string) => mockCopyToClipboard(text),
}))

import AddToClaude from './AddToClaude'
import { buildMcpServerUrl } from '../../lib/mcpUrl'

describe('AddToClaude', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the MCP server URL for the connector', () => {
    render(createElement(AddToClaude))

    fireEvent.click(screen.getByRole('button', { name: 'Add to Claude' }))

    expect(screen.getByTestId('mcp-server-url').textContent).toBe(buildMcpServerUrl())
    expect(buildMcpServerUrl()).toMatch(/\/functions\/v1\/chatgpt-plugin\/mcp$/)
  })

  it('explains that sign-in is required and client details stay blank', () => {
    render(createElement(AddToClaude))

    fireEvent.click(screen.getByRole('button', { name: 'Add to Claude' }))

    expect(screen.getByText('Requires sign-in')).toBeDefined()
    expect(screen.getByText(/leave the client ID and client secret blank/i)).toBeDefined()
  })

  it('copies the server URL to the clipboard', async () => {
    render(createElement(AddToClaude))

    fireEvent.click(screen.getByRole('button', { name: 'Add to Claude' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy server URL for Claude' }))

    await waitFor(() => {
      expect(mockCopyToClipboard).toHaveBeenCalledWith(buildMcpServerUrl())
    })
    expect(mockShowToast).toHaveBeenCalledWith('Copied MCP server URL to clipboard')
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeDefined()
  })
})
