# DR-018: Mobile viewport and zoom policy

- **Status:** Active
- **Decided:** 2026-09
- **Theme:** mobile-viewport-and-zoom
- **Supersedes:** — (first DR on this theme)

## Context

A user reported that on iOS the login screen "lets you pinch zoom", and
that after logging in they **couldn't zoom back out** until they wandered
to the settings tab. Investigating exposed two separate mechanisms that
were interacting badly:

1. **iOS Safari's input auto-zoom.** Safari (browser tabs *and*
   home-screen PWAs) automatically zooms the whole viewport when a form
   control whose computed font-size is **below 16px** receives focus, so
   the text is legible while typing. This zoom is *not* undone when the
   keyboard closes. Our login inputs used Tailwind's `text-sm` (14px), so
   simply tapping the email field zoomed the page — no pinch required.
   Crucially, Safari **ignores** `user-scalable=no` and `maximum-scale=1`
   in the viewport meta (a deliberate accessibility decision by Apple
   since iOS 10), so no meta-tag incantation prevents this. Only ≥16px
   form controls do.
2. **A JavaScript zoom trap.** `index.html` registered
   `gesturestart`/`gesturechange`/`gestureend` handlers that called
   `preventDefault()` to stop pinch-zooming distorting the sticky header.
   These events fire only on iOS/WebKit. The combination was the bug:
   Safari auto-zoomed in on input focus (mechanism 1), then the gesture
   blockers stopped the user pinching back out — they were stuck zoomed-in
   until some navigation happened to reflow/reset the visual viewport.

So the "weird" behaviour wasn't Safari being buggy; it was our own
half-disabled zoom: the door in (auto-zoom) was open while the door out
(pinch) was bolted shut.

## Decision

**Never disable or trap zoom. Remove the *causes* of unwanted zoom
instead.** Concretely:

1. **Every form control renders at ≥16px** (`text-base`). With no sub-16px
   field anywhere, iOS Safari never auto-zooms — the root cause is gone,
   permanently. A base-layer rule in `src/index.css` sets
   `input, textarea, select { font-size: 1rem }` as a safety net for any
   control that forgets an explicit size. **Never apply `text-sm`/`text-xs`
   (or any sub-16px size) to an input, textarea or select.**
2. **No JavaScript gesture blocking.** The `gesture*` `preventDefault`
   script is removed. Pinch-zoom works — and, more importantly, pinch
   *un*-zoom always works.
3. **The viewport meta stays permissive:**
   `width=device-width, initial-scale=1.0, viewport-fit=cover`. No
   `user-scalable=no`, no `maximum-scale` — they are accessibility
   regressions on Android/desktop and no-ops on iOS.
4. **`touch-action: manipulation` on `html, body`** stays: it removes
   double-tap-to-zoom (and the legacy 300ms tap delay) without touching
   pinch-zoom — the standards-based way to tame *accidental* zoom.
5. **BDD regression guards** in
   `tests/integration/features/layout/mobile-viewport.feature` assert that
   the viewport meta allows scaling, every form field's computed
   font-size is ≥16px, and no `gesture*` blocking script ships. CI fails
   if any future change reintroduces the bug.

## Alternatives considered

- **`user-scalable=no` / `maximum-scale=1` in the viewport meta** —
  rejected: ignored by iOS Safari (so it wouldn't even work), honoured by
  Android Chrome/Firefox where it blocks low-vision users from zooming.
  WCAG 1.4.4 failure.
- **Keep the `gesture*` `preventDefault` handlers** — rejected: this was
  the trap. It blocks the *cure* (pinch out) while doing nothing about the
  *cause* (input auto-zoom fires before any gesture event).
- **`font-size: 16px` only while focused** (the old `:focus` hack) —
  rejected: fragile, causes layout jump on focus, and Safari has been
  known to measure the pre-focus size.
- **Rely on PWA standalone mode suppressing zoom** — rejected: behaviour
  varies by iOS version, and most users (and Lighthouse/BDD) hit the app
  in a normal tab.

## Consequences

- Form controls are visually slightly larger (14px → 16px). That is
  fine — 16px inputs are the iOS/Android design-guideline default anyway.
- Users *can* pinch-zoom everywhere. That is a feature (accessibility),
  not a bug; the sticky-header distortion it once caused is cosmetic and
  transient, whereas being trapped zoomed-in was functional breakage.
- Any future field must use `text-base` (or larger). The base-layer CSS
  guard plus the BDD scenario make regressions fail CI rather than ship.
- Future UI work must consult this DR before touching the viewport meta,
  `touch-action`, or form-control font sizes.
