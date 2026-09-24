# M07 Arena, Camera & Active Combat

## World model

Combat uses a fixed `3200 × 1800` world. The playable bounds are inset to `160..3040 × 180..1620`; player, pet, DEV allies, loot and boss telegraphs all use those coordinates. The viewport no longer changes gameplay positions. UI remains screen-space.

`ArenaCamera` owns follow, a soft dead-zone, velocity look-ahead, zoom, bounds, screen/world conversion and additive shake. Portrait displays the world from roughly 34–90% of the screen so the Harvest Colossus remains a large screen-space encounter above and behind the battlefield. Camera shake is never serialized.

## Controls

- Mobile: full-vector virtual joystick, Power Hit, Dash, pinch zoom, and optional `− / +` zoom controls.
- Desktop: WASD/arrows, Space to dash, mouse wheel or `− / +` to zoom.
- Zoom is clamped to `0.78–1.22`, affects presentation only, and is stored in guest settings.
- Fullscreen continues to use the browser API; resize/orientation recalculates the camera viewport.

## Movement and dash

Movement normalizes diagonals and adds short acceleration/deceleration smoothing. Dash travels 430 world units in the current input/last movement direction, has a 2.4s cooldown and 340ms invulnerability. Bounds are applied after both movement and dash.

## Boss vocabulary and pacing

The deterministic scheduler avoids the two most recent attack types and introduces attacks by health phase/cycle: circle slams/debris, line beam, void cone, corruption/shockwave rings and a moving hazard. Each follows `warning → imminent → impact → recovery`. Later phases and cycles add spatial pressure, not only HP.

## Loot, pet and arena

Loot launches from the boss core into broad world positions, arcs, bounces, beams by rarity, magnetizes only inside range, and then enters the player. Boss kills create a bounded multi-drop explosion. The Ember Wisp exists in world space, follows smoothly and collects nearby common drops only.

The renderer provides a dark floor plane, scale landmarks, grid/crack cues, event tinting, culling, world telegraphs, loot, pet and up to seven local DEV allies. DEV layouts validate 1/2/4/8-player readability; they never claim to be online entities.

## Performance and resume

Existing quality/reduced-effects systems remain. Drops, projectiles, particles, telegraphs and dummy players are bounded. Off-camera entities are culled. Snapshot schema 2 adds dash cooldown and pet position; schema 1 remains loadable. Camera and transient render state are deliberately not serialized.

## Future multiplayer boundary

M07 contains no networking or fake online state. Real players, authoritative attacks/loot/progression, reconciliation and reconnect still require a server. World coordinates and entity IDs provide the future presentation boundary only.
