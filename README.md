# Mutation Boss — M05 Production Visual Foundation

Browser-first consumer-game prototype for: attack → break → choose mutation → evolve → defeat the boss → reveal a two-mutation build → continue local event progress.

## Start

```bash
npm install
npm run dev
```

Use the printed URL. For a real-device check, open the host machine's LAN URL from Chrome on Android. `npm run dev:local` binds only to localhost.

## Validation

```bash
npx tsc -b
npm test
npm run build
npm run preview
```

## Controls

- Auto Attack runs continuously; tap/click **POWER HIT** when ready.
- Choose one of two mutations at the 70% and 40% breaks.
- Event Hub → **ENTER EVENT** starts the run; **PLAY AGAIN** starts the next run immediately.
- In development, `D`, backtick, or `?debug=1` opens controls for builds, Halloween on/off, progress and quality.

## M05 scope

- Centrally configurable `halloween_2026` definition with version, dates, mutation pool, theme, boss, challenge and reward-track identifiers
- Halloween Event Hub, Harvest Colossus variant, layered moonlit arena and procedural seasonal audio
- Pumpkin mutation with Ember Seed/Pumpkin Burst identity and three builds: Jack O'Void, Harvestshard and Hollowwing
- Existing Voidshard, Skyshard and Nightwing retained; exactly two distinct mutations per run
- Six-entry evolution collection with locked/unlocked character presentations
- Local Harvest Energy, data-driven challenges, milestones, cosmetic reward unlock state and Event Complete state
- Versioned JSON-safe local save with safe handling of missing, corrupt and mismatched data
- Event data added to `RunResult` without embedding persistent or render state
- Deterministic choices include event context; Halloween off restores the M03 boss, arena, pool and three builds
- Code-first lighting, damage stages, mutation silhouettes, material-specific projectiles/impacts, pooled VFX and responsive DOM UI
- LOW/MEDIUM/HIGH remain visual-only quality profiles; combat and event reward math are unchanged

No backend, account, global progress, leaderboard, store, economy, ads or fake online data exists.

## Project structure

- `src/core/CombatModel.ts` — deterministic combat, choices and JSON-safe run result
- `src/core/DomainEvents.ts` — compact gameplay/event boundary
- `src/content.ts` — standard + Halloween boss, mutations and six evolution definitions
- `src/event/EventDefinition.ts` — event identity/config/time metadata
- `src/event/EventProgress.ts` — run rewards, discoveries, challenges, milestones and completion
- `src/event/EventStore.ts` / `EventState.ts` — local versioned persistence
- `src/event/EventChallenges.ts` / `EventRewards.ts` — data-driven seasonal content
- `src/render/GameScene.ts` — hybrid production/procedural arena, characters, projectiles and sequence orchestration
- `src/render/VisualDefinitions.ts` — stable visual identities, render-only scale and creature anchors
- `src/render/EffectsLayer.ts` — bounded pooled particles, debris, text and shockwaves
- `src/render/VisualQuality.ts` — render-only quality controls
- `src/ui/GameUI.ts` and `src/styles.css` — combat UI, hub, collection and reveal
- `src/audio/AudioBus.ts` — procedural, gesture-unlocked Web Audio cues
- `src/assets.ts` — semantic AssetManifest V2, robust preload and procedural fallback resolver
- `src/ui/VisualCatalog.ts` — dev-only comparison catalog for production slots and fallbacks
- `PRODUCTION_ASSET_SPEC.md` — artist/AI handoff specs, dimensions, anchors, consistency and web budgets

## Local event save

The prototype persists personal event progress under a versioned local-storage key. Corrupt/missing/version-mismatched state safely starts fresh. Debug can reset progress. Event dates are descriptive in M04; local device time is deliberately not used to grant valuable rewards.

## Mobile validation notes

Test Chrome on an average Android device at 360×780, 360×800, 375×812, 390×844, 412×915 and 430×932, then landscape. Verify safe areas, hub scrolling, two large choice targets, Power Hit reachability, background/resume timing, audio unlock, repeated retries and MEDIUM frame rate. Automated domain tests do not replace GPU, browser-chrome or touch validation on real hardware.

## Known limitations

- No production hero bitmaps ship in M05. The improved, coherent procedural art remains the active fallback; the manifest can replace a boss stage, arena, creature/mutation, evolution, icon or UI piece independently.
- Collection and Event Hub automatically prefer production hero images when configured and loaded.
- Event progress is local to one browser profile and is not secure against tampering.
- Event hub dates are not enforced from device time in this prototype.
- Landscape is graceful rather than separately art-directed.

## Future online boundary

Production event dates/config, account-bound collection, valuable reward claims, competitive scores, leaderboards and global event progress must be server-authoritative or server-validated. The browser client and local clock must not be trusted. M05 performs no HTTP calls and includes no fake network layer.

## Production assets

Add local WebP/PNG paths to semantic entries in `src/assets.ts`. `AssetRegistry.preload()` catches missing/failed assets; rendering, Event Hub and Collection automatically use the coherent procedural fallback. Run with `?debug=1` and choose **Visual Catalog** to compare all character, evolution, boss-stage and icon slots. Asset availability and quality mode never alter combat or event math.
