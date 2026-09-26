# Mutation Boss M05 — Production Asset Specification

## Locked visual direction

Premium stylized dark-fantasy creature evolution; Halloween uses dark harvest / cursed Halloween. Favor a strong silhouette, large readable material planes, controlled detail, upper-left moon/rim light and mobile readability. Avoid anime, photorealism, childish proportions, gore, generic neon and mixed rendering styles.

## Character DNA

Every creature image must depict the same original fantasy creature: compact pear-shaped torso, distinct shallow head/forehead plane, two narrow oval eyes with small upper highlights, broad low stance, two separate feet, asymmetric side-fin/ear silhouette and a short curved tail. Three-quarter front view, facing slightly right; no human anatomy, recognizable animal species, ball-with-eyes or generic slime. Keep the face, eye spacing, posture, ground point and lighting direction stable. Mutation 1 may expand the silhouette roughly 8%; an integrated two-mutation evolution roughly 15–20%. Render scale is presentation-only and never changes combat math.

## Delivery rules

- Creature, evolution, boss, parts and icons: transparent WebP preferred; PNG accepted when edge fidelity requires it.
- No text, UI, frame, baked floor, shadow or scene background unless the slot says otherwise.
- Use premultiplied-alpha-safe edges, sRGB color, generous transparent margins and no clipped wings/crystals.
- Boss stages must share an identical canvas, camera, origin and proportions. Do not independently regenerate stages.
- Arena files contain no boss, creature or UI.
- File names are lower-case kebab-case under `public/assets/m05/`; set the matching `src` in `src/assets.ts`.

## Character and mutation slots

| Asset ID | Purpose / state | Size / aspect | Alpha | Anchor / safe margin | Art direction | File | Fallback / integration |
|---|---|---:|:---:|---|---|---|---|
| `creature.base` | Combat base character | 768×768, 1:1 | Yes | center; ground at y 70%; 12% margin | Character DNA, pale stone/pearl material, reserved silhouette | `creature-base.webp` | Procedural base in `GameScene.createCreature` |
| `creature.mutation.crystal` | Modular Crystal growth | 768×768, 1:1 | Yes | same center/canvas as base; 12% | 3–5 directed faceted growths, cool core light, dark structural faces | `mutation-crystal.webp` | Procedural faceted spikes |
| `creature.mutation.void` | Modular Void change | 768×768, 1:1 | Yes | same center/canvas; 12% | asymmetric dark material, veins, few runes, bright eyes | `mutation-void.webp` | Procedural corruption/eyes/runes |
| `creature.mutation.wings` | Modular wings behind body | 1024×768, 4:3 | Yes | body center x50/y55%; 9% | broad segmented leading edge, structured membrane, clear body connection | `mutation-wings.webp` | Procedural segmented wings |
| `creature.mutation.pumpkin` | Modular cursed shell/vines | 768×768, 1:1 | Yes | same center/canvas; 12% | charred shell, internal fire cracks, vines; never a hat | `mutation-pumpkin.webp` | Procedural shell/vines |

Modular anchor coordinates in design space are defined by `CREATURE_ANCHORS`: head (0,-55), body (0,-7), back (0,-58), wings (±45,-37), attack (63,-24), ground (0,70).

## Integrated evolution hero slots

These are complete character replacements, not stacked accessories. All preserve Character DNA and the base camera.

