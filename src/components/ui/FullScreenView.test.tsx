import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

import FullScreenView from './FullScreenView'

describe('FullScreenView', () => {
  it('renders the title', () => {
    render(
      createElement(FullScreenView, {
        title: 'Today',
        onBack: vi.fn(),
        children: createElement('p', null, 'page content'),
      }),
    )

    expect(screen.getByText('Today')).toBeDefined()
  })

  it('renders children content', () => {
    render(
      createElement(FullScreenView, {
        title: 'Test Page',
        onBack: vi.fn(),
        children: createElement('p', null, 'My content here'),
      }),
    )

    expect(screen.getByText('My content here')).toBeDefined()
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn()
    render(
      createElement(FullScreenView, {
        title: 'Test Page',
        onBack,
        children: createElement('p', null, 'content'),
      }),
    )

    fireEvent.click(screen.getByTestId('back-button'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('has accessible back button label', () => {
    render(
      createElement(FullScreenView, {
        title: 'Test Page',
        onBack: vi.fn(),
        children: createElement('p', null, 'content'),
      }),
    )

    expect(screen.getByLabelText('Go back')).toBeDefined()
  })

  it('renders title in heading element', () => {
    render(
      createElement(FullScreenView, {
        title: 'Wednesday 15 June',
        onBack: vi.fn(),
        children: createElement('p', null, 'content'),
      }),
    )

    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toBeDefined()
    expect(screen.getByText('Wednesday 15 June')).toBeDefined()
  })
})
