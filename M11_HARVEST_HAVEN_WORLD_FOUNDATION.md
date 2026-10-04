# M11 — Harvest Haven World Foundation

## Purpose

M11 changes the default experience from a boss-arena-only prototype into the first playable world loop. The existing Harvest Colossus arena remains intact as the first raid and is entered through a physical portal in Harvest Haven.

This is a foundation slice, not a complete MMORPG. It establishes the source boundaries required for additional maps, NPC dialogue, quests, classes, parties and server authority without coupling those systems to Three.js or the local camera.

## Runtime flow

1. The default URL opens **Harvest Haven**.
2. The Hero can move through the town square, between buildings and into the Southfields.
3. Nearby field monsters are targeted by the existing visible projectile presentation.
4. Defeated monsters grant separate Hero XP and Job XP, progress kill quests, drop a physical reward and respawn.
5. At Hero Level 15 and Job Level 20 the class-selection surface offers Vanguard, Ranger or Arcanist.
6. The northern Rift Gate enters the existing Harvest Basin raid (`?map=raid`).
7. A physical return portal in the raid leads back to Harvest Haven (`?map=haven`).

## Harvest Haven composition

- Central paved town square and crystal shrine
- Haven Hall / class and civic anchor
- Inn
- Forge
- East and west homes
- Two market stalls
- Town and farm gates
- Roads, southfield furrows, stream and tree boundary groups
- NPC positions for Warden, class mentor, smith, merchant and Rift Keeper
- Southfields with Mosslings, Stonebeaks and a Corrupted Sprout

All buildings and major props use deterministic map data and collision shapes. The visual kit is lightweight procedural Three.js geometry for this foundation; it is intentionally replaceable by authored GLB/glTF modules later.

## Progression

Persistent world progression now contains:

- `playerLevel` / Hero Level
- `playerXp`
- `jobLevel`
- `jobXp`
- optional `classId`

Old schema-v1 saves migrate to schema v2 without losing the guest ID or Hero progress. Class eligibility is owned by `WorldProgression`, not UI:

```text
Hero Level >= 15
AND Job Level >= 20
AND no class selected
```

The three current class names are production working names and data definitions. Their full skill trees and final balance are deliberately not invented in this pass.

## Data and simulation boundaries

- `WorldMapDefinition.ts` owns reusable map, actor, portal and quest contracts.
- `HarvestHavenMap.ts` owns authored positions, buildings, collisions, NPCs, monsters and portals.
- `FieldMonsterSystem.ts` owns monster HP, defeat and respawn independently of rendering.
- `WorldQuestSystem.ts` consumes defeat events.
- `WorldProgression.ts` owns Hero/Job XP and class eligibility.
- `WorldPortalSystem.ts` owns physical proximity and level requirements.
- `HarvestWorldVerticalSlice.ts` composes those systems for the local browser slice.
- `HybridWorldRenderer.ts` only consumes state and builds the visual representation.

Camera yaw, pitch, pan and user zoom remain local presentation state. They do not change simulation coordinates, XP, monster state, portals or class state.

## Mobile presentation

The world HUD is intentionally quieter than the raid HUD:

- location panel
- compact Hero and Job progression
- two compact quest rows
- contextual portal button
- temporary target HP
- class selection only when eligible

Joystick, dash, Power Hit, camera drag, pinch/wheel zoom and fullscreen continue to use the existing controls. Portrait and landscape receive separate compact placement rules.

## Current limitations

- Monsters currently provide deterministic farm targets and respawn but do not yet chase or attack the Hero.
- NPCs have identity, role and world position but dialogue is not implemented yet.
- Quest state is session-local; Hero/Job/class progression is persistent.
- Buildings are coherent low-poly procedural modules, not final production GLB assets.
- The town and Southfields share one continuous map; additional connected maps are future content.
- Browser visual capture was blocked by the execution environment's localhost policy. HTTP startup, TypeScript, automated tests and production build were validated.
- Physical Android and iOS validation remain pending.

## Validation

- TypeScript: PASS
- Automated tests: 193 / 193 PASS
- Production build: PASS
- Preview HTTP smoke: 200
- Missing new runtime image assets: none; the new world uses shared procedural geometry and existing Hero/projectile/loot assets
- Real Android: PENDING
- Real iOS: PENDING

