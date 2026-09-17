import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSignIn = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}))

import LoginForm from './LoginForm'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue(undefined)
  })

  it('returns to a preserved OAuth consent request after sign-in', async () => {
    render(
      createElement(
        MemoryRouter,
        {
          initialEntries: [
            '/login?redirect=%2Foauth%2Fconsent%3Fauthorization_id%3Dauth-1',
          ],
        },
        createElement(
          Routes,
          null,
          createElement(Route, { path: '/login', element: createElement(LoginForm) }),
          createElement(Route, {
            path: '/oauth/consent',
            element: createElement('div', null, 'Consent destination'),
          }),
        ),
      ),
    )

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'planner@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct horse battery staple' },
    })
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form')
    expect(form).not.toBeNull()
    if (form) fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Consent destination')).toBeDefined()
    })
  })
})
