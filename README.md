# Harvest Colossus — Harvest Haven World Foundation

> **New product direction:** Harvest Colossus is planned as an original, browser-first social action MMORPG with NosTale-like structural parity, modern direct combat, a free 3D camera and reduced mobile-first UI. The existing boss arena becomes the first Raid foundation. See [`HARVEST_COLOSSUS_NOSTALE_PARITY_MASTER_PLAN.md`](HARVEST_COLOSSUS_NOSTALE_PARITY_MASTER_PLAN.md).

Browser-first hybrid Three.js + PixiJS social action RPG foundation. The default route now opens **Harvest Haven**, a continuous town and Southfields slice with buildings, NPC positions, farm monsters, Hero/Job progression, quests and a physical portal into the existing Harvest Colossus raid. The raid remains available with `?map=raid`; the complete M09.3 2D renderer remains available with `?renderer=2d`.

See [`M11_HARVEST_HAVEN_WORLD_FOUNDATION.md`](M11_HARVEST_HAVEN_WORLD_FOUNDATION.md) for the new world loop and [`HARVEST_COLOSSUS_NOSTALE_PARITY_MASTER_PLAN.md`](HARVEST_COLOSSUS_NOSTALE_PARITY_MASTER_PLAN.md) for the long-term original-IP social action MMORPG direction.

The current recovery pass addresses the second real-device recording without replacing the M10 hybrid architecture: camera gestures cover both screen halves, pitch has a substantially wider safe range, slow swipes cannot become reset taps, fullscreen has mobile fallbacks and visible failure feedback, and the Boss basin no longer reads as a black foreground slab. See `GAMEPLAY_RECOVERY_PASS_02.md`; Pass 01 remains documented in `GAMEPLAY_RECOVERY_PASS_01.md`. The reusable Harvest UI foundation remains documented in `HARVEST_UI_FOUNDATION_PASS_01.md`.

## Start and validate

```bash
npm install
npm run assets:extract
npm run qa:world
npm run dev
npx tsc -b
npm test
npm run build
npm run preview
```

Use the default URL for Harvest Haven. Append `?map=raid` for the Hybrid-3D Harvest Colossus raid, `?renderer=2d` for the intact M09.3 renderer, or `?debug3d=1` / `F3` for spatial metrics.

Append `?ui=hub` for the responsive meta-hub entry view or `?ui=preview` in a DEV build for the complete UI/Hero QA catalog.

## Controls

- Mobile: camera-relative 360° joystick + **POWER HIT** + **DASH**; drag open battlefield space to look, pinch or use the fold-out right-edge slider to set the user-owned zoom, double-tap to reset follow.
- Desktop: WASD/arrows, Space to dash, E/F for Power Hit, mouse drag to pan, mouse wheel to dolly, R to reset Follow, T for Tactical and F3 for 3D debug.
- Fullscreen is optional and only requested from its explicit button.
- Mutation and level-up choices pause active time and danger timing.
- `D`, backtick or `?debug=1` opens DEV controls for attacks, loot, XP, cycles, dummies, quality and state.

## Implemented M09 scope

- Eight connected combat regions across a 5600×4000 arena with large landmarks, cached floor detail, break reactions and bounded aftermath
- A real boss entity at (2800,1900), an elliptical 520×360 footprint, orientation, slow tracking and near/mid/far plus front/flank/rear classification
- Fully world-projected giant boss presentation: lateral travel is real, depth changes around the boss and the Colossus can leave the viewport
- Free camera look offset, soft follow/dead-zone/look-ahead, smooth reset, additive shake and clamped 0.62–1.38 saved zoom
- Acceleration/deceleration-based analog X/Y movement, normalized diagonals, responsive turning and a timed invulnerable dash
- Code-driven locomotion with stride, lean, acceleration stretch, braking/landing compression, contact-shadow response and bounded dust
- One real local player; bounded DEV-only dummy allies are explicitly non-network entities
- Position-aware, repetition-resistant Ground Slam, Beam, Debris, Cone, Ring, Shockwave, Moving Hazard, Arm Sweep, Rear Slam and Radial Shockwave vocabulary
- Player HP, mitigation, brief invulnerability, failure and retry
- Physical bounded loot with boss-origin arcs, bounce, contact shadows, rarity silhouettes/beams, risk-weighted landings and world-space Ember Wisp pickup
- Run XP, levels and 11 data-driven upgrades across attack, defense, movement, utility and synergy
- Visible projectile scale/count and orbiting power-growth presentation
- Three finite cycles with presentation escalation: persistent damage, corruption, lighting/core instability and attack-pool differences
- Contextual combat HUD showing only acquired mutation identities; no permanent four-label strip
- Lightweight run inventory, representative equipment/pet/cosmetic boundaries
- Versioned local guest progress, autosave and resumable Solo/Event state at a clean combat boundary
- Solo/Event run modes plus contract-only Group/Country/World definitions
- JSON-safe future entity/contribution contracts; no transport
- Browser Fullscreen API wrapper with graceful fallback
- M04 Halloween systems and M05 AssetManifest V2 retained

