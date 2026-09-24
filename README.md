# Mutation Boss — M06 Arena Combat Foundation

Browser-first PixiJS action prototype: move and dodge in a compact arena, auto-attack the looming Harvest Colossus, use Power Hit, collect physical loot, level a run build, mutate, clear escalating boss cycles and retain local guest progress.

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

- Mobile: left virtual joystick + **POWER HIT**; independent pointer IDs allow simultaneous input.
- Desktop: WASD/arrows + click/tap Power Hit.
- Fullscreen is optional and only requested from its explicit button.
- Mutation and level-up choices pause active time and danger timing.
- `D`, backtick or `?debug=1` opens DEV controls for attacks, loot, XP, cycles, dummies, quality and state.

## Implemented M06 scope

- Bounded 1000×480 logical arena projected into the lower screen while the boss remains huge
- One real local player; bounded DEV-only dummy allies are explicitly non-network entities
- Ground Slam, Core Beam and Falling Debris telegraph → impact → recovery attacks
- Player HP, mitigation, brief invulnerability, failure and retry
- Physical bounded loot with boss-origin arcs, ground persistence, rarity and proximity pickup
- Run XP, levels and 11 data-driven upgrades across attack, defense, movement, utility and synergy
- Visible projectile scale/count and orbiting power-growth presentation
- Three finite escalating boss cycles
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
- `src/gameplay/ArenaTypes.ts` — combat entity and arena coordinates
- `src/gameplay/BossAttackSystem.ts` / `LootSystem.ts` — bounded spatial systems
- `src/gameplay/RunUpgrades.ts` / `Equipment.ts` / `RunModes.ts` — content and future boundaries
- `src/progress/PlayerProgress.ts` / `GamePersistence.ts` — guest persistence and resume
- `src/online/Contracts.ts` — contracts only; intentionally no network
- `src/render/ArenaLayer.ts` — projection for telegraphs, loot, dummies and pet hook
- `src/render/GameScene.ts` — M05 presentation plus M06 arena integration
- `src/ui/GameUI.ts` / `src/styles.css` — joystick, run HUD, choices, resume/failure and fullscreen
- `M06_GAMEPLAY_ARCHITECTURE.md` / `M06_CONTENT_MATRIX.md` — boundaries and implemented content

## Save/resume strategy

Autosave stores domain state, never Pixi objects. Position/HP, combat state, level/XP, upgrades, inventory, mutations, cycle and boss HP restore. Transient projectiles, particles, telegraph animations and airborne loot are discarded, so resume begins at a clean combat boundary. Missing/corrupt data falls back safely. Local saves are not competitive trust.

## Device notes

Portrait is master; test 360×780 through 430×932 plus landscape. Validate joystick + Power Hit multitouch, navigation gestures, fullscreen, audio resume, backgrounding, thermals, telegraph contrast and loot readability. Automated tests do not replace physical Android GPU/touch testing.

## Future online boundary

Group encounters, authoritative boss/loot, reconnect, ranked results, Country/World contribution and account progression require a real server clock, validation and server-owned rewards. The browser client must never be authoritative for competitive damage, aggregate HP, economy or valuable claims.

Production assets remain optional semantic slots. Missing files use M05 procedural fallbacks; assets and LOW/MEDIUM/HIGH quality never alter gameplay math.
