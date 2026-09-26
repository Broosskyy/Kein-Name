# Mutation Boss — M08 World & Combat Experience

Browser-first PixiJS boss-arena prototype: travel through a camera-driven 3200×1800 dark-fantasy arena, read world-space danger, dash for physical loot, grow a visible mutation build and break increasingly unstable Harvest Colossus cycles.

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

- Mobile: 360° joystick + **POWER HIT** + **DASH**; pinch or `− / +` to zoom.
- Desktop: WASD/arrows, Space to dash, mouse wheel or `− / +` to zoom.
- Fullscreen is optional and only requested from its explicit button.
- Mutation and level-up choices pause active time and danger timing.
- `D`, backtick or `?debug=1` opens DEV controls for attacks, loot, XP, cycles, dummies, quality and state.

## Implemented M08 scope

- Six visually distinct connected arena regions with large landmarks, cached floor detail, break reactions and bounded attack aftermath
- Hybrid world-anchored giant boss whose pose responds to player distance, lateral camera travel and zoom
- Soft follow/dead-zone/look-ahead, additive shake, clamped 0.68–1.30 zoom and saved zoom preference
- Full X/Y/diagonal movement with normalized speed plus cooldown/invulnerability dash
- One real local player; bounded DEV-only dummy allies are explicitly non-network entities
- Distance-aware, repetition-resistant Ground Slam, Beam, Debris, Cone, Ring, Shockwave and Moving Hazard vocabulary
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

No backend, authentication, cloud save, real multiplayer, country/world aggregation, store, ads or fake online data exists.

## Key structure

- `src/core/CombatModel.ts` — combat values, mutation choices, cooldowns and result
- `src/gameplay/ArenaRunModel.ts` — arena player, XP/build, loot, cycles and run snapshot
- `src/gameplay/ArenaTypes.ts` / `ArenaRegions.ts` — combat coordinates, regions and boss zone
- `src/gameplay/BossAttackSystem.ts` / `LootSystem.ts` — bounded spatial systems
- `src/gameplay/RunUpgrades.ts` / `Equipment.ts` / `RunModes.ts` — content and future boundaries
- `src/progress/PlayerProgress.ts` / `GamePersistence.ts` — guest persistence and resume
- `src/online/Contracts.ts` — contracts only; intentionally no network
- `src/gameplay/ArenaCamera.ts` — world camera, transforms, zoom, follow and shake
- `src/render/ArenaLayer.ts` — cached/camera-masked floor, regions, landmarks, telegraphs, aftermath, loot, dummies and pet
- `src/render/BossWorldPresentation.ts` — giant hybrid boss world/screen pose
- `src/render/GameScene.ts` — M05 presentation plus M06 arena integration
- `src/ui/GameUI.ts` / `src/styles.css` — joystick, run HUD, choices, resume/failure and fullscreen
- `M08_WORLD_VISUAL_COMBAT.md` — visual audit, world convergence, presentation and performance strategy

## Save/resume strategy

Autosave stores domain state, never Pixi objects. Position/HP, combat state, level/XP, upgrades, inventory, mutations, cycle and boss HP restore. Transient projectiles, particles, telegraph animations and airborne loot are discarded, so resume begins at a clean combat boundary. Missing/corrupt data falls back safely. Local saves are not competitive trust.

## Device notes

Portrait is master; test 360×780 through 430×932 plus landscape. Validate joystick + Power Hit multitouch, navigation gestures, fullscreen, audio resume, backgrounding, thermals, telegraph contrast and loot readability. Automated tests do not replace physical Android GPU/touch testing.

## Future online boundary

Group encounters, authoritative boss/loot, reconnect, ranked results, Country/World contribution and account progression require a real server clock, validation and server-owned rewards. The browser client must never be authoritative for competitive damage, aggregate HP, economy or valuable claims.

Production assets remain optional semantic slots. Missing files use M05 procedural fallbacks; assets and LOW/MEDIUM/HIGH quality never alter gameplay math.
