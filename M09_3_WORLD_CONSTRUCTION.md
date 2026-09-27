# M09.3 — Harvest Arena World Construction

## Ausgangsproblem

M09.2.1 established a real 5600×4000 simulation map, a directional living Hero and an independent camera, but the visible world was still assembled primarily as a dark fill plus isolated props and decals. Existing ruins, crystals and corruption art therefore read as stickers rather than parts of one authored place. M09.3 changes the missing world layers without rebuilding movement, camera, combat, loot or progression.

## Architekturentscheidung

M09.3 retains the production PixiJS/2.5D renderer. No 3D runtime or renderer dependency was introduced. Simulation continues to own positions, movement, collision, boss state, loot and attacks; the new terrain data is presentation-only and camera/LOD never changes gameplay values.

`ArenaMapDefinition` now describes:

- dimensions, bounds, visual theme and eight semantic regions;
- continuous terrain patches and macro structures;
- production props and ground details;
- major colliders and broad traversal corridors;
- player/Boss spawns, loot regions and camera hints.

The Harvest-specific placement data is isolated in `HarvestArenaWorld.ts`. The interfaces and renderer consume generic `MapTerrainPatch`, `MapProp` and `MapTraversalCorridor` definitions, so later arenas can use the same pipeline.

## World layers

1. Continuous dark-stone base and broad blended region fields.
2. Reusable macro terrain patches, pathways, shattered ring pieces and boundary masses.
3. Large production landmarks and authored landmark assemblies.
4. Existing rocks, ruins, crystals and corruption props.
5. Existing ground damage, rubble, crystal fragments, fissures and combat aftermath.
6. Hero, Boss, dummies, pet and loot.
7. Telegraphs and combat effects.
8. Screen-space HUD.

The original 176-piece procedural floor noise was reduced to 74 larger, quieter plates. Broad region fields and corridors now bridge the transparent production pieces so missing alpha does not expose a black void.

## Terrain pipeline

M09.3 adds one coherent 3×2 production master kit:

`production-assets/source/harvest-arena-macro-terrain-kit-01.png`

Runtime extraction produces six alpha WebPs:

- intact ancient stone;
- fractured/destroyed stone;
- shattered arena-ring segment;
- ruined approach/pathway;
- boundary wall mass;
- crystal/corruption transition terrain.

`scripts/extract-m09-3-world-kit.sh` crops the isolated cells, validates non-empty RGBA output and exports individual runtime assets. The game uses 38 placed instances from only six shared textures; there is no 5600×4000 monolithic texture.

Generation method: built-in image generation with the approved Harvest Colossus composition as visual-direction reference.

Generation prompt:

> Create one high-resolution transparent 3-by-2 master sheet with exactly six isolated modular macro terrain pieces for the same ruined Harvest Arena: broad intact ancient dark-stone floor, fractured/destroyed stone with restrained dormant fissures, a massive broken circular arena-ring segment, a wide destroyed stone approach, a long ruined boundary wall mass, and a broad crystal/corruption transition patch. Premium stylized 2.5D mobile-game rendering, dark angular volcanic stone, shared arena-floor perspective, quiet combat-readable centers, controlled orange bounce light, generous transparent gutters and extraction-safe isolation. True RGBA; no scene, sky, characters, Boss, loot, UI, labels, frame or checkerboard; no neon overload or active-AOE-looking rings.

## Regions and composition

The eight connected regions are:

- Colossus Basin;
- Inner Battle Ring;
- Ruined West Approach;
- Crystal Field;
- Corrupted East Approach;
- Broken Outer Ring;
- Lower Entry;
- Outer Boundary.

They are overlapping semantic fields rather than separate rectangular biomes. Five broad traversal corridors preserve clear action-game routes between entry, basin, western ruins, crystal field, corruption and the northern circuit.

Landmarks are clustered into authored assemblies:

- Broken Shrine: ruined gate, broken arch, altar, pillar, rubble and damaged ground.
- Crystal Outcrop: large anchor crystal, supporting clusters, rock mass, fragments and crystal-influenced terrain.
- Corrupted Ruin: corrupted ruin, root, stone, damaged ground and restrained violet terrain influence.
- Lower Entry: damaged approach, altar and paired broken pillars.
- Colossus Impact Site: shattered ring, impact floor, rubble beds and restrained dormant fissures.

