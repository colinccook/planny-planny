import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import ReactionButton, { type Reactor } from './ReactionButton'

const OPTIONS = [{ emoji: '👍', label: 'Thumbs up' }]
const MULTI_OPTIONS = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '❤️', label: 'Love' },
]

describe('ReactionButton', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders unreacted state with dashed border + grayscale', () => {
    render(
      createElement(ReactionButton, {
        options: OPTIONS,
        reactors: [],
        currentUserEmoji: null,
        onReact: vi.fn(),
        onUnreact: vi.fn(),
        testId: 'rx',
      }),
    )
    const btn = screen.getByTestId('rx')
    expect(btn.getAttribute('data-state')).toBe('unreacted')
    expect(btn.className).toContain('border-dashed')
    expect(btn.className).toContain('grayscale')
  })

  it('renders reacted state with filled colour', () => {
    render(
      createElement(ReactionButton, {
        options: OPTIONS,
        reactors: [{ id: 'r1', displayName: 'You', emoji: '👍', isCurrentUser: true }] as Reactor[],
        currentUserEmoji: '👍',
        onReact: vi.fn(),
        onUnreact: vi.fn(),
        testId: 'rx',
      }),
    )
    const btn = screen.getByTestId('rx')
    expect(btn.getAttribute('data-state')).toBe('reacted')
    expect(btn.className).not.toContain('border-dashed')
    expect(btn.className).toContain('bg-indigo-100')
    expect(screen.getByTestId('rx-count').textContent).toBe('1')
  })

  it('tap with single option triggers onReact', () => {
    const onReact = vi.fn()
    const onUnreact = vi.fn()
    render(
      createElement(ReactionButton, {
        options: OPTIONS,
        reactors: [],
        currentUserEmoji: null,
        onReact,
        onUnreact,
        testId: 'rx',
      }),
    )
    fireEvent.click(screen.getByTestId('rx'))
    expect(onReact).toHaveBeenCalledWith('👍')
    expect(onUnreact).not.toHaveBeenCalled()
  })

  it('tap when already reacted triggers onUnreact', () => {
    const onReact = vi.fn()
    const onUnreact = vi.fn()
    render(
      createElement(ReactionButton, {
        options: OPTIONS,
        reactors: [{ id: 'r1', displayName: 'You', emoji: '👍', isCurrentUser: true }],
        currentUserEmoji: '👍',
        onReact,
        onUnreact,
        testId: 'rx',
      }),
    )
    fireEvent.click(screen.getByTestId('rx'))
    expect(onUnreact).toHaveBeenCalled()
    expect(onReact).not.toHaveBeenCalled()
  })

  it('tap with multiple options opens inline picker', () => {
    render(
      createElement(ReactionButton, {
        options: MULTI_OPTIONS,
        reactors: [],
        currentUserEmoji: null,
        onReact: vi.fn(),
        onUnreact: vi.fn(),
        testId: 'rx',
      }),
    )
    fireEvent.click(screen.getByTestId('rx'))
    expect(screen.getByTestId('rx-picker')).toBeDefined()
    expect(screen.getByLabelText('Love')).toBeDefined()
  })

  it('picking an emoji from multi picker calls onReact with chosen emoji', () => {
    const onReact = vi.fn()
    render(
      createElement(ReactionButton, {
        options: MULTI_OPTIONS,
        reactors: [],
        currentUserEmoji: null,
        onReact,
        onUnreact: vi.fn(),
        testId: 'rx',
      }),
    )
    fireEvent.click(screen.getByTestId('rx'))
    fireEvent.click(screen.getByLabelText('Love'))
    expect(onReact).toHaveBeenCalledWith('❤️')
  })

  it('long press opens the reactors tray and suppresses the tap', () => {
    vi.useFakeTimers()
    const onReact = vi.fn()
    const onUnreact = vi.fn()
    render(
      createElement(ReactionButton, {
        options: OPTIONS,
        reactors: [
          { id: 'r1', displayName: 'Alex', emoji: '👍' },
          { id: 'r2', displayName: 'You', emoji: '👍', isCurrentUser: true },
        ],
        currentUserEmoji: '👍',
        onReact,
        onUnreact,
        testId: 'rx',
      }),
    )
    const btn = screen.getByTestId('rx')
    fireEvent.pointerDown(btn)
    act(() => {
      vi.advanceTimersByTime(600)
    })
    fireEvent.pointerUp(btn)
    fireEvent.click(btn)

    expect(onUnreact).not.toHaveBeenCalled()
    expect(screen.getByTestId('rx-reactors-list')).toBeDefined()
    expect(screen.getByText('Alex')).toBeDefined()
    expect(screen.getByText('You (you)')).toBeDefined()
  })

  it('reactors tray shows empty state when no reactors', () => {
    vi.useFakeTimers()
    render(
      createElement(ReactionButton, {
        options: OPTIONS,
        reactors: [],
        currentUserEmoji: null,
        onReact: vi.fn(),
        onUnreact: vi.fn(),
        testId: 'rx',
      }),
    )
    const btn = screen.getByTestId('rx')
    fireEvent.pointerDown(btn)
    act(() => {
      vi.advanceTimersByTime(600)
    })
    fireEvent.pointerUp(btn)
    expect(screen.getByTestId('rx-reactors-empty')).toBeDefined()
  })
})
