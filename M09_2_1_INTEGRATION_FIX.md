# M09.2.1 — Real World Map, Living Hero & Camera Architecture

## Status and intent

M09.2.1 changes the runtime mental model from a boss composition with movable pieces to a continuous map viewed through a local camera. Simulation state remains renderer-independent. The chosen implementation is **production 2.5D**, not a real 3D renderer. The current high-quality 2D Colossus is retained as a world-projected representation; a controlled 3D migration remains possible through the new world/map boundaries.

## World architecture decision

### Current architecture audit

M09.2 already had a 5600×4000 simulation, world positions, a physical boss footprint, spatial attacks, loot, camera transforms and authored production art. The main defects were presentation boundaries: one front-facing creature image, a player-relative camera offset that was too small for inspection, environment placement split across render code, and gameplay units implicitly treated like render pixels.

### Options evaluated

| Criterion | Improved production 2.5D | Hybrid 3D world | Full 3D |
|---|---:|---:|---:|
| Immediate world feel | High with directional hero/map camera | Very high | Very high |
| Camera freedom | High planar freedom | High | Highest |
| Hero animation | 8-way authored views; moderate content cost | Strong with shared rig | Strong with shared rig |
| Boss from every side | Temporary limitation | Strong after 3D boss | Strong |
| Existing M09.2 art reuse | Excellent | Good as decals/impostors | Limited-to-good |
| Mobile web payload/GPU risk | Lowest | Medium | Highest |
| Reproducible AI pipeline | Existing kit workflow | Requires coherent models/rig/export | Requires full 3D pipeline |
| Time to convincing vertical slice | Shortest | Medium/high | Highest |
| Future maps | Strong through data-driven definitions | Strongest modular potential | Strongest |
| Future multiplayer | Simulation-compatible | Compatible | Compatible |
| Mutation/skin production | Directional matrix grows quickly | Shared rig preferable long-term | Shared rig preferable long-term |
| Maintenance complexity | Low/medium | Medium/high | High |

### Chosen architecture

**Improved production-quality 2.5D** was selected for M09.2.1.

Why:

- It fixes the demonstrated failure now: the Hero uses eight real orientations and two authored locomotion poses per direction instead of sliding one image.
- It preserves all coherent M09.2 production kits and keeps initial mobile-web cost bounded.
- The map, camera, collision and simulation no longer depend on Pixi screen coordinates, so this is not a dead-end renderer choice.
- A real 3D migration today would require a coherent rigged Hero, multi-angle/3D Colossus, reusable model kit, animation set, compression and Android GPU validation. A low-quality temporary 3D substitute would regress the visible vertical slice.

### Rejected for this milestone

- **Hybrid 3D now:** rejected as the primary runtime because there is no validated shared rig/model/material kit yet. It remains the preferred next spike if 8-direction mutation/evolution production becomes uneconomical.
- **Full 3D now:** rejected because download, GPU, shader, animation and art-pipeline risk are disproportionate to this integration milestone.
- **Fixed billboard Hero:** rejected because it preserves the sliding-card defect.

## Map architecture

`HarvestArenaMap.ts` defines one continuous Harvest Arena:

- dimensions and playable bounds;
- Lower Approach player spawn and Colossus Basin boss spawn;
- eight blended navigation identities;
- authored production props and ground details;
- major environment colliders;
- loot regions and camera hints;
- traversal waypoints and a DEV master-composition scenario.

The zones are Northern Ruins, Crystal Field, Corrupted Ruins, Colossus Basin, Broken Inner Ring, Fissure Field, Lower Approach and Outer Ruins. They are semantic/navigation regions, not separately loaded levels or hard rectangular biomes.

`MapDefinition.ts` is reusable by future maps. A future map is a map definition + biome/material kit + landmark kit + boss/encounter configuration. `WorldCollisionSystem.ts` resolves only major blocking structures and keeps broad combat lanes open.

## World coordinate and simulation boundary

`WorldCoordinates.ts` introduces explicit planar simulation ↔ world conversion with optional height. Current rendering maps simulation `x/y` to world `x/depth`; no gameplay calculation reads camera position, zoom, Pixi transforms or sprite bounds.

Simulation owns movement, HP, boss state, collisions, attacks, loot, rewards and save state. Rendering consumes snapshots/state. Quality and LOD change visibility only.

## Hero architecture

The Hero is **directional 2D**, not a billboard and not rigged 3D.

The two coherent source sheets contain:

