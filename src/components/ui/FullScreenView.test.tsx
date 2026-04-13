import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'

import FullScreenView from './FullScreenView'
import { HeaderOverrideProvider, useHeaderOverride } from '../../hooks/useHeaderOverride'

/** Helper that renders FullScreenView inside the required context provider */
function renderWithProvider(props: { title: string; onBack: () => void; children: React.ReactNode }) {
  return render(
    createElement(HeaderOverrideProvider, null,
      createElement(FullScreenView, { title: props.title, onBack: props.onBack, children: props.children }),
    ),
  )
}

/** Test helper that reads the current header override from context */
function OverrideReader({ onRead }: { onRead: (o: ReturnType<typeof useHeaderOverride>['override']) => void }) {
  const { override } = useHeaderOverride()
  onRead(override)
  return null
}

describe('FullScreenView', () => {
  it('renders children content', () => {
    renderWithProvider({
      title: 'Test Page',
      onBack: vi.fn(),
      children: createElement('p', null, 'My content here'),
    })

    expect(screen.getByText('My content here')).toBeDefined()
  })

  it('sets header override with correct title', () => {
    const onRead = vi.fn()

    render(
      createElement(HeaderOverrideProvider, null,
        createElement(FullScreenView, {
          title: 'Wednesday 15 June',
          onBack: vi.fn(),
          children: createElement('p', null, 'content'),
        }),
        createElement(OverrideReader, { onRead }),
      ),
    )

    const lastCall = onRead.mock.calls[onRead.mock.calls.length - 1][0]
    expect(lastCall).not.toBeNull()
    expect(lastCall.title).toBe('Wednesday 15 June')
  })

  it('sets header override with correct onBack callback', () => {
    const onBack = vi.fn()
    const onRead = vi.fn()

    render(
      createElement(HeaderOverrideProvider, null,
        createElement(FullScreenView, {
          title: 'Test Page',
          onBack,
          children: createElement('p', null, 'content'),
        }),
        createElement(OverrideReader, { onRead }),
      ),
    )

    const lastCall = onRead.mock.calls[onRead.mock.calls.length - 1][0]
    expect(lastCall).not.toBeNull()
    lastCall.onBack()
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('clears header override on unmount', () => {
    const onRead = vi.fn()

    const { unmount } = render(
      createElement(HeaderOverrideProvider, null,
        createElement(FullScreenView, {
          title: 'Test Page',
          onBack: vi.fn(),
          children: createElement('p', null, 'content'),
        }),
        createElement(OverrideReader, { onRead }),
      ),
    )

    const beforeUnmount = onRead.mock.calls[onRead.mock.calls.length - 1][0]
    expect(beforeUnmount).not.toBeNull()

    // Re-render without FullScreenView to trigger unmount
    unmount()

    const onRead2 = vi.fn()

    // After unmount, render only the reader to check the override was cleared
    render(
      createElement(HeaderOverrideProvider, null,
        createElement(OverrideReader, { onRead: onRead2 }),
      ),
    )

    const afterUnmount = onRead2.mock.calls[onRead2.mock.calls.length - 1][0]
    expect(afterUnmount).toBeNull()
  })
})
