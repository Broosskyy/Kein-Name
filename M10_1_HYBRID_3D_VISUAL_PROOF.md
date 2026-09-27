# M10.1 — Hybrid 3D Visual Proof

## Purpose
M10.1 does not expand gameplay. It turns the M10 architecture spike into a stronger spatial visual proof before any 5600×4000 migration.

## Changes
- Preserves Three.js + Pixi hybrid architecture and the M09.3 fallback.
- Keeps the 2200×2200 simulation-unit test arena.
- Reframes FOLLOW mode so the Hero naturally sits lower in portrait combat views while the camera looks deeper into the arena toward the Boss.
- Adds deterministic visual-proof presets through `?proof=master|flank|rear|occlusion|away|wide|close`.
- Adds a HUD-free proof mode for actual runtime capture.
- Rebuilds the vertical-slice floor composition with real 3D geometry: approach platform, paving slabs, raised Boss basin, fractured ring, side shelves and dim decorative fissures.
- Adds true 3D identity anchors: crystal clusters, corruption formations, ruined wall, stronger rocks/ruins and boundary masses.
- Enables lightweight PCF soft shadows for major geometry and retains fake contact shadows for sprite entities.
- Keeps Hero and loot as world-space sprites; keeps the Harvest Colossus as a temporary world impostor with a true spatial proxy.
- Decorative orange fissures remain intentionally weaker than active combat telegraphs.

## Visual acceptance
The proof is aimed at these questions only:
1. Does the Hero look like it stands inside geometry rather than on an image?
2. Does the Boss basin read as a place with real depth?
3. Do pillars/rocks/walls create actual occlusion and parallax?
4. Does portrait framing reproduce Hero-lower/Boss-upper composition spatially?
5. Can the camera look away and reveal another side of the arena?

## Runtime capture presets
- `?proof=master`
- `?proof=flank`
- `?proof=rear`
- `?proof=occlusion`
- `?proof=away`
- `?proof=wide`
- `?proof=close`

These presets only alter local presentation/spawn state for deterministic visual QA. They do not change authoritative simulation rules.

## Environment limitation in this chat
A Chromium binary is present, but its headless GPU process cannot initialize EGL/ANGLE in this container. Therefore a real WebGL screenshot cannot be truthfully produced here. No offline collage is substituted for a runtime frame.

The uploaded package also contains intentionally hollow/incomplete `node_modules` folders, so local TypeScript/Vite validation in this container cannot be treated as authoritative until dependencies are restored with `npm ci` in a networked/runtime environment.

## Required next validation
Run the source in a normal browser/Android environment and capture the seven deterministic proof URLs above. If the spatial result still reads flat, stop before full map migration and move the Hero/Boss art strategy further toward real 3D/multi-angle assets.
