import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock before import
const mockWriteText = vi.fn()

beforeEach(() => {
  mockWriteText.mockReset()
  Object.assign(navigator, {
    clipboard: { writeText: mockWriteText },
  })
})

import { copyToClipboard } from './clipboard'

describe('copyToClipboard', () => {
  it('calls navigator.clipboard.writeText with the provided text', async () => {
    mockWriteText.mockResolvedValue(undefined)
    await copyToClipboard('hello')
    expect(mockWriteText).toHaveBeenCalledWith('hello')
  })

  it('does not throw when clipboard API rejects', async () => {
    mockWriteText.mockRejectedValue(new Error('denied'))
    await expect(copyToClipboard('hello')).resolves.not.toThrow()
  })

  it('does not throw when clipboard API is unavailable', async () => {
    Object.assign(navigator, { clipboard: undefined })
    await expect(copyToClipboard('hello')).resolves.not.toThrow()
  })
})