## Colossus Basin

The world-space Boss remains at `(2800, 1900)` with unchanged footprint and combat logic. Four rotated broken-ring modules, fractured macro terrain, persistent impact damage, rubble beds, large soft shadow and existing fissure decals physically integrate the Production Colossus into the map. Decorative fissures remain dim/static; runtime telegraphs keep brighter animated contours and higher temporal priority.

## Grounding, depth and camera

Macro structures and retained props use footpoint-based world Y depth. Tall boundary/landmark art can pass in front of or behind the Hero; terrain stays below gameplay entities. Major pieces keep cheap contact shadows and local ground damage. The camera remains FOLLOW/LOOK/BOSS FOCUS/TACTICAL with independent X/Y pan and local zoom. New macro terrain is culled against the real viewport and accent terrain reduces at wide zoom.

The map perimeter combines continuous dark terrain, a broken procedural rim and large boundary structures. Existing camera clamping was retained and is now covered by automated minimum/maximum zoom tests, preventing large outside-world exposure.

## Performance

- Six shared macro textures, reused across 38 placements.
- Viewport culling for terrain and props.
- Existing small-detail LOD retained; accent terrain fades at wide zoom.
- No full-screen filters, dynamic blur, per-frame texture creation or physics added.
- Static Graphics are rebuilt only for theme/cycle changes, not every frame.
- Gameplay simulation and quality modes remain identical.

## Offline QA

`npm run qa:world` reads the real map definition, AssetManifest runtime paths and world positions, converts runtime WebPs to embedded PNGs, and produces deterministic images under `offline-qa/`:

- `m09-3-full-map-audit.png`
- `m09-3-portrait-master-composition.png`
- `m09-3-camera-look-up.png`
- `m09-3-camera-look-down.png`
- `m09-3-camera-views-audit.png`

Every image is visibly labelled **OFFLINE QA**. These are deterministic composition audits, not runtime screenshots and not Android evidence.

## Automated coverage and safety

The new M09.3 suite verifies:

- all regions, structures, props, terrain and ground details stay in bounds;
- all map IDs are unique;
- every 800-unit macro-grid cell has authored terrain coverage;
- important traversal centerlines remain free from blocking colliders;
- all used runtime assets and all 32 Hero frames exist;
- minimum/maximum zoom camera corners remain inside the map;
- camera/LOD state cannot mutate player simulation;
- the restrained mutation-overlay limit remains enforced.

## Reused M09.2/M09.2.1 assets

The Production Harvest Colossus, 32-frame Hero, ruins kit, crystal/corruption kit, ground details, loot, VFX and Ember Wisp remain active. They were recomposed rather than regenerated. Movement, collision, attacks, progression, saves and multiplayer-ready world coordinates are unchanged.

## Known temporary limits

- The Colossus remains a front-biased 2D production representation when viewed from its rear.
- Transparent macro floor pieces contain authored raised edges; the continuous code-driven stone base is still responsible for closing their negative space.
- Offline QA approximates runtime projection/depth and cannot certify touch input, GPU cost or final Android contrast.
- Real Android validation is pending.

## Validation results

- TypeScript: PASS (`tsc -b`, zero errors).
- Complete tests: PASS — 15 files, 132/132 tests.
- Production build: PASS — Vite 7.3.6, 773 modules.
- Main JS: 498.84 kB raw / 151.53 kB gzip.
- CSS: 34.27 kB raw / 8.56 kB gzip.
- Built `dist`: 5,664,914 bytes (94 files).
- Runtime `public/assets`: 4,845,066 bytes (82 files).
- M09.3 runtime terrain kit: 261,880 bytes (6 files).
- Offline QA: PASS — five deterministic PNGs, 12,099,132 bytes.
- Asset manifest audit: PASS — 81 referenced runtime paths, zero missing.
- Terrain alpha audit: PASS — 6/6 runtime WebPs plus RGBA source master.
- Map bounds/coverage/corridor/camera audits: PASS through the M09.3 test suite.
- Preview HTTP smoke: PASS — HTML, main JS, terrain, Hero and Colossus returned HTTP 200.
- Visual browser automation: unavailable; `agent-browser` is absent and the installed Playwright package has no browser executable.
- Real Android validation: PENDING.
- ZIP size and SHA-256 are recorded after final packaging in the completion report.
