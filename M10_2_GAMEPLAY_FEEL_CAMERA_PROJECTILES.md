# M10.2 — Gameplay Feel, Camera, Grounding and Projectiles

## Scope and outcome

M10.2 keeps the M10.1 Three.js/PixiJS hybrid architecture and the M09.3 fallback. It fixes the real-device QA issues in the isolated 2200×2200 spatial slice without adding progression, content, networking or product systems. Simulation remains authoritative; Three.js and the local camera only consume world state.

## Camera

`HybridCameraController` now owns desired and damped yaw, pitch, distance and manual target offset. Free-world one-finger drag uses horizontal movement for yaw and vertical movement for real perspective pitch. Pitch clamps to 28–68 degrees. Shift/middle drag retains explicit X/Z pan, pinch and wheel retain dolly, `R` smoothly requests the default FOLLOW yaw/pitch/offset, and `T` requests TACTICAL.

Manual camera input immediately removes Boss bias for 2.6 seconds. LOOK mode remains independent instead of snapping back; explicit FOLLOW gradually restores its restrained 0.08 bias. BOSS FOCUS and TACTICAL remain opt-in. Camera state never writes Hero, Boss, loot, telegraph or projectile coordinates.

Mobile pointer capture is established on the world surface. The second pinch pointer establishes a fresh baseline to prevent the initial camera jump. Joystick and combat controls are separate siblings and continue to own only their pointer streams.

## Hero grounding and flicker fix

`HybridGroundSampler` mirrors every walkable surface in the slice: base terrain, approach blocks, paving corridor, Colossus basin, inner basin and side shelves. `HeroGrounding` resolves visual Y as sampled ground plus a 0.035 m foot clearance and non-negative locomotion cadence. The contact shadow uses the same sampled ground with a small depth epsilon.

The 32 directional WebP frames contain different transparent bottom padding. `HeroFootAnchors` records alpha-derived baselines for every direction/pose, so the lowest visible foot stays on the world-space anchor during texture changes instead of sinking or floating.

`HeroVisualState` fixes state flicker through:

- run entry/exit hysteresis (34/18 simulation units per second);
- low-speed last-facing retention;
- octant angular hysteresis and a 90 ms direction lock;
- texture changes only when direction/pose actually changes and the preloaded texture is ready;
- F3 counters for direction, pose and texture changes per second.

## Projectile combat and damage timing

`PlayerProjectileSystem` is renderer-independent and deterministic. Normal and Power Hit attacks launch from Hero world coordinates, travel on X/Z with a visual height arc, collide with the Boss footprint and emit one impact. Only that impact calls `CombatModel.attack`, so HP, breakpoints, mutation choices and defeat now align with visible causality. A pending Power projectile prevents duplicate launches before its cooldown begins at impact.

`HybridProjectileRenderer` pools Three.js groups, shares geometry/materials and renders readable cyan normal bolts, heavier orange Power cores, world-space trails and short impact bursts. It creates no materials or geometry per render frame. F3 exposes active and pooled projectile counts.

## Boss visual handling

The Colossus remains a hybrid temporary solution. A world-oriented low-poly stone body now establishes mass, front, flank and rear. The existing production front artwork is fully shown only from the front sector, heavily reduced at a flank and hidden from the rear. The Boss retains world position, orientation, footprint and collision; it is not camera-authoritative. Projectile impacts pulse the physical body and briefly tint the front art.

This is deliberately honest rather than invented rear production art. The low-poly body is temporary until a multi-angle impostor or real 3D Colossus is supplied.

## World scale and lighting

`WorldScaleGuidelines` centralizes the presentation range: Hero 2.35 m, pillars 2.6–4.8 m, arches 4.1–5.4 m, Boss proxy 6.7 m, crystals 0.8–2.7 m and rocks 0.55–2.2 m. Oversized crystals/corruption were reduced. Per-prop crystal/corruption point lights were removed; the slice retains hemisphere, one shadowed directional light and the Boss core light.

## Performance

- pooled projectile and impact objects;
- shared geometry/materials and reusable temporary vectors;
- all 32 Hero textures preloaded and cached;
- texture swaps gated by stable state and readiness;
- capped renderer pixel ratio (1.7), one 1024 shadow map, fog/frustum culling;
- no post-processing, physics engine or per-frame texture/material creation.

The largest Android risks remain transparent Hero/Boss overdraw, the one real-time shadow map, low-end GPU fill rate at high device pixel ratio and the current front-art/3D-proxy transition at flank angles.

## Web-first and future crossplay

The browser runtime remains the master client. A later Android/iOS shell can use Capacitor without forking gameplay. Future crossplay should replicate the same server-authoritative X/Z entity and projectile state; camera/yaw/pitch remain strictly local and are never synchronized as gameplay truth.

## Automated validation

M10.2 adds focused coverage for pitch/yaw/clamps, manual Boss-bias suspension, camera/simulation independence, base/basin/platform/shelf height sampling, Hero foot baseline, movement/direction hysteresis, projectile spawn/travel/single impact, normal-vs-Power distinction and camera-independent projectile state. Existing M06–M10.1 coverage remains intact.

Final exact command results, bundle sizes and remote commit are recorded in the completion report after the pushed commit.

## Known limitations

- The Colossus is not a final 360-degree asset or rigged 3D character.
- Terrain height is deterministic authored surface zones, not a general mesh raycast/heightfield.
- Projectiles target the Boss position at launch and do not yet lead a moving target.
- Browser runtime captures require an available automated Chromium runtime; physical Android validation remains pending.
