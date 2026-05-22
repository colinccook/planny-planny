import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import ErrorBoundary from './ErrorBoundary'

function Boom({ message }: { message: string }): never {
  throw new Error(message)
}

describe('ErrorBoundary', () => {
  // React logs caught errors to console.error in development; silence them
  // so the test output stays readable.
  let errorSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      /* intentionally silent */
    })
  })
  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary area="Test">
        <p>all good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeDefined()
  })

  it('renders the fallback when a child throws, including the area label and message', () => {
    render(
      <ErrorBoundary area="Settings">
        <Boom message="kaboom" />
      </ErrorBoundary>,
    )
    const fallback = screen.getByTestId('error-boundary-fallback')
    expect(fallback).toBeDefined()
    expect(fallback.textContent).toContain('Settings')
    expect(fallback.textContent).toContain('kaboom')
    expect(screen.getByRole('button', { name: /reload page/i })).toBeDefined()
  })

  it('omits the area phrase when no area prop is given', () => {
    render(
      <ErrorBoundary>
        <Boom message="oops" />
      </ErrorBoundary>,
    )
    screen.getByTestId('error-boundary-fallback')
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe('Something went wrong.')
  })
})

