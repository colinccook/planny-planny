// @ChatGPTPlugin #UnitTesting #Frontend #ChatGptPlugin !PluginInformationPage
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PluginInformationPage from './PluginInformationPage'

describe('PluginInformationPage', () => {
  it('explains the plugin data lifecycle on the privacy page', () => {
    render(
      createElement(
        MemoryRouter,
        null,
        createElement(PluginInformationPage, { kind: 'privacy' }),
      ),
    )

    expect(screen.getByRole('heading', { name: 'Plugin privacy' })).toBeDefined()
    expect(screen.getByText(/does not create a separate conversation-history store/)).toBeDefined()
  })

  it('provides a public support route without requesting sensitive details', () => {
    render(
      createElement(
        MemoryRouter,
        null,
        createElement(PluginInformationPage, { kind: 'support' }),
      ),
    )

    expect(screen.getByRole('link', { name: 'Open a GitHub issue' })).toBeDefined()
    expect(screen.getByText(/Do not include passwords/)).toBeDefined()
  })
})