- N, NE, E, SE, S, SW, W and NW views;
- Idle/contact and Run poses for every direction;
- authored Dash and Attack/Power-Hit launch poses for every direction;
- the same cream/charcoal body, anatomy, proportions and blue-eye identity.

`DirectionalHeroRenderer.ts` maps simulation velocity to direction, retains last-facing while stopped, alternates authored locomotion/contact poses and temporarily switches to authored Dash or Attack poses on gameplay events. The existing locomotion controller still supplies restrained lean, bob, compression, dust and shadow response. Attacks face the boss target. A failed directional asset falls back to the M09.2 Base Creature and then the procedural master.

The 8-direction matrix is acceptable for this vertical slice, but it does not scale cheaply across many full-body evolutions, skins and animation families. Before expanding that matrix, prototype one compressed rigged 3D Hero using the same sockets (head, back, sides, tail, wings, chest/core, paws and aura).

## Mutation integration fix

Gameplay mutation state remains unchanged. Procedural mutation presentation is capped to 0.38–0.52 of its former overlay scale. Crystal, Void, Wings and Pumpkin now read as restrained attachments/aura rather than giant primitives covering the Hero face and torso. Fusion fallback graphics are similarly reduced. Production mutation attachments can replace them independently later.

## Boss architecture

The Harvest Colossus remains the current high-quality aligned 2D production representation projected from a real world entity at `(2800, 1900)`. Its footprint, orientation, front/flank/rear logic, attacks and collisions remain simulation truth.

Temporary limitation: the raster Colossus cannot provide truthful rear/side surface views when completely circled. It is still useful as current gameplay art, portrait/loading art and a future impostor/LOD. The migration path is a stylized compressed 3D Colossus consuming the same `BossWorldEntity` state; no boss gameplay rewrite is required.

## Camera architecture

The camera is a local viewport into the map:

- **FOLLOW:** dead-zone, velocity look-ahead and portrait lead without mandatory boss lock;
- **LOOK:** absolute world-space inspection target, independent of Hero position;
- **BOSS FOCUS:** optional midpoint framing from world positions;
- **TACTICAL:** wider local presentation preset.

Touch drag affects the camera only; joystick affects the Hero only; pinch/wheel affects zoom only. LOOK can pan substantially in X/Y/diagonal directions up to real map/viewport bounds. Reset releases LOOK and interpolates back to FOLLOW without a hard snap. Zoom remains presentation-only.

Portrait projection now considers both viewport width and height instead of using width alone, so normal view exposes a useful subsection of the 4000-unit depth rather than visually collapsing most of the map into one phone screen.

## Minimap and DEV validation

The compact minimap maps Hero, Colossus and DEV allies from actual world coordinates. DEV tools now include FOLLOW/LOOK/BOSS FOCUS, HUD-off traversal and a Master Composition scenario with Hero in the Lower Approach, distributed local visual dummies, world loot and the real Colossus ahead. Dummies remain local DEV entities and never represent online players.

## LOD and performance

- Wide zoom suppresses tiny detail decals and detail-class props while preserving landmarks, telegraphs, loot, players and boss.
- Static production textures are reused; no per-frame texture generation was added.
- Collision uses a small deterministic collider list, not mesh/physics simulation.
- The two directional Hero kits add 2,251,098 bytes (2.15 MiB) of runtime WebP art.
- No 3D engine, shader package or development-only renderer dependency was added.

## Asset pipeline

Source masters:

`production-assets/source/creature-directional-locomotion-kit-01.png`

`production-assets/source/creature-directional-action-kit-01.png`

Runtime extraction:

`scripts/extract-directional-hero.sh` exports 32 isolated 384×384 RGBA WebP assets under `public/assets/creature/directional/`. It stages each crop through PNG, retries WebP encoding and validates non-zero size, dimensions and alpha before replacing a runtime asset. All frames are registered semantically in AssetManifest and preload safely with fallback.

Image generation method: built-in image generation, transparent-background edit/generation using the existing production Base Creature as identity reference.

Final generation prompt:

