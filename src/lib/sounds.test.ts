import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  playSound,
  listSoundNames,
  _resetAudioContextForTests,
} from './sounds'

interface MockOscillator {
  type: OscillatorType
  frequency: { value: number }
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

interface MockGain {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
  }
  connect: ReturnType<typeof vi.fn>
}

function createMockAudioContext() {
  const oscillators: MockOscillator[] = []
  const gains: MockGain[] = []

  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => {
      const osc: MockOscillator = {
        type: 'sine',
        frequency: { value: 0 },
        connect: vi.fn(() => gains[gains.length - 1] ?? ctx.destination),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(osc)
      return osc
    }),
    createGain: vi.fn(() => {
      const gain: MockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(() => ctx.destination),
      }
      gains.push(gain)
      return gain
    }),
  }

  return { ctx, oscillators, gains }
}

describe('sounds', () => {
  let mock: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    mock = createMockAudioContext()
    // jsdom doesn't ship Web Audio. Use a real `function` so the
    // module can `new` it — vi.fn() arrow implementations are not
    // construct-callable.
    ;(window as unknown as { AudioContext: unknown }).AudioContext =
      function MockAudioContext(this: unknown) {
        return mock.ctx
      } as unknown as typeof AudioContext
    _resetAudioContextForTests()
  })

  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
    _resetAudioContextForTests()
  })

  it('exposes the expected sound palette', () => {
    expect(listSoundNames()).toEqual(
      expect.arrayContaining(['swish', 'pop', 'done', 'react', 'update']),
    )
  })

  it('creates oscillator + gain nodes when playing a sound', () => {
    playSound('done')
    expect(mock.ctx.createOscillator).toHaveBeenCalled()
    expect(mock.ctx.createGain).toHaveBeenCalled()
    expect(mock.oscillators.length).toBeGreaterThan(0)
    for (const osc of mock.oscillators) {
      expect(osc.start).toHaveBeenCalled()
      expect(osc.stop).toHaveBeenCalled()
    }
  })

  it('uses an attack-decay envelope (no clicky direct ramp from 0)', () => {
    playSound('pop')
    for (const gain of mock.gains) {
      // Initial near-zero value followed by an exponential ramp up to
      // the peak — this is the click-free attack profile.
      expect(gain.gain.setValueAtTime).toHaveBeenCalled()
      expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalled()
    }
  })

  it('keeps every step quiet (peak < 0.1) so sounds remain subtle', () => {
    for (const name of listSoundNames()) {
      // Reset between sounds so we only inspect the current play.
      mock = createMockAudioContext()
      ;(window as unknown as { AudioContext: unknown }).AudioContext =
        function MockAudioContext(this: unknown) {
          return mock.ctx
        } as unknown as typeof AudioContext
      _resetAudioContextForTests()

      playSound(name)

      for (const gain of mock.gains) {
        const rampCalls =
          gain.gain.exponentialRampToValueAtTime.mock.calls as [
            number,
            number,
          ][]
        for (const [value] of rampCalls) {
          expect(value).toBeLessThanOrEqual(0.1)
        }
      }
    }
  })

  it('is a no-op when Web Audio is unavailable', () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
    delete (window as unknown as { webkitAudioContext?: unknown })
      .webkitAudioContext
    _resetAudioContextForTests()
    expect(() => playSound('pop')).not.toThrow()
  })
})

describe('sound enabled flag', () => {
  it('mirrors enabled state and notifies subscribers on change', async () => {
    const { setSoundsEnabled, getSoundsEnabled, subscribeSoundsEnabled } =
      await import('./sounds')

    // Reset to known state.
    setSoundsEnabled(true)
    expect(getSoundsEnabled()).toBe(true)

    const listener = vi.fn()
    const unsubscribe = subscribeSoundsEnabled(listener)

    setSoundsEnabled(false)
    expect(getSoundsEnabled()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)

    // Setting to the same value should not re-notify.
    setSoundsEnabled(false)
    expect(listener).toHaveBeenCalledTimes(1)

    setSoundsEnabled(true)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    setSoundsEnabled(false)
    expect(listener).toHaveBeenCalledTimes(2)

    // Restore for any later tests.
    setSoundsEnabled(true)
  })

  it('playSoundIfEnabled respects the flag', async () => {
    const { playSoundIfEnabled, setSoundsEnabled, _resetAudioContextForTests } =
      await import('./sounds')

    const local = createMockAudioContext()
    ;(window as unknown as { AudioContext: unknown }).AudioContext =
      function MockAudioContext(this: unknown) {
        return local.ctx
      } as unknown as typeof AudioContext
    _resetAudioContextForTests()

    setSoundsEnabled(false)
    playSoundIfEnabled('pop')
    expect(local.ctx.createOscillator).not.toHaveBeenCalled()

    setSoundsEnabled(true)
    playSoundIfEnabled('pop')
    expect(local.ctx.createOscillator).toHaveBeenCalled()
  })
})
