# Mutation Boss — M09.1 Visual Vertical Slice

Browser-first PixiJS boss-arena vertical slice: circle a physical world-space Harvest Colossus inside a 5600×4000 dark-fantasy arena, freely look and zoom, read floor-attached danger, dash for physical loot, mutate and break escalating boss cycles. M09.1 adds the first integrated production boss master and a focused world/combat presentation pass without changing gameplay scope.

## Start and validate

```bash
npm install
npm run dev
npx tsc -b
npm test
npm run build
npm run preview
```

## Controls

- Mobile: 360° joystick + **POWER HIT** + **DASH**; drag open battlefield space to look, pinch to zoom, double-tap to reset follow.
- Desktop: WASD/arrows, Space to dash, mouse drag to look, mouse wheel or `− / +` to zoom.
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

## M09.1 visual convergence

- Integrated transparent Harvest Colossus production master with aligned procedural core, damage, hit and death layers
- Asset-first landmark/floor hooks with safe procedural fallback
- Irregular cached stone plates, macro terrain patches and stronger boss grounding instead of the repeated grid cadence
- Broken-edge, crack-driven floor telegraphs with low-opacity centers and readable Warning/Imminent/Impact states
- Bounded reusable ground aftermath decals and pooled VFX lifecycle diagnostics
- Stronger boss anticipation, impact compression, recoil, debris and localized shockwave response
- More desirable world loot scale, rarity beams and Ember Wisp presence
- Calmer camera follow/look-ahead and faster-decaying controlled shake
- Subtle off-screen boss direction marker
- Compact premium HUD polish; permanent zoom buttons remain removed

No backend, authentication, cloud save, real multiplayer, country/world aggregation, store, ads or fake online data exists.

## Key structure

- `src/core/CombatModel.ts` — combat values, mutation choices, cooldowns and result
- `src/gameplay/ArenaRunModel.ts` — arena player, XP/build, loot, cycles and run snapshot
- `src/gameplay/ArenaTypes.ts` / `ArenaRegions.ts` — 5600×4000 combat coordinates and eight regions
- `src/gameplay/BossWorldEntity.ts` — physical footprint, orientation and boss-relative spatial classification
- `src/gameplay/PlayerMovementController.ts` — analog acceleration, braking, turning and timed dash
- `src/gameplay/BossAttackSystem.ts` / `LootSystem.ts` — bounded spatial systems
- `src/gameplay/RunUpgrades.ts` / `Equipment.ts` / `RunModes.ts` — content and future boundaries
- `src/progress/PlayerProgress.ts` / `GamePersistence.ts` — guest persistence and resume
- `src/online/Contracts.ts` — contracts only; intentionally no network
- `src/gameplay/ArenaCamera.ts` — world camera, transforms, zoom, follow and shake
- `src/render/ArenaLayer.ts` — cached/camera-masked floor, regions, landmarks, telegraphs, aftermath, loot, dummies and pet
- `src/render/BossWorldPresentation.ts` — giant world-projected boss pose
- `src/render/CreatureLocomotion.ts` — movement pose and grounding
- `src/render/GameScene.ts` — M05 presentation plus M06 arena integration
- `src/ui/GameUI.ts` / `src/styles.css` — joystick, run HUD, choices, resume/failure and fullscreen
- `M09_TRUE_BOSS_ARENA.md` — M09 architecture, parameters, validation and known risks
- `M09_1_VISUAL_COMBAT_POLISH.md` — M09.1 visual audit, asset integration, caps and validation

## Save/resume strategy

Autosave stores domain state, never Pixi objects. Position/HP, combat state, level/XP, upgrades, inventory, mutations, cycle and boss HP restore. Transient projectiles, particles, telegraph animations and airborne loot are discarded, so resume begins at a clean combat boundary. Missing/corrupt data falls back safely. Local saves are not competitive trust.

## Device notes

Portrait is master; test 360×780 through 430×932 plus landscape. Validate joystick + Power Hit multitouch, navigation gestures, fullscreen, audio resume, backgrounding, thermals, telegraph contrast and loot readability. Automated tests do not replace physical Android GPU/touch testing.

## Future online boundary

Group encounters, authoritative boss/loot, reconnect, ranked results, Country/World contribution and account progression require a real server clock, validation and server-owned rewards. The browser client must never be authoritative for competitive damage, aggregate HP, economy or valuable claims.

Production assets remain optional semantic slots. Missing files use M05 procedural fallbacks; assets and LOW/MEDIUM/HIGH quality never alter gameplay math.
