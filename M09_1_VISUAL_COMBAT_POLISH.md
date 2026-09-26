# M09.1 — Visual Vertical Slice, Boss Presence & Combat Feel

## Scope result

M09.1 preserves M09 gameplay: 5600×4000 world, physical boss entity, free planar camera, zoom, analog movement, timed dash, boss-relative sectors, spatial attacks, save/resume and future multiplayer boundaries. No economy, networking, mode, progression pillar or boss was added.

## Android evidence audit

The supplied 51.87-second real-device recording showed a working large arena but exposed five dominant presentation gaps: polygon-symbol boss art, repeated stone grid, flat oversized telegraph fills, tiny low-desire loot and insufficient material/grounding depth. Those areas received the milestone budget.

## Changed and new files

New:

- `public/assets/harvest-colossus-master.webp`
- `src/render/GroundDecalSystem.ts`
- `src/render/TelegraphRenderer.ts`
- `src/render/M09_1VisualPolish.test.ts`
- `M09_1_VISUAL_COMBAT_POLISH.md`

Changed:

- `src/assets.ts`
- `src/config.ts`
- `src/gameplay/ArenaCamera.ts`
- `src/render/ArenaLayer.ts`
- `src/render/EffectsLayer.ts`
- `src/render/GameScene.ts`
- `src/styles.css`
- `README.md`
- `PRODUCTION_ASSET_SPEC.md`
- package metadata

## Harvest Colossus

- A transparent 1280×1139 WebP master is loaded through `boss.halloween.base`.
- The master keeps dark angular stone, monumental shoulders/arms/legs, orange eyes/core and restrained purple corruption.
- The physical boss transform, footprint and world projection remain unchanged.
- Code layers retain the soft double contact shadow, footprint darkening, ground debris, core pulse, hit flash, structural cracks, breakpoint overlays and death transition.
- Active telegraphs now drive subtle anticipation lift/lean and impact compression; major impacts add bounded stone debris, shockwave and recoil.
- Missing or failed master texture restores the complete M09 procedural boss.

## Arena and landmarks

- The old regular 20×25 floor cadence was replaced by 176 deterministic irregular stone plates plus 46 bounded wear/debris patches.
- Macro regions and cycle color changes remain.
- Boss footing gains a larger soft shadow, darker inner footprint, localized debris and low-intensity crack energy.
- Landmark fallbacks now include larger broken arches and multi-plane rocks in addition to crystals, pillars, roots, statues and fissures.
- Landmark production slots are consumed when textures exist; otherwise each object uses its procedural fallback.
- Static world art is rebuilt only on theme/cycle/break changes, never per frame.

## Telegraphs and aftermath

- `TelegraphRenderer` owns presentation, leaving attack simulation unchanged.
- Warning centers remain below 5% opacity; urgency is conveyed through broken edges, converging rings, cracks and directional bands.
- Circle, ring, line and cone families have distinct floor language.
- Impact history is stored by `GroundDecalSystem`, capped at 24 items and expired deterministically.
- Aftermath uses scorch/corruption tint and broken radial cracks rather than another opaque disc.

## Creature, dash and combat feedback

- M09 gameplay scale and movement controller are unchanged.
- Existing locomotion squash/stretch, lean, braking and shadow response remain.
- Dash preserves timing/invulnerability and gains the existing restrained pooled trail/landing response.
- Major boss attacks now produce stronger localized debris and ground reaction.
- Damage numbers avoid stacking at one identical coordinate, stay pooled and retain separate Power Hit hierarchy.
- VFX pools expose test-only lifecycle counts; no particles, texts or shockwaves are allocated per hit.

## Loot and pet

- Common, Rare and Epic pickup silhouettes are scaled for actual phone readability.
- Rare/Epic retain bounded vertical beams, contact shadows, pulse, physical arc/bounce and magnet pickup.
- Ember Wisp remains unobtrusive but is larger and easier to track in world space.

## Camera and HUD

- Free LOOK, manual pan, pinch/wheel zoom, reset and boss-off-screen behavior remain.
- Follow look-ahead was reduced from 260 to 205 world units and follow interpolation calmed.
- Shake decays faster; manual input remains authoritative.
- A small edge chevron indicates an off-screen boss direction without forcing framing.
- Boss bar, controls and vitals use tighter dark translucent presentation; joystick/utility chrome is quieter.
- No permanent zoom controls were restored.

## Asset slots and fallback behavior

Integrated:

- `boss.halloween.base` → `harvest-colossus-master.webp`

The integrated master was generated with the supplied approved arena mockup as the visual reference. Final generation prompt: “Create a single transparent-background 2D/2.5D production game sprite of the Harvest Colossus: a massive ancient humanoid boss made from dark angular broken stone armor, monumental shoulders, heavy arms and grounded legs; bright restrained orange eyes and an unstable faceted orange chest core shining through cracks; subtle localized purple corruption on one side; premium stylized dark-fantasy mobile-game rendering, strong readable silhouette, front three-quarter camera, consistent top-left moon/cool rim and warm core light. Full body centered with generous safe margins, no arena, floor, shadow, UI, text, frame, other characters, pumpkin head, tree-golem anatomy, troll anatomy, cartoon comedy, gore, photorealism or clipped limbs.”

Ready but currently procedural:

- Creature base and four mutation attachments
- Six evolution masters
- Standard boss and Halloween damage stages
- Floor detail, ruin pillar, crystal, rock, fissure, corruption/root and landmark textures
- Common/Rare/Epic loot
- Ember Wisp
- Projectile, Power Hit, impact, telegraph noise, crack and scorch VFX

Every optional slot is resolved by `AssetRegistry`. A missing/failed asset never changes gameplay and never produces an invisible gameplay object.

## Performance caps

- Ground decals: 24
- Loot entities: 36
- Low/Medium/High particles: 68/130/180
- Floating texts: 10/16/22
- Shockwaves: 3/6/8
- Debris per effect: 10/18/26
- No per-frame texture creation
- Static floor and landmarks are cached Graphics/production sprites
- Reduced Effects only changes presentation density

## Validation and risks

Automated validation covers asset fallback, master slot mapping, decal capacity/expiry, telegraph urgency/opacity, pooled VFX caps/lifecycle and boss state mapping in addition to the complete M09 suite.

Known risks:

- Base Creature, mutation attachments, non-Halloween boss, damage-stage masters, arena landmarks, loot and pet still use procedural fallback art.
- Damage stages overlay the aligned base master; bespoke aligned break art is still pending.
- Landmark occlusion is only partially simulated by existing world depth architecture.
- Physical Android validation is required for final telegraph contrast, boss scale, touch coexistence, thermal/GPU behavior and comparison video.

SOURCE VALIDATION and exact bundle results are recorded in the final milestone report.
