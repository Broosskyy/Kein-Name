# M10.3 — Hybrid 3D Visual Coherence & Directional Rebuild

## Scope and real-device findings

M10.3 retains the M10.2 Three.js/Pixi hybrid renderer, simulation, movement, combat and 2D fallback. It addresses the real-device findings that foreground rocks could obscure most of a portrait view, Hero frames visibly popped, the Hero could clip into raised surfaces, the Boss appeared twice and always presented its front, projectiles lacked contrast, and the dark arena compressed most geometry into black silhouettes.

No progression, currency, account, networking, shop, backend or meta system was added.

## Camera

- Orbit state remains real 3D `yaw`, `pitch`, `distance` and `target`; pitch is clamped to 28–68 degrees and changes camera orientation rather than shifting a 2D crop.
- Free-world one-finger drag controls yaw/pitch. Pinch/wheel controls dolly. Explicit pan remains available separately.
- Manual input suppresses Boss bias for 2.6 seconds and it returns with a slow blend. The Boss can remain completely off-screen.
- `HybridCameraObstruction` tests the segment between camera target and desired camera position against registered structural volumes. A hit retracts quickly and recovers slowly to avoid camera popping.
- Structures that still intersect the Hero sightline fade to 16% through per-object cloned materials. Opacity and `depthWrite` recover smoothly; shared material state is never changed globally.
- DEV F3 metrics expose retraction state and faded-occluder count.

## Hero grounding

- `HybridGroundSampler` remains the single deterministic description of base terrain, approach, paving corridor, Basin, inner Basin and four raised side shelves.
- `HeroGroundingController` snaps upward immediately so the Hero cannot enter a newly raised surface, while downward changes settle smoothly.
- Hero feet use `groundHeight + 0.035m`; shadow and selection ring use the same sampled ground plus a small z-fighting epsilon.
- The 32-frame set now shares one measured 0.1042 bottom anchor and one 384×384 padded runtime footprint.

## Hero directional asset audit and flicker root cause

The full `8 directions × 4 poses` set was inspected. Many extracted cells contained detached neighbor-frame fragments, inconsistent internal bounds and different footlines. Those defects looked like texture flicker even when the renderer selected the correct texture.

`scripts/normalize-directional-hero.mjs` now:

1. identifies alpha-connected components;
2. keeps the authored main creature and antialiased edge neighborhood;
3. removes disconnected sheet bleed;
4. normalizes the creature into a stable 318×300 content area on 384×384 transparent output;
5. writes `production-assets/audit/hero-directional-audit.json`.

Directional hysteresis was increased, run/idle thresholds remain asymmetric, and attack facing is captured once at attack start rather than recomputed every frame. Textures are preloaded and changed only when direction or pose actually changes. F3 reports direction, pose and texture swaps per second plus current asset and anchor.

## Boss duplicate root cause and fix

M10.2 rendered both an opaque low-poly `bossBody` and the production front Sprite at the same world position. This was the observed double Boss. The normal low-poly body path and its materials were removed. The collision/attack proxy remains under `debugRoot` and is invisible unless explicit DEV debug mode is enabled. Exactly one normal gameplay Boss visual is added to the scene.

## Boss multi-angle strategy

A coherent transparent source sheet was generated from the existing production Colossus design and retained at:

`production-assets/source/harvest-colossus-directional-kit-01.png`

The extraction pipeline validates alpha and exports eight isolated 512×512 WebP views:

- front, front-left, left, rear-left
- rear, rear-right, right, front-right

`BossDirectionalState` selects the view from the camera angle relative to the authoritative Boss orientation, with angular hysteresis and a 120ms lock. All textures are preloaded. Each view has a calibrated foot anchor, one world position and one scale. The proxy continues to define footprint/front/flanks/rear without becoming a second production visual.

Current limitation: the directional set is an AI-assisted 2D impostor kit, not a rigged 3D Colossus. State-specific Break I/II/Core damage still uses existing simulation/HUD state and is not yet represented by 32 additional direction-state textures.

## Projectile and impact readability

- Normal and Power cores are larger and use stronger, controlled emissive contrast.
- Trails are 1.65m world-space geometry with additive cyan/orange materials.
- First appearance produces a short launch burst at the source world position.
- Impact combines a ring, local core burst and crossed energy strokes at the hit world position.
- Power impact is larger, longer and requests a restrained camera impulse.
- The existing camera-independent projectile simulation and impact-timed damage remain authoritative.

## Lighting, scale and world composition

- Tone-map exposure, hemisphere contribution and key light were lifted without washing out the dark Harvest palette.
- A low-cost cool fill separates stone silhouettes; orange core lighting was reduced to avoid overexposure.
- Ground and stone values no longer crush to near-black.
- Near-playfield rocks were scaled down and pushed toward the outer arena; collision data follows the new composition.
- Crystal scale and emission were reduced, corruption was desaturated, and boundary rocks were reduced.
- Visual scale guideline: Hero 2.05m, Boss 6.35m, pillars 2.6–4.8m, arches 4.1–5.4m, crystals 0.65–1.8m, rocks 0.55–1.85m. These values are presentation only.

## Mobile input and performance

Existing pointer arbitration remains: joystick and combat controls never start camera gestures; free-world drag does; pinch performs dolly. Camera obstruction uses inexpensive analytic X/Z volumes instead of per-frame mesh raycasts. Faded objects clone materials once at registration. Projectile geometry/materials remain pooled and reused. Directional textures are cached before first selection.

The initial JavaScript chunk remains large (approximately 1.046MB minified / 292KB gzip) because Three.js and Pixi are still in one entry graph; code splitting remains a known payload optimization.

## Web-first and future crossplay

The browser runtime remains the master gameplay core. A later Capacitor wrapper can package the same web runtime for Android/iOS. Camera, input and renderer state are local presentation state; world coordinates, Hero/Boss state, projectiles, damage and collision remain camera-independent and can later be replicated by one shared server/account/world-state layer. There is no platform fork and no networking in M10.3.

## Tests

Focused coverage includes pitch/yaw/bias behavior, obstruction retraction/recovery, near-occluder fade, Hero ground sampling and upward safety, attack direction lock, 32-frame anchor/audit integrity, eight Boss views, single Boss render path, projectile spawn/flight/single hit/power distinction, and all prior gameplay regressions.

Validation results are recorded from the final commit preparation:

- `npm ci`: PASS
- `npx tsc -b --pretty false`: PASS
- `npm test -- --run`: PASS — 160/160
- `npm run build`: PASS
- asset existence / zero-byte audit: PASS
- runtime HTTP startup: PASS — preview returned HTTP 200 and served a directional Boss asset
- browser visual capture: PENDING (no browser executable in the execution environment)
- physical Android/iOS: PENDING

## Remaining limitations

- The Boss views are high-quality impostors; they cannot provide true mesh parallax or articulated rear attacks.
- Break-state directional texture matrices are not produced in this milestone.
- Structural obstruction uses conservative authored volumes rather than a general-purpose physics spherecast.
- Grounding uses deterministic walkable zones rather than arbitrary triangle-mesh raycasts; it covers every authored walkable surface in the current slice.
- Final readability, camera comfort and fade timing require another physical portrait-device recording.