## M09.2 production-art convergence

- Eight coherent transparent production masters under `production-assets/source/`, generated as kits rather than unrelated one-off props
- 44 optimized individual WebP runtime assets extracted by `scripts/extract-production-kits.sh`
- A readable cream/charcoal Base Creature with blue eyes; locomotion, collision and mutation logic remain code-driven
- An authored 22-prop arena composition plus 16 ground-detail placements across ruin, crystal and corruption sectors
- Footpoint-based depth/occlusion, cheap prop shadows, camera culling and quality-aware detail density
- Distinct Common/Rare/Epic loot silhouettes, an Ember Wisp master and production projectile bodies
- Four aligned Harvest Colossus states from one master sheet: Base, Break I, Break II and Core Unstable
- Every production slot retains a safe procedural fallback and failed loads never affect gameplay
- Compact, shorter announcements keep mobile combat space visible

## M09.2.1 real-map integration

- A data-driven continuous Harvest Arena now owns dimensions, spawns, regions, authored props, decals, major collisions, loot areas and camera hints.
- The Hero uses two coherent directional master kits: eight real directions with Idle/contact, Run, Dash and Attack poses. It no longer remains permanently front-facing or reuses a generic run pose for every action.
- Simulation coordinates are explicitly separated from renderer transforms; gameplay never reads camera zoom or screen coordinates.
- LOOK is a true absolute world-space camera target with substantial X/Y/diagonal inspection, smooth FOLLOW return, optional BOSS FOCUS and TACTICAL framing.
- Normal portrait framing shows a meaningful subsection of the map; user zoom remains local presentation only.
- A compact minimap derives Hero, boss and DEV ally markers from world coordinates.
- Major ruins/crystals have cheap deterministic collisions; wide-zoom visual LOD removes small noise without changing simulation.
- Procedural mutation overlays are restrained and no longer cover the production Hero.
- DEV Master Composition and HUD-off modes support traversal and mockup-intent validation.
- See `M09_2_1_INTEGRATION_FIX.md` for the 2.5D/hybrid/full-3D comparison and staged migration path.

## M09.3 continuous Harvest Arena

- The 5600×4000 map now has a continuous stone base, broad blended region fields, authored traversal corridors, 38 macro terrain patches and nine outer boundary masses.
- Six coherent production macro pieces cover intact stone, destroyed stone, basin ring, approach, boundary wall and crystal/corruption transition needs without a monolithic world texture.
- Colossus Basin is assembled from four shattered ring sections, fractured terrain, persistent impact damage, rubble and restrained fissure influence.
- Ruined West Approach, Crystal Field, Corrupted East Approach, Lower Entry and the outer ring use clustered landmark assemblies rather than uniformly scattered props.
- Terrain, structures, props, decals, collisions, regions and corridors live in reusable map-definition data; `GameScene` remains orchestration.
- Viewport culling and wide-zoom LOD keep macro landmarks while reducing accent patches and small details.
- `npm run qa:world` creates deterministic, explicitly labelled OFFLINE QA images for the full map, portrait master composition and Look-Up/Master/Look-Down views.
- See `M09_3_WORLD_CONSTRUCTION.md` for the terrain pipeline, coverage audit and validation results.

## M10 Hybrid 3D vertical slice

- Three.js renders real floor geometry, basin slabs, boundary rocks, pillars, broken pillars, an arch and rock formations with depth-buffer occlusion.
- Simulation retains renderer-independent 2D world coordinates; a small adapter maps simulation `x/y` to render `X/Z`, with `Y` reserved for elevation.
- The existing 32 directional Hero frames render as a depth-tested world billboard and retain actual world-facing direction, locomotion, dash and attack poses.
- The production Harvest Colossus is a temporary world impostor backed by a real 3D footprint/body/orientation proxy.
- A real perspective camera supports smooth Follow, unrestricted map pan/Look, Boss Focus, Tactical distance and local dolly without changing simulation state.
- Existing Boss attack selection drives perspective-correct ground meshes; existing loot art remains on real world positions with contact shadows and rarity beams.
- The 5600×4000 production map is deliberately not migrated yet. This isolated 2200×2200 proof decides whether a staged full-map conversion is viable.
- See `M10_HYBRID_3D_ARCHITECTURE.md` for the renderer gate, scale, migration matrix, measurements and limitations.

