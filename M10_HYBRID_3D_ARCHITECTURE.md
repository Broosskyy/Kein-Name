# M10 — Hybrid 3D Arena Foundation

## Status

- Source implementation: **PASS**
- Architecture decision gate: **HYBRID 3D VIABLE — PARTIAL; SOURCE PROOF PASSES, RUNTIME/DEVICE GATE PENDING**
- Runtime screenshot capture: **PENDING**
- Physical Android validation: **PENDING**

M10 is a controlled proof, not a full-map conversion. The default URL starts a deterministic 2200×2200 Hybrid 3D basin. `?renderer=2d` retains the complete M09.3 renderer as a safety and comparison path.

## Ausgangsproblem M09.3

M09.3 improved density and authored composition, but the player still moved through a depth-sorted illustration assembled from prerendered patches. Camera pan changed the crop rather than revealing perspective. Large props relied on manual Y sorting. The front-only production Colossus could be spatially classified but not convincingly seen from every side.

M10 tests the product claim at its most important boundary: can the existing renderer-independent simulation drive a real spatial arena without discarding the successful art, HUD, controls and game logic?

## Renderer evaluation

| Criterion | Three.js | Babylon.js | Decision impact |
| --- | --- | --- | --- |
| Vite/TypeScript integration | Small explicit scene graph and direct ESM imports | Strong complete engine/tooling surface | Three.js fits an isolated renderer beside Pixi with less framework overlap |
| Perspective camera | Direct `PerspectiveCamera` and explicit transform ownership | Strong ArcRotate/Universal camera stack | Explicit camera math better preserves the existing camera-mode semantics |
| glTF/GLB path | Official `GLTFLoader` addon | First-class SceneLoader pipeline | Both are viable for later models |
| Repeated geometry | `InstancedMesh` available for draw-call reduction | Thin instances/instances available | Both meet later full-map needs |
| Collision/physics | Application-owned simple collision is straightforward | More built-in systems and optional physics integrations | M10 intentionally needs only planar circle/box collision |
| Existing Pixi coexistence | Minimal renderer can share DOM HUD and simulation | Larger overlapping engine surface for this spike | Three.js has lower integration complexity here |
| Future multiplayer | Renderer remains a pure consumer of snapshots | Same | Neutral |
| Maintainability | Explicit modules; no hidden gameplay ownership | Productive if the project commits to Babylon systems | Three.js minimizes migration commitment during the proof |

Selected renderer: **Three.js 0.180.0** with `@types/three` 0.180.0. Three.js officially provides the required perspective camera, WebGL renderer, glTF loader path and instanced meshes. Babylon.js remains technically capable, but its broader engine surface does not benefit this narrowly isolated spike enough to offset added integration ownership.

Official references:

- https://threejs.org/docs/pages/PerspectiveCamera.html
- https://threejs.org/docs/pages/WebGLRenderer.html
- https://threejs.org/docs/pages/GLTFLoader.html
- https://threejs.org/docs/pages/InstancedMesh.html
- https://doc.babylonjs.com/features/featuresDeepDive/Exporters/glTFExporter

## Chosen architecture

```text
Authoritative simulation (2D planar units)
  ├─ Hero position / velocity / facing
  ├─ BossWorldEntity / attack scheduler
  ├─ loot and collision state
  └─ CombatModel
          ↓ read-only presentation snapshots
Hybrid3DVerticalSlice
  ├─ HybridWorldRenderer (Three.js)
  ├─ HybridCameraController (local only)
  ├─ HybridCollisionSystem
  └─ existing HTML/Pixi-oriented HUD assets
```

The renderer and camera never write authoritative gameplay coordinates. The only render conversion is `simulation (x,y) → Three.js (X=x/100, Y=elevation/100, Z=y/100)`. Camera state is not serialized or shared.

## Coordinate system and scale

| Item | Simulation units | Three.js meters |
| --- | ---: | ---: |
| Conversion | 100 | 1 |
| Test arena | 2200×2200 | 22×22 |
| Hero visual height | — | 2.35 |
| Hero collision radius | 38 | 0.38 |
| Boss footprint | 280×210 radii | 2.8×2.1 radii |
| Boss visual height | — | 8.7 |
| Default camera distance | — | 14.5 |
| Camera dolly limits | — | 8.5–21 |
| Camera pitch | — | 52° |
| Hero move speed | 520/s | 5.2 m/s |
| Dash peak speed | 1900/s | 19 m/s |

X is horizontal. Z is world depth. Y is elevation. Gameplay remains planar X/Z for M10.

## Test scene

`M10_HYBRID_TEST_SCENE` is deterministic and data-driven. It contains:

- real segmented terrain geometry with subtle height variation;
- raised Colossus basin and fourteen broken ring slabs;
- four boundary rock fields;
- one intact pillar, one broken pillar, one arch and two rock formations;
- a production Hero billboard, production Colossus world impostor and DEV 3D proxy;
- three seeded loot drops;
- one initial world-space ground telegraph;
- simple blocking colliders and a fully traversable boss footprint.

This deliberately proves structure before converting the entire 5600×4000 Harvest map.

## Camera architecture

The M10 camera is a true `PerspectiveCamera` with real position, pitch, target and dolly distance.

- **FOLLOW**: damped Hero anchor and velocity look-ahead; Hero is not hard-locked to exact center.
- **LOOK**: free manual X/Z inspection offset. Hero coordinates remain unchanged.
- **BOSS FOCUS**: locally frames a weighted Hero/Boss midpoint.
- **TACTICAL**: widens camera distance without changing world or combat values.
- **Reset**: smoothly removes manual offset and returns to FOLLOW.

