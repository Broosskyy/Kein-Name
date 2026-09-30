# M10.4 — Core Gameplay Stability

## Scope

M10.4 keeps the M10.3 Three.js/Pixi hybrid architecture and addresses the real-device QA failures around ground contact, camera zoom ownership, the missing Boss round loop, and static directional Hero poses. No progression, account, networking, shop, currency, map, or engine expansion was introduced.

## Grounding and collision

- `HybridGroundSampler` is the single authored height source for base ground, lower approach, approach transition/platform, paving slabs, Boss basin, inner basin, and four shelves.
- Each sample includes a stable `surfaceId` and exact top-face height matching the geometry in `HybridWorldRenderer`.
- `HybridWalkableSurfaceSystem` combines this surface truth with deterministic arena/prop collision for movement.
- `HeroGroundingController` exposes `surfaceId`, `groundHeight`, and final `renderY`; upward transitions snap safely while downward transitions settle smoothly.
- Major rocks, pillars, walls, crystals, boundaries, and the living Boss footprint remain blocking. Decorative details remain non-blocking.
- F3 reports surface ID, sampled height, Hero render Y, foot anchor, and collision state.

## Manual camera zoom

The camera now maintains three explicit values:

- `userZoomDistance`: changed only by slider, pinch, wheel, proof preset, or explicit user API.
- `collisionLimitedDistance`: temporary obstruction result.
- `actualCameraDistance`: `min(smoothed user distance, collision-limited distance)`.

FOLLOW, BOSS FOCUS, pitch, movement, Hero facing, and Boss proximity never rewrite the user's zoom preference. When an obstruction clears, collision distance smoothly returns to the exact user target. The preference is stored for the browser session.

Mobile now uses one compact right-edge zoom button. It expands a vertical `+ / −` slider, synchronizes with pinch/wheel input, and collapses after inactivity. The previous permanent `+ / −` pair remains removed.

## Boss death and round loop

`BossEncounterLoop` owns the presentation-independent lifecycle:

`ALIVE → DEFEATED → DEATH_SEQUENCE → LOOT_PHASE → CLEAR_DELAY → RESPAWN → ALIVE`

- Defeat triggers once.
- Boss attacks stop immediately and active telegraphs are reset.
- Player projectiles are cleared.
- Boss collision is disabled during the clear sequence.
- The Boss artwork dims, compresses, and disappears as the core collapses.
- Epic/rare physical loot spawns once after the death sequence.
- The Hero remains controllable during the four-second clear window.
- Respawn resets position, orientation, scheduler, projectiles, telegraphs, HP, and temporary attack presentation.
- `bossRoundIndex` and `bossLevel` increment; HP scales by 32% per additional level.
- HUD and F3 expose round, level, state, and HP.

## Animated 8-direction Hero foundation

The direction count remains exactly eight: N, NE, E, SE, S, SW, W, NW.

`HeroAnimationController` and `HERO_ANIMATION_CLIPS` now describe timed multi-frame clips with stable pivot, foot anchor, scale, FPS, looping, frame index, and elapsed time:

| State | Runtime frames per direction | FPS | Loop |
|---|---:|---:|---|
| Idle | 4 | 4 | yes |
| Run | 8 | 12 | yes |
| Attack | 6 | 11 | no |
| Dash | 4 | 15 | no |

All 32 current production cutouts are preloaded and remain the authored key poses. M10.4 reuses those key poses across timed runtime frames with restrained transform animation; it does **not** claim 176 separately painted production frames. The clip/manifest/renderer architecture now supports replacing each runtime entry with unique production art without gameplay changes. Run gait phase is preserved across direction changes, while pose changes reset deliberately.

Existing M10.3 direction hysteresis, minimum hold time, attack facing lock, and idle/run hysteresis remain active.

## Hero asset audit

`scripts/audit-hero-animation.mjs` writes `production-assets/audit/hero-animation-audit.json` without altering source art. It verifies all 32 files and records:

- dimensions and alpha presence
- alpha and opaque bounds
- foot baseline
- left/right/top/bottom padding
- visual center
- direction/state assignment
- anomalies for canvas size, crop, centering, footline, and alpha

Current result: 32/32 present on 384×384 transparent canvases, zero flagged anomalies. Existing normalized M10.3 assets were retained; no unnecessary regeneration was performed.

## Boss and combat presentation

- The single M10.3 directional Boss render path remains; the DEV proxy stays debug-only.
- Eight camera-relative Boss views remain active with stable scale and footline.
- Defeat presentation is applied to the one active Boss sprite, avoiding a duplicate model.
- Normal and Power projectiles received larger cores, higher flight lines, longer trails, and stronger impact expansion.
- Existing localized tint/recoil and restrained Power camera impulse remain tied to projectile impact timing.

## Debug data

F3 shows:

- camera mode, user/collision/actual distance, pitch, yaw, target bias
- Hero world position, surface ID, ground height, render Y, anchor, direction/pose/texture swap rates, animation frame
- Boss sector, state, round, level, HP
- active projectiles/pool and renderer metrics
- collision and obstruction state

## Validation

- `npm ci`: PASS — 86 packages installed.
- `npx tsc -b --pretty false`: PASS — zero TypeScript errors.
- `npm test -- --run`: PASS — 171/171 tests in 19 files.
- `npm run build`: PASS — Vite 7.3.6, 792 modules.
- Main bundle: 1,054.62 kB minified / 295.00 kB gzip.
- `dist`: 5,785,106 bytes.
- Runtime assets: 4,407,658 bytes.
- `npm run assets:audit:hero`: PASS — 32/32 assets, zero audit flags.
- Asset-manifest check: PASS — zero missing assets.
- Zero-byte check: PASS — zero files.
- Preview HTTP smoke: PASS — index and production JS returned HTTP 200; zoom controls were present in served markup.
- Runtime visual capture: PENDING — the available environment did not contain a browser executable or `agent-browser`.
- Physical Android/iOS validation: PENDING.

## Known limitations

- The 176 runtime animation entries currently reuse 32 authored directional key-pose textures with per-frame motion metadata. Unique painted frames remain a later production-art task.
- The Harvest Colossus remains an eight-view 2D impostor, not a rigged 3D model.
- Terrain height is authored as deterministic surface zones rather than a general physics heightfield.
- The death collapse is a restrained hybrid sprite treatment, not skeletal 3D animation.
- Physical Android and iOS validation remain pending until recordings from actual devices are reviewed.

## Web-first / future crossplay

The browser remains the master runtime. A future Capacitor-style Android/iOS wrapper can use the same gameplay core. Camera, zoom, and rendering stay local presentation state; world positions, movement, Boss state, projectile state, combat timing, and the round lifecycle remain renderer-independent and can later be replicated by a shared server without forking the game.
