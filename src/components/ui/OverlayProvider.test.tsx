import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { OverlayProvider, useOverlay, useOverlayContext } from './OverlayProvider'

function wrapper({ children }: { children: ReactNode }) {
  return createElement(OverlayProvider, null, children)
}

describe('useOverlay', () => {
  it('throws if used outside the provider', () => {
    expect(() => renderHook(() => useOverlayContext())).toThrow(
      /useOverlay must be used within an OverlayProvider/,
    )
  })

  it('reports closed by default', () => {
    const { result } = renderHook(() => useOverlay('a'), { wrapper })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('opens and closes a single overlay', () => {
    const { result } = renderHook(() => useOverlay<string>('add-idea'), { wrapper })

    act(() => result.current.open('hello'))
    expect(result.current.isOpen).toBe(true)
    expect(result.current.data).toBe('hello')

    act(() => result.current.close())
    expect(result.current.isOpen).toBe(false)
  })

  it('opening a second overlay closes the first', () => {
    const { result } = renderHook(
      () => ({
        a: useOverlay('a'),
        b: useOverlay('b'),
      }),
      { wrapper },
    )

    act(() => result.current.a.open())
    expect(result.current.a.isOpen).toBe(true)
    expect(result.current.b.isOpen).toBe(false)

    act(() => result.current.b.open())
    expect(result.current.a.isOpen).toBe(false)
    expect(result.current.b.isOpen).toBe(true)
  })

  it('close(id) is a no-op if a different overlay is open', () => {
    const { result } = renderHook(
      () => ({
        a: useOverlay('a'),
        b: useOverlay('b'),
      }),
      { wrapper },
    )

    act(() => result.current.a.open())
    act(() => result.current.b.close()) // wrong id, should not affect a
    expect(result.current.a.isOpen).toBe(true)
  })
})
