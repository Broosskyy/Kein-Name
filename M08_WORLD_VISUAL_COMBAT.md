# M08 World, Visual & Combat Convergence

## Visual audit and decisions

| Layer | M07 finding from Android recording | M08 action |
|---|---|---|
| Boss | Huge but poster-like and screen-fixed | **Redesign:** hybrid world anchor, distance/lateral/zoom pose, world shadow, stronger silhouette and cycle instability |
| Floor | Flat dark/debug-plane read | **Replace placeholder:** six blended ground regions, large stone courses, cracks, scorch/corruption aftermath |
| Geography | World size existed without memorable travel | **Redesign:** ten large crystal, pillar, root, statue and fissure landmarks with culling and break reactions |
| Player | Oversized and lightly grounded | **Polish:** ~22% smaller render baseline, directional lean, movement cadence, dust and reactive contact shadow |
| Telegraphs | Prototype rings | **Redesign:** filled warning/imminent/impact hierarchy, countdown edges and family-specific color/shape |
| Loot | Functional debug-like objects | **Polish:** silhouettes, contact shadows, bounce, rarity beams/pulses and risk-weighted landing areas |
| HUD | Permanent four-label mutation strip dominated combat | **Simplify:** only acquired mutation icons remain; zoom utility fades when idle |
| Projectiles/choices | Mechanically clear | **Keep + polish:** existing material families and compact choice flow retained |

## World and camera

Gameplay remains in a 3200×1800 coordinate space. Six overlapping regions provide continuous geography rather than disconnected biomes: Core Approach, Shattered Ground, Crystal Field, Ruined Pillars, Corrupted Edge and Ember Zone. `ArenaRegionAt` provides deterministic region lookup for presentation and later hazards.

`ArenaCamera` now uses a taller portrait viewport (63.5% of the screen), broader landscape viewport, stronger travel reveal, movement look-ahead and a controlled boss bias. Zoom is continuous from 0.68 tactical to 1.30 action view. It changes presentation only.

The Harvest Colossus uses `BossWorldPresentation`: its world anchor is `(1600,170)`, while a special giant-screen pose preserves scale. Camera lateral travel, player distance and zoom alter its on-screen position and scale. A 390-unit boss zone keeps players outside boss geometry.

## Environment, lighting and depth

`ArenaLayer` owns a masked camera-transformed world root. Static floor/landmark geometry is built only when theme, cycle or break state changes. Per-frame work is bounded to visible loot/dummies, telegraphs, boss presence and at most 24 aftermath decals. World visibility culling prevents off-camera props/entities from being presented.

Large forms establish depth: boss mass shadow, landmark contact shadows, layered stone courses, local region accents and a screen-space atmospheric layer. LOW reduces props/atmosphere; Reduced Effects lowers atmosphere and movement dust without changing gameplay.

Boss impacts can break nearby landmarks and leave attack-specific history: slam cracks, beam scorch or corruption patches. Cycle 2 shifts the arena toward damaged/corrupted tones; Cycle 3 increases instability, fissure light and boss rim/core energy.

## Combat presentation

Attack scheduling remains deterministic, rejects the two most recent families where possible, respects phase/cycle and now considers boss distance. Close range unlocks shockwave pressure; far range adds beam pressure. Recovery cadence prevents constant attack stacking.

Telegraphs follow `WARNING → IMMINENT → IMPACT → AFTERMATH`. Circle, ring, line and cone threats remain world-space at every zoom. Breakpoints create permanent arena damage in addition to boss armor changes. Boss-kill loot uses physical trajectories; rare/epic drops land closer to the boss to create risk/reward movement.

The gameplay avatar remains independent from hero/reveal scale. Movement adds lean, faster grounded cadence, shadow deformation and bounded dust. Mutations/evolutions and visible run-upgrade orbitals continue to layer over the same character identity.

## HUD and controls

Top HUD retains boss identity/HP/breakpoints/cycle. Bottom remains joystick left, Power Hit center/right and Dash right. The four inactive mutation labels no longer occupy combat: only acquired material icons appear. Mobile pinch, desktop wheel and `−/+` remain supported; fullscreen still recalculates camera/layout.

DEV adds region teleports, near/medium/far boss presets, action/standard/tactical zoom and direct Cycle 1/2/3 selection. Dummies remain explicitly local visual test entities.

## Save, Halloween and compatibility

M07 run snapshots remain readable. Schema/client config advances to M08, but no ephemeral camera shake, particles, decals or lights are persisted. Saved zoom/quality/reduced-effects remain presentation preferences. Halloween uses the same world renderer with harvest ground, roots, embers, event loot colors and cycle corruption; no duplicated combat renderer exists.

## Performance strategy

- Static environment paths are cached until a meaningful state change.
- Loot, dummies, particles, projectiles and decals retain hard caps.
- Visibility culling applies to world pickups, pet and dummies.
- No texture is created per frame.
- Quality changes affect density/presentation only, never combat, loot math or event rewards.

## Remaining production asset gaps

Highest-value future replacements remain one aligned Harvest Colossus stage set, the Base Creature master, large landmark masters, loot rarity masters and Ember Wisp master. Procedural fallbacks intentionally remain coherent and crash-safe. Physical Android GPU/touch/thermal/contrast validation is required after deployment.