Joystick and WASD write movement only. Free-area drag writes camera offset only. Pinch/wheel changes dolly only. The Boss may leave the viewport.

## Hero hybrid strategy

The Hero remains a directional 2D world entity for the spike. Existing 32 WebP frames are reused:

- Idle × 8
- Run × 8
- Dash × 8
- Attack × 8

The billboard faces the camera geometrically, while the selected artwork represents actual simulation-world movement direction. It is depth-tested, has a world-space blob shadow and is occluded naturally by pillars, the arch and rocks. A later rigged 3D Hero can replace only this presentation module.

## Boss proxy strategy

The Colossus has a true simulation position, orientation, elliptical footprint and relative sector logic. The production image is a temporary camera-facing world impostor anchored at that position. A DEV-only 3D body volume, footprint and forward arrow reveal the actual physical proxy.

Known limitation: the front-authored image is not a valid 360° final boss. Rear and extreme flank gameplay are spatially real, but visual fidelity there is temporary. The correct next art step is a stylized low-poly/rigged 3D Colossus or a deliberate multi-angle impostor set—not sprite warping.

## Terrain, structures, materials and lighting

- True mesh ground uses a subdivided plane with restrained deterministic height variation.
- The basin is a raised cylinder plus independent broken slabs.
- Pillars, arch, rocks and boundary masses are real low-poly geometry.
- Materials use inexpensive `MeshStandardMaterial`/flat shading, high roughness and a restrained dark-stone palette.
- Lighting is one hemisphere source, one directional source and one limited boss-core point light.
- Fog provides bounded distance separation without post-processing.
- No real-time shadow maps or full-screen filters are enabled. Contact shadows are inexpensive world discs.

## Telegraph and loot strategy

Existing `BossAttackSystem` remains authoritative. M10 converts each active shape into a floor mesh:

- circles use broken outer rings;
- rings use `RingGeometry`;
- beams use long narrow planes;
- cones use sector geometry.

Phase changes alter opacity/color while position remains fixed in world coordinates. Perspective and camera motion are automatic consequences of 3D placement.

Existing loot simulation and production silhouettes are retained. Loot uses depth-tested world sprites, contact shadows, airborne height, and bounded Rare/Epic beams.

## Collision

Collision remains intentionally lightweight and deterministic:

- arena bounds clamp;
- circle colliders for pillars/rocks;
- box colliders for major arch/boundary masses;
- existing elliptical Boss footprint constraint;
- small rubble remains non-blocking.

No heavyweight physics dependency is introduced.

## Existing asset migration matrix

| M09.3 asset family | M10 use | Long-term classification |
| --- | --- | --- |
| Directional Hero frames | Depth-tested world billboard | KEEP AS 2D for spike; evaluate rigged 3D later |
| Harvest Colossus states | World impostor | REPLACE LATER WITH 3D or multi-angle impostor |
| Loot kit | World billboards | KEEP AS BILLBOARD |
| Ground cracks/fissures | Art/material reference; code cracks in spike | USE AS DECAL in full migration |
| Ruins/crystals | Preserved in source/fallback renderer | USE AS BILLBOARD/texture selectively; replace major blockers with 3D |
| Arena macro terrain | Preserved for legacy renderer | USE AS MATERIAL/DECAL REFERENCE, not full ground plane |
| Combat VFX | Preserved | USE AS BILLBOARD/DECAL |
| Ember Wisp | Preserved; not rendered in the minimal slice | USE AS BILLBOARD later |
| HUD and controls | Existing screen-space DOM | KEEP AS 2D |

No M09.3 production asset was deleted.

## Performance and mobile risks

The slice uses geometry reuse, native frustum culling, simple materials, no shadow maps and no post stack. A DEV overlay reports renderer draw calls, triangles and resident texture count. DPR is capped at 1.7.

Known risks:

1. The current build contains both Pixi and Three because the migration fallback and `AssetRegistry` remain available; code splitting is the next payload task.
2. Alpha billboards can create overdraw on low-end Android GPUs.
3. Real device thermal stability, touch gesture arbitration and WebGL context recovery are not yet measured.
4. The production Boss texture is front-only and camera-facing.
5. The test geometry is intentionally architectural, not production 3D art.

## Validation

- TypeScript: PASS
- Automated tests: 140/140 PASS across 16 files
- Production build: PASS; Vite 7.3.6; 781 modules
- Preview HTTP smoke: PASS for index, main bundle, Hero and Boss assets
- Missing/zero-byte runtime assets: PASS
- Renderer constructor/type integration in production build: PASS; real WebGL-context initialization capture is PENDING
- Runtime visual capture: PENDING (no browser executable in the build environment)
- Physical Android: PENDING

The test suite covers coordinate round trips, deterministic scene contents, Hero X/Z movement, camera independence, smooth Follow reset, arena/prop collision, Boss sectors, and stable telegraph/loot world coordinates, alongside all retained M09 tests.

## Architecture decision gate

### HYBRID 3D VIABLE: PARTIAL — staged migration recommended after runtime gate

The spike resolves the specific architectural blockers:

- terrain and blockers have actual depth;
- camera movement reveals perspective rather than a shifted crop;
- the Hero is naturally occluded by structures;
- the Boss footprint and all relative sectors are real world positions;
- floor telegraphs remain attached under camera movement;
- loot remains spatial;
- camera state is demonstrably local-only.

Do not immediately rebuild every M09.3 system. The recommended next step is a real Android validation of this slice, followed by one production-quality 3D environment kit and a 3D/multi-angle Colossus proof. If frame pacing and touch behavior pass, migrate the 5600×4000 map region-by-region behind the same simulation adapters.