| Asset ID | Purpose / visual state | Size / aspect | Alpha | Safe margin | Integrated art direction | File | Fallback |
|---|---|---:|:---:|---|---|---|---|
| `evolution.voidshard` | Crystal + Void, heavy | 1024×1024, 1:1 | Yes | 12% | large mineral armor; Void energy between plates | `evolution-voidshard.webp` | Integrated procedural armor/crystals/veins |
| `evolution.skyshard` | Crystal + Wings, aerial | 1280×1024, 5:4 | Yes | 10%, wings unclipped | crystal grows along aerodynamic wing structure | `evolution-skyshard.webp` | Crystal wing braces + aura |
| `evolution.nightwing` | Void + Wings, predator | 1280×1024, 5:4 | Yes | 10% | lean dark wing silhouette, bright eyes, controlled veins | `evolution-nightwing.webp` | Dark body plate + Void wing lines |
| `evolution.jack-o-void` | Pumpkin + Void hero | 1024×1024, 1:1 | Yes | 12% | strong upper shell, orange fire inside violet corruption, dark vines | `evolution-jack-o-void.webp` | Integrated shell, Void arcs and embers |
| `evolution.harvestshard` | Pumpkin + Crystal | 1024×1024, 1:1 | Yes | 12% | mineral growth ruptures organic shell; warm core/cool exterior | `evolution-harvestshard.webp` | Faceted shell + crystal eruptions |
| `evolution.hollowwing` | Pumpkin + Wings | 1280×1024, 5:4 | Yes | 10% | lighter harvest body, large dark wings, ember veins | `evolution-hollowwing.webp` | Harvest body plate + vine wing structure |

## Boss and arena slots

| Asset ID | Purpose / state | Size / aspect | Alpha | Anchor / safe margin | Art direction | File | Fallback / integration |
|---|---|---:|:---:|---|---|---|---|
| `boss.halloween.base` | Harvest Colossus stage 0 | 1280×1280, 1:1 | Yes | center; core at x50/y55%; 8% | massive asymmetric stone, roots, contained pumpkin core | `boss-harvest-base.webp` | Procedural Colossus |
| `boss.halloween.damage1` | 70–40%, aligned stage | 1280×1280 | Yes | pixel-aligned to base | one missing armor area, exposed roots/cracks/core | `boss-harvest-damage-1.webp` | Base plus code cracks/plate offsets |
| `boss.halloween.damage2` | under 40% and death pre-break | 1280×1280 | Yes | pixel-aligned to base | major silhouette break, unstable core, damaged roots | `boss-harvest-damage-2.webp` | Base plus critical overlay |
| `boss.standard.base` | Non-event Colossus | 1280×1280 | Yes | same boss rules | cool fractured stone | `boss-standard-base.webp` | Procedural standard boss |
| `boss.standard.damage1` | Standard stage 1 | 1280×1280 | Yes | aligned | exposed cool cracks | `boss-standard-damage-1.webp` | Code overlay |
| `boss.standard.damage2` | Standard stage 2 | 1280×1280 | Yes | aligned | broken silhouette/core | `boss-standard-damage-2.webp` | Code overlay |
| `boss.core` | Optional shared core insert | 384×384, 1:1 | Yes | center; 14% | bright center, darker housing edge | `boss-core.webp` | Procedural faceted gem |
| `arena.halloween.background` | Hero background | 1600×1200, 4:3 cover | No | focal center upper 55%; quiet lower combat plane | giant moon, distant ruins/trees, dark skyline | `arena-halloween-background.webp` | Layered procedural arena |
| `arena.halloween.foreground` | Optional edge framing | 1600×1200, 4:3 cover | Yes | center clear 55%, bottom/side content only | roots, fog banks, ruined edges | `arena-halloween-foreground.webp` | Code fog/vignette |
| `arena.standard.background` | Non-event background | 1600×1200, 4:3 cover | No | same composition | cool ruined arena, low detail | `arena-standard-background.webp` | Procedural standard arena |

For boss stage production: paint stage 0 once, then derive stage 1 and 2 from the same layered master. Independent AI generations are not acceptable because alignment and anatomy drift break hit reactions.

## Mutation icon slots

