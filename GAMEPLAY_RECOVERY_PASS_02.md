# Harvest Colossus Gameplay Recovery Pass 02

## Real-device evidence

The supplied 41.8 second Android recording (`200800.mp4`) confirms that the
automatic close-zoom regression from Pass 01 is gone and the Boss clear / Round
2 loop works. It also exposes three remaining control failures: camera gestures
do not reliably begin over the right side, vertical look reaches the old pitch
limits too quickly, and the fullscreen button leaves the browser chrome visible.
The recording also shows the Boss contact shadow as a large black platform.

## Root causes

- Camera pointers were registered only on `#game-canvas`, while interactive and
  transparent HUD descendants occupy parts of the right side.
- `.bottom-hud > *` enabled pointer events on complete wrapper rectangles rather
  than only on the visible controls.
- Pitch was hard-clamped to 28–68 degrees.
- Slow drags measured movement against only the previous pointer event and could
  still be classified as a double tap, resetting the camera.
- Fullscreen used only the unprefixed API, was invoked on `click`, and silently
  returned false/rejected without user feedback.
- The Boss used a 3.5m, 56% opaque black contact disc on top of a very dark basin.

## Recovery changes

- Camera input is captured across `#game-shell`; actual buttons, inputs and modal
  surfaces remain explicit blockers.
- Empty HUD wrapper space no longer intercepts world gestures.
- Pitch now spans 16–78 degrees and large browser pointer jumps are bounded.
- Tap detection uses the complete gesture displacement and ignores cancelled
  gestures, preventing slow swipes from triggering camera reset.
- Releasing one finger after a pinch no longer converts the remaining finger
  into an unintended orbit jump; a fresh touch starts the next look gesture.
- Fullscreen is requested on `pointerdown`, targets the game shell, requests
  hidden browser navigation, supports WebKit-prefixed mobile APIs, retries the
  standard call without options, and reports rejection in the HUD.
- The oversized Boss shadow is replaced by a smaller restrained contact shadow;
  basin materials are lifted so the Boss no longer appears behind a black slab.

## Validation status

Automated source validation does not replace another physical Android test.
Camera freedom, right-side touch behaviour and browser fullscreen must be checked
again on the same device/browser after deployment.
