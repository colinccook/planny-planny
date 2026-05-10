/**
 * Tiny Web Audio sound palette.
 *
 * Everything is synthesised on the fly with `OscillatorNode` + a short
 * `GainNode` envelope so we don't need to ship any audio files (which
 * would bloat the bundle and require asset routing). The aim is for
 * each sound to be:
 *
 *   • subtle    — low peak gain, quick fade,
 *   • friendly  — major-third / perfect-fifth intervals, no harsh
 *                 attack, sine waves where possible,
 *   • short     — well under 250 ms so they sit alongside the
 *                 existing UI animations rather than clashing.
 *
 * The module deliberately holds no React state; a single shared
 * `AudioContext` is created lazily on the first call (browsers
 * require user interaction before audio can start, so we let the
 * first user-triggered play kick it off).
 *
 * Call sites should go through the `useSounds()` hook rather than
 * importing `playSound` directly — the hook is the place that reads
 * the user preference and short-circuits when sounds are off.
 */

export type SoundName =
  // Day-swipe in time with the slide animation.
  | 'swish'
  // Generic "something just appeared" pop — used for realtime inserts.
  | 'pop'
  // Soft chime for a completed task.
  | 'done'
  // Two-note ping for a reaction landing.
  | 'react'
  // A row was updated remotely.
  | 'update'

interface SoundStep {
  /** Frequency in Hz. Pick from a friendly major scale to avoid
   *  anything jarring; sequences should resolve back near the root. */
  freq: number
  /** Oscillator wave shape. Sines are the gentlest. */
  type?: OscillatorType
  /** Step duration (s). Keep small — these are blips, not notes. */
  duration: number
  /** Time offset from the start of the sound (s). */
  startAt: number
  /** Peak gain for this step (0-1). Stay quiet — typical 0.04-0.10. */
  peak: number
}

const SOUNDS: Record<SoundName, SoundStep[]> = {
  // Swish: a quick downward sine sweep emulating air-brushing past.
  // Two slightly detuned voices makes it feel a touch wider without
  // becoming musical.
  swish: [
    { freq: 880, type: 'sine', duration: 0.18, startAt: 0, peak: 0.05 },
    { freq: 660, type: 'sine', duration: 0.18, startAt: 0.02, peak: 0.04 },
  ],
  // Pop: short, slightly resonant blip. Like a soap bubble forming.
  pop: [
    { freq: 660, type: 'sine', duration: 0.10, startAt: 0, peak: 0.07 },
    { freq: 990, type: 'sine', duration: 0.08, startAt: 0.02, peak: 0.04 },
  ],
  // Done: a perfect-fifth chime — C → G — that sounds resolved.
  done: [
    { freq: 523.25, type: 'sine', duration: 0.14, startAt: 0, peak: 0.07 },
    { freq: 783.99, type: 'sine', duration: 0.20, startAt: 0.10, peak: 0.07 },
  ],
  // React: friendly two-note "ping" — a major-third up.
  react: [
    { freq: 659.25, type: 'triangle', duration: 0.10, startAt: 0, peak: 0.05 },
    { freq: 830.61, type: 'triangle', duration: 0.14, startAt: 0.06, peak: 0.05 },
  ],
  // Update: very gentle low blip so background changes don't startle.
  update: [
    { freq: 392, type: 'sine', duration: 0.12, startAt: 0, peak: 0.04 },
  ],
}

let sharedCtx: AudioContext | null = null

/**
 * Module-level mirror of the user's "sound effects enabled" preference.
 * Updated by `useUserPreferences` whenever the cached value changes,
 * read by `playSoundIfEnabled` so call sites that don't have access to
 * React hook state (e.g. mutation `onMutate` callbacks living in
 * non-component modules) can still honour the user's choice without
 * threading the preference through every layer.
 *
 * Default `true` matches the preference default and means brand-new
 * sessions produce sounds before the preferences query has resolved.
 */
let soundsEnabled = true
const soundsEnabledSubs = new Set<() => void>()

/** Set by `useUserPreferences` whenever the preference flips. */
export function setSoundsEnabled(enabled: boolean): void {
  if (soundsEnabled === enabled) return
  soundsEnabled = enabled
  for (const s of soundsEnabledSubs) {
    try {
      s()
    } catch {
      // A subscriber throwing must not break others.
    }
  }
}

/** Current value of the toggle. Stable identity, safe for snapshots. */
export function getSoundsEnabled(): boolean {
  return soundsEnabled
}

/** Subscribe to changes for use with `useSyncExternalStore`. */
export function subscribeSoundsEnabled(listener: () => void): () => void {
  soundsEnabledSubs.add(listener)
  return () => soundsEnabledSubs.delete(listener)
}

/**
 * Play a sound only when the user hasn't opted out. Use this from
 * call sites (mutation callbacks, etc.) that can't easily call the
 * `useSounds()` hook themselves.
 */
export function playSoundIfEnabled(name: SoundName): void {
  if (!soundsEnabled) return
  playSound(name)
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  type CtxCtor = typeof AudioContext
  const w = window as unknown as {
    AudioContext?: CtxCtor
    webkitAudioContext?: CtxCtor
  }
  const Ctor = w.AudioContext ?? w.webkitAudioContext
  if (!Ctor) return null
  if (!sharedCtx) {
    try {
      sharedCtx = new Ctor()
    } catch {
      return null
    }
  }
  // Browsers suspend the context until a user gesture; a `resume()`
  // call from inside a tap/click handler is enough to wake it up.
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume().catch(() => {
      // No-op: failure to resume just means audio stays silent.
    })
  }
  return sharedCtx
}

/**
 * Play one of the named sounds. Safe to call from anywhere — if the
 * environment can't produce audio (SSR, jsdom, missing Web Audio,
 * autoplay still blocked) it silently does nothing.
 *
 * Prefer the `useSounds()` hook over calling this directly so the
 * user preference is honoured.
 */
export function playSound(name: SoundName): void {
  const ctx = getContext()
  if (!ctx) return

  const steps = SOUNDS[name]
  const now = ctx.currentTime

  for (const step of steps) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = step.type ?? 'sine'
    osc.frequency.value = step.freq

    // Tiny attack-decay envelope. Starting at near-zero avoids the
    // characteristic "click" you get from connecting an oscillator
    // straight to a non-zero gain value.
    const start = now + step.startAt
    const peakAt = start + Math.min(0.015, step.duration * 0.3)
    const end = start + step.duration
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(step.peak, peakAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(end + 0.02)
  }
}

/**
 * Test-only reset hook. Resets the shared `AudioContext` so unit
 * tests can mock `window.AudioContext` cleanly between runs.
 *
 * @internal
 */
export function _resetAudioContextForTests(): void {
  sharedCtx = null
}

/** Exposed for tests to assert against the registry. */
export function listSoundNames(): readonly SoundName[] {
  return Object.keys(SOUNDS) as SoundName[]
}