No backend, authentication, cloud save, real multiplayer, country/world aggregation, store, ads or fake online data exists.

## Key structure

- `src/core/CombatModel.ts` — combat values, mutation choices, cooldowns and result
- `src/gameplay/ArenaRunModel.ts` — arena player, XP/build, loot, cycles and run snapshot
- `src/gameplay/ArenaTypes.ts` / `ArenaRegions.ts` — 5600×4000 combat coordinates and eight regions
- `src/gameplay/MapDefinition.ts` / `HarvestArenaMap.ts` — reusable map schema and authored continuous Harvest map
- `src/gameplay/WorldCoordinates.ts` / `WorldCollisionSystem.ts` — renderer-independent units and major environment collision
- `src/gameplay/HeroDirection.ts` — stable eight-direction mapping
- `src/gameplay/BossWorldEntity.ts` — physical footprint, orientation and boss-relative spatial classification
- `src/gameplay/PlayerMovementController.ts` — analog acceleration, braking, turning and timed dash
- `src/gameplay/BossAttackSystem.ts` / `LootSystem.ts` — bounded spatial systems
- `src/gameplay/RunUpgrades.ts` / `Equipment.ts` / `RunModes.ts` — content and future boundaries
- `src/progress/PlayerProgress.ts` / `GamePersistence.ts` — guest persistence and resume
- `src/online/Contracts.ts` — contracts only; intentionally no network
- `src/gameplay/ArenaCamera.ts` — world camera, transforms, zoom, follow and shake
- `src/render/ArenaLayer.ts` — cached/camera-masked floor, regions, landmarks, telegraphs, aftermath, loot, dummies and pet
- `src/render/ArenaProductionArt.ts` — deterministic authored production prop/decal composition
- `src/render/BossWorldPresentation.ts` — giant world-projected boss pose
- `src/render/CreatureLocomotion.ts` — movement pose and grounding
- `src/render/DirectionalHeroRenderer.ts` — production directional Hero animation/fallback boundary
- `src/render/GameScene.ts` — M05 presentation plus M06 arena integration
- `src/world3d/Hybrid3DVerticalSlice.ts` — M10 simulation/render orchestration
- `src/world3d/HybridWorldRenderer.ts` — Three.js scene, geometry, billboards, telegraphs and loot
- `src/world3d/HybridCameraController.ts` — true perspective world camera
- `src/world3d/Hybrid3DTestScene.ts` — deterministic data-driven spatial slice
- `src/world3d/HybridCollisionSystem.ts` — lightweight planar geometry collision
- `src/ui/GameUI.ts` / `src/styles.css` — joystick, run HUD, choices, resume/failure and fullscreen
- `M09_TRUE_BOSS_ARENA.md` — M09 architecture, parameters, validation and known risks
- `M09_1_VISUAL_COMBAT_POLISH.md` — M09.1 visual audit, asset integration, caps and validation
- `M09_2_PRODUCTION_ART_CONVERGENCE.md` — kit pipeline, runtime integration and validation
- `M09_2_1_INTEGRATION_FIX.md` — world architecture decision, map/Hero/camera implementation and migration plan

## Save/resume strategy

Autosave stores domain state, never Pixi objects. Position/HP, combat state, level/XP, upgrades, inventory, mutations, cycle and boss HP restore. Transient projectiles, particles, telegraph animations and airborne loot are discarded, so resume begins at a clean combat boundary. Missing/corrupt data falls back safely. Local saves are not competitive trust.

## Device notes

Portrait is master; test 360×780 through 430×932 plus landscape. Validate joystick + Power Hit multitouch, navigation gestures, fullscreen, audio resume, backgrounding, thermals, telegraph contrast and loot readability. Automated tests do not replace physical Android GPU/touch testing.

## Future online boundary

Group encounters, authoritative boss/loot, reconnect, ranked results, Country/World contribution and account progression require a real server clock, validation and server-owned rewards. The browser client must never be authoritative for competitive damage, aggregate HP, economy or valuable claims.

Production assets remain optional semantic slots. Missing or failed files use procedural fallbacks; LOW/MEDIUM/HIGH changes presentation density only and never gameplay math.

## M10.1 Hybrid 3D Visual Proof
M10.1 strengthens the isolated Hybrid-3D slice without migrating the full arena. See `M10_1_HYBRID_3D_VISUAL_PROOF.md`. Deterministic HUD-free visual proof presets are available via `?proof=master`, `flank`, `rear`, `occlusion`, `away`, `wide`, and `close`.
