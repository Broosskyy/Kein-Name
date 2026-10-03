# Harvest Colossus Gameplay Recovery Pass 01

## Real-device evidence

The 41.8 second Android browser recording supplied on 2026-10-03 failed the gameplay-feel gate. The camera collapsed from a readable combat view into an extreme Hero close-up around 2.5 seconds and repeated the behaviour later in the run. Movement also became counter-intuitive after yaw changes and the directional cutout changed too often during automatic attacks.

## Root causes

- `HybridCameraObstruction.resolve()` could report a distance as low as 3.8m.
- `HybridCameraController` previously copied that value into `actualCameraDistance`, overriding the visible user framing while leaving `userZoomDistance` unchanged.
- FOLLOW blended the camera target 8% towards the Boss after manual control expired.
- Joystick/WASD input remained aligned to fixed simulation axes after the local camera yaw changed.
- Every normal automatic attack held a directional attack cutout for 520ms and aimed that cutout at the Boss, causing repeated run/attack/direction popping.
- The legacy 2.5D fallback still used combat events to alter zoom.

## Recovery changes

- User zoom is now the only visible camera distance in the hybrid and fallback renderers.
- Obstruction detection remains active for DEV metrics and near-occluder fading, but never retracts the camera.
- FOLLOW has no automatic Boss target bias. Boss Focus and Tactical remain explicit modes.
- Movement input is transformed through local camera yaw before entering the planar movement controller.
- A two-finger pinch can no longer be misread as a double-tap camera reset.
- Moving attacks preserve locomotion facing; normal attack pose time is reduced to 160ms.
- Procedural cutout deformation is restrained to reduce visible wobble.
- Default framing is wider, the Boss visual is slightly smaller, and ground/background exposure is raised.
- The unprojected fixed screen-space target reticle is hidden from normal combat.

## Architecture safety

Simulation positions, combat values, collision, projectiles and Boss state remain renderer-independent. Camera-relative input is converted once at the local-client boundary; camera state is not stored in authoritative simulation state.

## Remaining limitation

The current Hero and Colossus are still directional 2D cutouts inside a 3D world. The 32 Evo-1 files provide one authored key pose per direction/state, not true hand-authored locomotion frame sequences. This pass removes the most disruptive camera and control failures; it does not claim that the hybrid character presentation is final production animation.

## Validation gate

Source checks and automated tests must pass before push. Final gameplay-feel status remains pending until a new physical Android recording confirms stable distance, camera-relative movement and readable composition.
