import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { useEffect } from 'react'
import { useSwipe, type SwipeDirection } from './useSwipe'

interface ProbeProps {
  onSwipe?: (dir: SwipeDirection) => void
  onMealSwipe?: (dir: SwipeDirection, mealId: string) => void
  exposeRef?: (el: HTMLDivElement | null) => void
}

function Probe({ onSwipe, onMealSwipe, exposeRef }: ProbeProps) {
  const { ref, dragX, isDragging } = useSwipe<HTMLDivElement>({
    threshold: 50,
    onSwipe,
    onMealSwipe,
  })

  useEffect(() => {
    exposeRef?.(ref.current)
  })

  return (
    <div
      ref={ref}
      data-testid="host"
      data-dragx={dragX}
      data-dragging={isDragging ? '1' : '0'}
    >
      <div data-testid="meal-1" data-meal-card="true" data-meal-id="m1">
        Meal
      </div>
    </div>
  )
}

function touch(el: HTMLElement, type: 'start' | 'move' | 'end', x: number, y: number) {
  const init: TouchEventInit & { changedTouches?: Touch[] } = {
    cancelable: true,
    bubbles: true,
  }
  // jsdom doesn't implement TouchEvent constructor, so dispatch a synthetic
  // event via fireEvent which provides one.
  const eventName = type === 'start' ? 'touchStart' : type === 'move' ? 'touchMove' : 'touchEnd'
  const touchData = { clientX: x, clientY: y, identifier: 0 }
  const eventInit =
    type === 'end'
      ? { ...init, changedTouches: [touchData] as unknown as Touch[] }
      : { ...init, touches: [touchData] as unknown as Touch[] }
  fireEvent[eventName as 'touchStart'](el, eventInit)
}

describe('useSwipe', () => {
  let host: HTMLDivElement | null = null

  beforeEach(() => {
    host = null
  })

  function mount(props: ProbeProps = {}) {
    return render(
      <Probe
        {...props}
        exposeRef={(el) => {
          host = el
        }}
      />,
    )
  }

  it('fires onSwipe with "left" when finger moves significantly to the left', async () => {
    const onSwipe = vi.fn()
    mount({ onSwipe })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    if (!host) throw new Error('host not mounted')

    touch(host, 'start', 200, 100)
    touch(host, 'move', 150, 100)
    touch(host, 'move', 80, 100)
    touch(host, 'end', 80, 100)

    expect(onSwipe).toHaveBeenCalledTimes(1)
    expect(onSwipe).toHaveBeenCalledWith('left')
  })

  it('fires onSwipe with "right" when finger moves significantly to the right', async () => {
    const onSwipe = vi.fn()
    mount({ onSwipe })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    if (!host) throw new Error('host not mounted')

    touch(host, 'start', 50, 100)
    touch(host, 'move', 100, 100)
    touch(host, 'move', 200, 100)
    touch(host, 'end', 200, 100)

    expect(onSwipe).toHaveBeenCalledWith('right')
  })

  it('does not fire onSwipe for a small horizontal nudge below threshold', async () => {
    const onSwipe = vi.fn()
    mount({ onSwipe })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    if (!host) throw new Error('host not mounted')

    touch(host, 'start', 100, 100)
    touch(host, 'move', 110, 100)
    touch(host, 'move', 120, 100)
    touch(host, 'end', 120, 100)

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('does not fire onSwipe for a vertical drag', async () => {
    const onSwipe = vi.fn()
    mount({ onSwipe })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    if (!host) throw new Error('host not mounted')

    touch(host, 'start', 100, 100)
    touch(host, 'move', 100, 200)
    touch(host, 'move', 100, 300)
    touch(host, 'end', 100, 300)

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('routes meal-card swipes to onMealSwipe and not onSwipe', async () => {
    const onSwipe = vi.fn()
    const onMealSwipe = vi.fn()
    const { getByTestId } = mount({ onSwipe, onMealSwipe })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    const meal = getByTestId('meal-1')
    touch(meal, 'start', 200, 100)
    touch(meal, 'move', 150, 100)
    touch(meal, 'move', 80, 100)
    touch(meal, 'end', 80, 100)

    expect(onSwipe).not.toHaveBeenCalled()
    expect(onMealSwipe).toHaveBeenCalledWith('left', 'm1')
  })
})