| Asset ID | Purpose | Size | Alpha | Safe margin | Art direction | File | Fallback |
|---|---|---:|:---:|---|---|---|---|
| `icon.mutation.crystal` | Choice/UI identity | 256×256 | Yes | 16% | one faceted cluster, cool edge | `icon-crystal.webp` | CSS vector icon |
| `icon.mutation.void` | Choice/UI identity | 256×256 | Yes | 16% | dark core with restrained echo ring | `icon-void.webp` | CSS vector icon |
| `icon.mutation.wings` | Choice/UI identity | 256×256 | Yes | 12% | mirrored segmented wing silhouette | `icon-wings.webp` | CSS vector icon |
| `icon.mutation.pumpkin` | Choice/UI identity | 256×256 | Yes | 16% | cracked charred shell/internal fire | `icon-pumpkin.webp` | CSS vector icon |

## Additional optional slots

`essence.crystal`, `essence.void`, `essence.wings`, `essence.pumpkin` use 256×256 transparent files; `ui.powerHit` uses 512×192 transparent art. They are lower priority because current code visuals already animate and read well.

## Web budget and validation

- Target hero texture maximum: 1280 px; never ship 4K art for this composition.
- Prefer WebP; keep each creature/evolution under ~250 KB, boss stage under ~350 KB, arena background under ~450 KB, icon under ~35 KB.
- Essential initial production payload target: ≤2.5 MB. Defer collection-only evolution images if the set exceeds this.
- At 1280² RGBA, decoded GPU memory is ~6.25 MiB per texture; avoid retaining every hero stage simultaneously on low-memory devices.
- Validate transparent edges at DPR 1 and 1.25, 360×780 portrait, dark background, mutation acquisition scale overshoot, reveal scale, and missing/failed-file fallback.

## Production priority

1. One aligned `boss.halloween.base/damage1/damage2` layered master set.
2. `creature.base` master establishing immutable Character DNA.
3. `evolution.jack-o-void` as Halloween key hero, derived from the base master.
4. Remaining five integrated evolution heroes from the same master.
5. Four mutation icons, then arena background and modular mutation parts.

## M08 world-production slots

M08 adds a deliberately small set of deferred semantic slots. All use procedural world fallbacks today.

| Asset ID | Recommended | Alpha | Direction / alignment | Fallback |
|---|---:|:---:|---|---|
| `arena.landmark.crystal` | 512×768 | Yes | One large readable corrupted crystal formation; ground at y92%; moon rim from upper left | Faceted world landmark |
| `arena.landmark.pillar` | 512×1024 | Yes | Broken monumental dark-stone pillar, no baked floor; 10% side margin | Layered stone pillar |
| `arena.landmark.harvestRoot` | 768×768 | Yes | Cursed branching root silhouette, restrained ember vein | Bezier root structure |
| `loot.common` | 192×192 | Yes | Compact essence pickup, readable at 18–24 CSS px | Material-specific procedural gem |
| `loot.rare` | 256×256 | Yes | Stronger outer silhouette; no beam baked in | Gem/relic plus code beam |
| `loot.epic` | 320×320 | Yes | Premium relic silhouette with generous glow-safe margin | Procedural chest/relic plus beam |
| `pet.emberWisp` | 384×384 | Yes | Small warm spirit, clear face/core, no trail/shadow baked in | Procedural ember wisp |

Code retains rarity beams, bounce, shadows, fog, landmark break dust and lighting. Assets must not bake effects that need to react to world state.

## M09 world-space extension slots

These remain deferred and always have procedural fallbacks.

| Asset ID | Recommended | Alpha | Purpose |
|---|---:|:---:|---|
| `boss.core.unstable` | 512×512 | Yes | Aligned unstable-core insert for final phase/cycles |
| `boss.armor.fragments` | 1024×768 | Yes | Aligned modular armor fragments; no debris trail baked in |
| `arena.floor.detail` | 1024×1024 | Yes | Seam-safe broad stone wear/detail, no gameplay markings |
| `arena.landmark.rock` | 512×512 | Yes | Large dark angular rock, ground anchor y90% |
| `arena.landmark.fissure` | 768×384 | Yes | Ground-aligned glowing crack without baked bloom |
| `arena.landmark.corruption` | 768×768 | Yes | Root/corruption cluster with clear walk-space silhouette |
| `loot.legendaryReady` | 384×384 | Yes | Reserved high-tier silhouette; tier is not content-enabled |
| `vfx.projectile` | 256×128 | Yes | Optional neutral projectile body, horizontal travel |
| `vfx.impact` | 512×512 | Yes | Optional impact material mask, no full-screen flash |
| `vfx.telegraphNoise` | 512×512 | Yes | Tileable monochrome telegraph noise/mask |

