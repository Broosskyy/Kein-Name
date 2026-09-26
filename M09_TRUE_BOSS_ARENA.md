# M09 — True 360° Boss Arena

## Outcome

M09 changes the combat space from a camera-assisted screen composition into a large planar world. Gameplay entities remain deterministic world-space state; rendering and client camera preference never change combat math.

## Architecture

- `BossWorldEntity`: position, orientation, 520×360 elliptical no-walk footprint, slow target tracking, relative angle, front/flank/rear and near/mid/far classification.
- `PlayerMovementController`: analog magnitude/dead zone, target velocity, acceleration, deceleration, turn acceleration and a 210 ms timed dash.
- `ArenaCamera`: follow/look/boss-focus/tactical modes, manual world offset, drag/pinch input, smooth reset, dead zone, look-ahead, zoom smoothing, bounds and additive shake.
- `CreatureLocomotion`: stride/bound rhythm, directional lean, acceleration stretch, brake/landing compression, shadow response and dust triggers.
- `ArenaRunModel`: orchestrates the new controllers and persists only stable domain state. Render transients and camera shake are excluded.
- `ArenaLayer`: cached 5600×4000 floor, eight visual regions, fourteen landmarks, world telegraphs, bounded aftermath, physical loot, pet and DEV dummies.
- `BossWorldPresentation`: projects the boss from its real world position. It is no longer top-center pinned and can be partially or fully off-screen.

## Tuned parameters

| System | M09 value |
|---|---:|
| Arena | 5600×4000 |
| Play bounds | x 180–5420, y 180–3820 |
| Boss anchor | 2800,1900 |
| Boss footprint | radius 520×360 + 46 player padding |
| Near / Mid / Far | <900 / <1800 / ≥1800 |
| Player max speed | 720 world units/s |
| Acceleration | 4200 world units/s² |
| Deceleration | 6100 world units/s² |
| Turn acceleration | 7600 world units/s² |
| Dash | 2500 units/s for 210 ms |
| Camera zoom | 0.62–1.38; default 0.92 |

## Camera input

- Mobile: drag unoccupied canvas space for LOOK, pinch for zoom, double-tap for smooth follow reset.
- Desktop: mouse drag for LOOK, wheel for zoom, keyboard movement and Space dash.
- LOOK has temporary priority. FOLLOW uses a soft dead zone and velocity look-ahead. The boss is never forced into view.
- Zoom is saved as a local presentation preference and does not alter coordinates, ranges, movement, collision, AI, damage or loot math.

## Spatial combat

The scheduler uses boss-relative sector, distance, phase, cycle, recent attack history and player velocity. M09 adds Arm Sweep, Rear Slam and Radial Shockwave to the existing Slam, Beam, Debris, Cone, Ring, Shockwave and Moving Hazard set. Cone and line telegraphs now render as filled directional ground projections with countdown stripes rather than single debug-width lines.

## Arena and depth

Eight coherent regions cover central boss, frontal field, both flanks, rear risk, ruins, crystal pocket and ember corridor. Large landmarks and floor transitions provide travel reference. Boss/player depth ordering changes when the player crosses behind/in front of the boss. Loot, pet, dummies, telegraphs and projectiles remain world-relative.

## Visual/HUD changes

- Creature gameplay scale is restored to a readable 0.43–0.48 range on common portrait widths; hero/reveal scale remains separate.
- Movement includes ground contact, directional lean, braking compression and dash stretch.
- Boss is projected at a large world footprint and gains real lateral/distance separation.
- Permanent zoom buttons are hidden; pinch/wheel remains.
- Mutation HUD displays acquired icons only.
- AssetManifest adds aligned unstable core/fragment, floor/landmark, loot-ready and VFX slots with safe procedural fallback.

## Performance

Static floor/landmarks are cached Graphics content; transient arrays remain bounded (loot 28, decals 24, projectiles/effects by quality config). World visibility culls loot, pet and dummy presentation. LOW and Reduced Effects only reduce presentation. No texture is created per frame.

## Validation

- TypeScript, complete Vitest suite and production build are mandatory release gates.
- Preview smoke verifies HTML and bundled module delivery.
- Physical Android touch/GPU validation is still required for camera gestures, multi-touch movement + Power Hit/Dash, frame pacing and final visual comparison with the master mockup.

## Known risks

- Procedural creature and boss art remain below true production hero-asset quality.
- Static environment is a small production-like fallback set, not final painted art.
- Free-camera gestures need physical Android browser QA against navigation gestures and device-specific pointer behavior.
- Dynamic ordering handles the critical boss/player crossing; a future production pass may split every large prop into independently sorted objects.

## Production asset gaps

Highest priorities remain one aligned Harvest Colossus master/stage set, one Base Creature master with modular mutations, then large landmark/floor masters. See `PRODUCTION_ASSET_SPEC.md`; missing assets never block gameplay.