> Create one coherent high-resolution transparent 4×4 directional locomotion master sheet for the exact same compact premium stylized fantasy creature in the supplied reference: warm cream/white fur, charcoal graphite plates/feathers and paws, large expressive blue eyes, short capable proportions, restrained horns/ears and tail. Sixteen isolated full-body sprites: row 1 N idle and N run, NE idle and NE run; row 2 E idle and E run, SE idle and SE run; row 3 S idle and S run, SW idle and SW run; row 4 W idle and W run, NW idle and NW run. Every cell must show the same anatomy, proportions, materials and scale. Direction must be unmistakable, including real back views. Run poses must show grounded leg action, not sliding. True RGBA transparent background, no checkerboard, scene, floor plane, labels, UI, frames or overlapping effects. Generous equal spacing and outer margin; no sprite or shadow may cross cell boundaries. Premium stylized 2.5D mobile game rendering, readable at small gameplay scale, controlled detail, clean alpha edges. Do not redesign as a wolf, fox, cat, humanoid or spiky elemental monster.

Action-kit generation prompt:

> Use case: stylized-concept. Asset type: production game sprite master sheet, M09.2.1 directional Hero action kit. Input image: exact identity, anatomy, materials, proportions, rendering style, scale and directional-view reference. Primary request: Create a coherent 4x4 transparent master sheet containing the exact same cream-white and charcoal fantasy creature in eight directional action views. Each direction has one DASH pose and one ATTACK / POWER-HIT launch pose. Layout order: row 1 N dash, N attack, NE dash, NE attack; row 2 E dash, E attack, SE dash, SE attack; row 3 S dash, S attack, SW dash, SW attack; row 4 W dash, W attack, NW dash, NW attack. Dash: low grounded forward burst, compressed then extended body, legs clearly driving in that direction, readable silhouette, no energy trail baked into sprite. Attack: planted physical casting/launch action with front paws/body committing toward that direction, strong anticipation/release silhouette, no projectile and no VFX baked into sprite. The subject must remain exactly the same character across all 16 cells: same face, blue eyes where visible, cream fur, graphite plates, paws, ears, tail, body length, head/body ratio and premium stylized 2.5D rendering. True RGBA transparent background. Generous equal gutters and outer margins. Each sprite fully isolated within its cell. No shadows, particles, glow, projectiles, scenery, floor, checkerboard, labels, UI or frames. No asset may touch or overlap another cell. Avoid redesigning as a wolf, fox, cat, humanoid, armored monster or elemental creature. Preserve real back and side orientations; do not rotate one front-facing picture.

## Save, multiplayer and download impact

Existing M09.2 snapshots remain compatible. Camera LOOK, shake and ephemeral presentation are not serialized; saved local zoom remains supported. Shared future multiplayer state is map/world state only. Each client owns its camera, zoom, LOD and rendering.

The only material startup addition is the 32-frame directional Hero set. Full payload and ZIP sizes are recorded in the final completion report after packaging.

## Migration plan

1. Validate this 2.5D slice on real Android: directional changes, rapid turns, dash, pan/pinch conflict, memory and GPU time.
2. Produce modular production mutation attachments for the directional Hero or test them as sockets on one rigged 3D Hero spike.
3. Compare a compressed rigged 3D Hero spike against the current directional art on load time, animation quality and Android FPS.
4. If it wins, replace only `DirectionalHeroRenderer`; simulation/map/camera remain.
5. Later prototype a compressed stylized 3D Colossus consuming `BossWorldEntity` orientation and damage state.

## Known risks

- Current Colossus raster art remains front-biased from rear traversal.
- Four authored Hero poses per direction provide a convincing living/action baseline, not a full skeletal animation set or frame-by-frame animation.
- Directional full-body evolution content would grow rapidly; modular attachments or a shared 3D rig should precede a large catalog.
- Browser HTTP smoke cannot replace physical Android touch/GPU validation.
- Real Android validation for M09.2.1 is pending.

## Source validation result

- TypeScript: PASS (`tsc -b`, no errors)
- Full tests: PASS — 14 files, 124/124 tests
- Production build: PASS — Vite 7.3.6, 772 modules
- Main application JS: 491.16 kB raw / 149.75 kB gzip
- CSS: 34.27 kB raw / 8.56 kB gzip
- Built `dist`: 6,160,006 bytes (98 files)
- Runtime `public/assets`: 4,583,186 bytes (76 files)
- Directional Hero runtime set: 2,251,098 bytes (32 files)
- Asset existence audit: PASS, zero referenced production files missing
- Directional Hero transparency audit: PASS, 32/32 WebP files are non-empty 384×384 RGBA
- Preview HTTP smoke: PASS — HTML, main JS, Hero and Colossus asset returned HTTP 200
- Automated browser screenshot: unavailable because the prescribed `agent-browser` CLI/binary is not installed in this execution environment
- Real Android validation: PENDING
