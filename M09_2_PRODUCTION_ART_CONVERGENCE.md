# M09.2 — Production Art Convergence

## Scope and Android evidence

The supplied 58.72-second M09.1 Android capture was treated as current-player truth. It confirmed the 5600×4000 world, free camera, zoom, world boss, movement and telegraphs, while exposing the remaining gap: the production Colossus was surrounded by a crystal-heavy placeholder creature, sparse symbolic scenery, repetitive floor detail, weak loot silhouettes and oversized announcements. M09.2 changes presentation only; combat values, collision, movement, camera simulation, drops and progression are unchanged.

Post-change physical-device validation is still required. Source checks cannot establish final Android frame pacing, touch interaction, thermal behavior or visual composition.

## Production method

Related assets were created as coherent high-resolution master kits, then extracted into individual runtime files. This prevents the perspective, light, material and detail drift caused by independent generations.

Pipeline:

1. Generate one transparent master for each visual family.
2. Verify true RGBA and alpha=0 outside painted pixels.
3. Crop fixed isolated cells with transparent safety padding.
4. Downsample for mobile and export lossless-alpha WebP.
5. Register semantic paths in `src/assets.ts`.
6. Load the individual runtime file; retain procedural fallback on missing/failed load.

Rebuild runtime exports with `npm run assets:extract`. The original sources stay under `production-assets/source/`; runtime art stays under `public/assets/`.

## Generation prompt set

All generation used the built-in image-generation model with transparent background enabled. The shared prefix locked premium stylized 2.5D dark fantasy, three-quarter arena perspective, dark angular stone, restrained orange corruption and upper-left lighting; it prohibited text, labels, frames, scenery and overlapping cells.

- **Kit 01 — Base Creature:** one exact compact cream/charcoal creature with large blue eyes, restrained ears/feathers/horns and readable paws; full master plus same-anatomy head, torso, legs, tail and attachment studies; no crystal/elemental redesign.
- **Kit 02 — Ruins:** 4×2 isolated huge arch, broken arch, tall/broken pillars, wall, rock formation, rubble and altar; one stone material/perspective/light language.
- **Kit 03 — Crystal/Corruption:** isolated small/medium/large crystals, corrupted crystal, root, corrupted stone/ruin and shard cluster; restrained cyan/violet.
- **Kit 04 — Ground:** top-biased 2.5D floor decals for crack, impact crack, orange/dormant fissure, scorch, corruption, rubble and crystal fragments; no rectangular plate.
- **Kit 05 — Loot:** two distinct silhouettes at each Common/Rare/Epic tier; physical relic/material objects rather than recolors; no baked rarity beam.
- **Kit 06 — VFX:** isolated normal/Power projectile, small/large impact, shockwave, crack, corruption and pickup masks with generous glow-safe separation.
- **Kit 07 — Boss states:** the same Harvest Colossus four times with identical camera, proportions, anchor and footprint; Base, Break I, Break II and Core Unstable only change structural damage/energy.
- **Ember Wisp:** compact warm-core/dark-shell companion with a quiet silhouette and no baked trail or floor.

## Runtime art and composition

### Creature

`creature.base` now resolves to a clean cream/charcoal master rather than the crystal-heavy fallback. Its sprite uses the existing locomotion pose, lean, braking compression, dash deformation, contact shadow and collision. Logical HEAD/BACK/SIDE/TAIL/WINGS/CORE/PAWS attachment zones remain compatible with future mutation modules.

### Arena

`ArenaProductionArt.ts` replaces random scatter with a deterministic authored composition: 22 major/secondary props and 16 ground-detail placements form a Boss Core zone, open inner ring, ruin sector, crystal sector, corrupted sector and outer broken arena. Large arches, walls and pillars establish scale while open combat lanes remain clear. Prop footpoints drive depth; suitable tall props move between rear and foreground planes as the player passes them. Cheap code shadows and camera culling protect mobile performance.

### Ground

The M09.1 irregular cached floor remains. Production decals add quiet/detail contrast through rotated cracks, fissures, rubble, scorch, corruption and crystal fragments without restoring a grid. Telegraphs remain above ground detail and retain their broken-contour floor language.

### Loot and pet

Common, Rare and Epic use different physical silhouettes, with A/B variants chosen deterministically. Bounce, landing, shadows, pulse, rarity beams, magnet movement and pickup remain code-driven. Ember Wisp uses the production master while its follow, hover, lighting and pickup utility remain simulation-driven.

### Boss states

Base, Break I, Break II and Core Unstable now originate from one aligned four-state master. The resolver maps health/event state to the correct texture without altering footprint or combat. Raster motion was restrained to translation/rotation/small scale impulses; localized core, debris, hit and floor response remain code-driven.

### Projectiles and VFX

Normal and Power Hit projectiles use extracted art when available. Travel, trails, mutation color, impact timing, particles and camera feedback stay code-driven. Remaining impact/shockwave/corruption/pickup textures are registered and ready for incremental hybrid use; procedural effects remain active until their integration improves rather than obscures readability.

## HUD and announcements

Regular combat HUD structure is retained. `WINGS AWAKENED`/break announcements now use a compact translucent treatment, a 650–1500 ms bounded lifecycle and shorter default holds. The permanent mutation strip and zoom buttons remain absent.

## Fallback and safety

Every semantic asset follows `loaded → production` and `missing/failed → procedural fallback`. Loaded art hides obsolete fallback geometry to prevent double rendering. No Pixi object enters a save; quality only changes visual density. The DEV Visual Catalog reports `PRODUCTION`, `FALLBACK`, `MISSING` or `FAILED` for major slots.

## Performance budget

- 44 runtime WebPs: 2,332,088 bytes before build copy.
- 22 authored props and 16 decals, with view culling and quality-aware alpha/density.
- Static source sheets are not imported by application code and are excluded from the web build.
- Existing caps for projectiles, loot, debris, damage text, particles and aftermath remain.
- No real-time blur, per-frame texture creation or unbounded prop generation was added.

## Validation

Validation on 2026-09-26:

- TypeScript: PASS (`npx tsc -b --pretty false`).
- Tests: PASS, 107/107 across 13 files.
- Production build: PASS, Vite 7.3.6; 767 modules transformed.
- Preview HTTP smoke: PASS; index and representative Creature/Boss/Environment/Loot URLs returned HTTP 200.
- Manifest existence: PASS; 47 configured sources, 0 missing.
- Alpha validation: PASS; 53 source/runtime images have alpha and transparent pixels.
- Dist: 3,132,947 bytes total; 756,944 bytes JavaScript; 33,243 bytes CSS; 2,332,088 bytes runtime art.

Automated coverage includes manifest mapping, creature/environment/loot fallback, boss state resolution, deterministic composition, announcement lifecycle and the invariant that quality/art availability cannot change combat values.

## Known risks

- The Base Creature master is a single gameplay raster; modular parts are represented in the source kit but only the full master is wired at runtime in M09.2.
- Foreground occlusion is intentionally simple footpoint switching and may need per-asset masks after real-device review.
- Rich transparent sheets can show edge halos on some Android GPU/browser combinations; real-device close/wide zoom review remains required.
- Production asset decode/GPU memory is higher than procedural-only M09.1, although runtime images are downsampled and off-screen props are culled.
- Final post-change Android screenshot/video validation remains pending.
