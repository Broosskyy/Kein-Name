# M06 Gameplay Architecture

## Combat loop

`move / dodge → auto attack + Power Hit → boss break → mutation → physical loot → run XP → upgrade → boss kill → next cycle → result / failure`

The huge boss remains a presentation-scale Pixi entity. Spatial simulation uses a separate 1000×480 logical arena projected into the lower portrait/landscape screen. Render scale and combat coordinates are independent.

## Responsibilities

| Layer | Owns | Does not own |
|---|---|---|
| `CombatModel` | Damage, boss HP, breakpoints, mutations, cooldowns, active time, result | Pixi, DOM, loot visuals |
| `ArenaRunModel` | Movement/HP, XP, upgrades, loot, cycles, inventory, snapshot | Textures, particles, networking |
| `BossAttackSystem` | Telegraphs, spatial hit checks, cadence | Camera/VFX |
| `ArenaLayer` | Projection and bounded arena visuals | Damage/reward math |
| `GameScene` | Orchestration, feedback, render lifecycle | Persistent authority |
| `GamePersistence` | JSON storage and corruption fallback | Cloud/competitive trust |

## Entity and spatial model

`CombatEntityState` supports identity boundary, position/velocity/facing, HP, form/mutations/evolution, run items, pet/cosmetics/buffs and stats. M06 creates one local player. DEV dummies use `kind: dummy-ally` and `isOnlinePlayer: false` and are never advertised as people.

Ground Slam uses an ellipse, Core Beam a lane, and Falling Debris bounded circles. Each follows telegraph → impact → recovery. Choice, upgrade and lifecycle pauses freeze attacks. Quality modes may reduce decoration, never telegraph information or hit math.

## Loot, upgrades and visible growth

Loot is bounded, launches from the boss, lands in logical space and collects once by proximity. Run XP resets per run. Level choices pause active time. Upgrade definitions carry category, tier, prerequisites/exclusions, stack cap, stats and visual/attack modifiers. Mutations remain build identity. Projectile scale/count, cadence, mutation projectiles and bounded orbitals show power without changing player collision geometry.

## Cycles, save and resume

M06 uses three finite cycles. Config controls HP, damage/cadence intent, loot and XP multipliers. `PlayerProgress` is versioned local guest state. `ArenaRunSnapshot` stores domain state only; unsafe transient attacks/projectiles/airborne loot clear during reconstruction.

## Run modes and future authority

- Solo/Event: implemented locally and resumable.
- Group: contract-ready 2–8 rendered-player target; future server.
- Country/World: instances submit validated contributions; not one giant rendered arena.
- Halloween: Event mapping controls theme, boss, mutation pool and event persistence.

Networking is absent. A future server must own/validate start, clock/ticks, boss state, damage, loot, rewards, progression, reconnect, aggregate contribution and ranked results. Snapshot/contribution interfaces create seams without fake transport.

## Web lifecycle

Direct URL play remains primary. Fullscreen requires an explicit gesture and no-ops when unavailable. Existing visibility pause/resume and resize paths remain. DPR, players, loot, projectiles, telegraphs and VFX are bounded.