## M09.1 integrated production asset

| Asset ID | File | Status | Integration |
|---|---|---|---|
| `boss.halloween.base` | `public/assets/harvest-colossus-master.webp` | Integrated | 1280×1139 transparent WebP, 241 KB; world-projected boss master. Code retains ground shadow, core response, aligned damage cracks, recoil, debris and death effects. |

The current generated master is a near-production vertical-slice asset. Damage stages deliberately reuse the aligned base master plus code overlays until artist-generated stage files are supplied. Do not independently regenerate stages: derive them from the same layered boss master to preserve anatomy and pixel alignment.

New deferred M09.1 slots: `vfx.powerHit`, `vfx.crack` and `vfx.scorch`. Every slot remains optional and fails back to bounded code rendering.

## M09.2 coherent master-kit pipeline

M09.2 supersedes the one-off M09.1 runtime master with eight true-RGBA production sources in `production-assets/source/`. Related art is generated together so perspective, material, light and scale remain coherent. `npm run assets:extract` produces isolated WebP files with transparent padding for `public/assets/`; gameplay loads only these extracted files.

| Master source | Contents | Runtime destination | Status |
|---|---|---|---|
| `creature-base-modular-kit-01.png` | base master plus same-anatomy modular studies | `assets/creature/creature-base.webp` | Active |
| `arena-ruins-colossus-kit-01.png` | 8 ruin/rock assets | `assets/environment/arena-*.webp` | Active |
| `arena-crystal-corruption-kit-01.png` | 8 crystal/corruption assets | `assets/environment/arena-*.webp` | Active |
| `arena-ground-details-kit-01.png` | 8 floor-perspective decals | `assets/ground/ground-*.webp` | Active |
| `loot-kit-01.png` | Common A/B, Rare A/B, Epic A/B | `assets/loot/loot-*.webp` | Active |
| `combat-vfx-kit-01.png` | projectile, impacts and material masks | `assets/vfx/vfx-*.webp` | Projectile active; other masks integration-ready |
| `harvest-colossus-states-kit-01.png` | aligned Base/Break I/Break II/Core | `assets/boss/harvest-colossus-*.webp` | Active |
| `ember-wisp-master.png` | compact companion master | `assets/pet/ember-wisp.webp` | Active |

All sources and runtime exports are technically validated as RGBA with alpha 0 outside the art. No source has a checkerboard, presentation background, text, label or frame. The archived `harvest-colossus-m09-1-master.webp` remains under `production-assets/source/` as provenance and is not shipped to the browser.

### Active anchors and sizing

- Creature: center x50%, ground y77%; runtime height ~235 world units. Gameplay radius is unchanged.
- Ruins/crystals: center-bottom footpoint; authored target height controls world scale. Shadows are code-driven.
- Ground decals: center anchor; rotation and non-uniform scale are authored in `ArenaProductionArt.ts`.
- Loot: center with code-driven contact shadow, beam, bounce and magnet motion.
- Boss states: center x50%, ground y91%; all states share the same world footprint and collision.
- VFX: centered; projectile travel rotation remains code-driven. Trails and screen feedback remain code-driven.

### Remaining production gaps

The following slots intentionally retain procedural rendering until a coherent derived kit exists: modular Crystal/Void/Wings/Pumpkin attachments, six full evolution heroes, non-Halloween boss states, mutation icons, arena-wide background/foreground planes and UI art. Telegraph boundaries, trails, fog, dust, shadows, damage numbers, shockwaves and aftermath animation remain intentionally code-driven because they must react to gameplay state.
