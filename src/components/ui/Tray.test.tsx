import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createElement } from 'react'

import Tray from './Tray'

describe('Tray', () => {
  it('renders nothing when closed', () => {
    render(
      createElement(Tray, {
        isOpen: false,
        onClose: vi.fn(),
        title: 'Test Tray',
        children: createElement('p', null, 'Tray content'),
      }),
    )

    expect(screen.queryByText('Tray content')).toBeNull()
  })

  it('renders title and content when open', async () => {
    render(
      createElement(Tray, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Test Tray',
        children: createElement('p', null, 'Tray content'),
      }),
    )

    // Wait for mount + animation frame
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByText('Test Tray')).toBeDefined()
    expect(screen.getByText('Tray content')).toBeDefined()
  })

  it('renders description when provided', async () => {
    render(
      createElement(Tray, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Test Tray',
        description: 'A helpful description',
        children: createElement('p', null, 'content'),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByText('A helpful description')).toBeDefined()
  })

  it('calls onClose when X button is clicked', async () => {
    const onClose = vi.fn()
    render(
      createElement(Tray, {
        isOpen: true,
        onClose,
        title: 'Test Tray',
        children: createElement('p', null, 'content'),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    fireEvent.click(screen.getByTestId('tray-close-button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(
      createElement(Tray, {
        isOpen: true,
        onClose,
        title: 'Test Tray',
        children: createElement('p', null, 'content'),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    fireEvent.click(screen.getByTestId('tray-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has proper dialog role and aria attributes', async () => {
    render(
      createElement(Tray, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'My Tray',
        children: createElement('p', null, 'content'),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('My Tray')
  })

  it('has a close button with accessible label', async () => {
    render(
      createElement(Tray, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Test Tray',
        children: createElement('p', null, 'content'),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByLabelText('Close tray')).toBeDefined()
  })

  it('calls onClose on swipe down past threshold', async () => {
    const onClose = vi.fn()
    render(
      createElement(Tray, {
        isOpen: true,
        onClose,
        title: 'Test Tray',
        children: createElement('p', null, 'content'),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const panel = screen.getByTestId('tray-panel')

    fireEvent.touchStart(panel, {
      touches: [{ clientY: 100 }],
    })
    fireEvent.touchMove(panel, {
      touches: [{ clientY: 250 }],
    })
    fireEvent.touchEnd(panel)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose on small swipe', async () => {
    const onClose = vi.fn()
    render(
      createElement(Tray, {
        isOpen: true,
        onClose,
        title: 'Test Tray',
        children: createElement('p', null, 'content'),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const panel = screen.getByTestId('tray-panel')

    fireEvent.touchStart(panel, {
      touches: [{ clientY: 100 }],
    })
    fireEvent.touchMove(panel, {
      touches: [{ clientY: 130 }],
    })
    fireEvent.touchEnd(panel)

    expect(onClose).not.toHaveBeenCalled()
  })
})
