# Harvest Colossus — Modern Social Action MMORPG Master Plan

Status: **Product direction locked / implementation planning baseline**

Reference model: **NosTale-like structure and progression, rebuilt as an original Harvest Colossus IP**

Platform order: **Browser first → installable PWA → Android/iOS wrapper**

Presentation: **Mobile first, portrait and landscape, desktop capable**

## 1. Product definition

Harvest Colossus evolves from a standalone boss-arena prototype into a browser-first social action MMORPG.

The intended reaction from an experienced NosTale player is:

> This has the familiar structure, motivation and rhythm of a modern NosTale, but it is clearly its own game.

The product deliberately retains the most valuable structural ideas:

- a social home city;
- connected field maps;
- Hero Level and Job/Calling Level;
- base classes plus transformable specialist-card equivalents;
- short story instances;
- repeatable group raids;
- equipment, rarity and reinforcement;
- companions, private space and social groups;
- long-lived character identity and collection progression.

It deliberately modernizes:

- camera freedom;
- direct movement and combat;
- mobile controls;
- UI density;
- onboarding;
- server authority;
- cross-platform delivery;
- content readability;
- art and animation quality.

It is not a licensed NosTale remake. No NosTale code, art, audio, text, maps, characters, names, quest scripts, exact UI, packet protocol or proprietary data may be copied. System behaviour may be studied and independently reimplemented with original expression.

## 2. Non-negotiable product principles

### 2.1 Familiar structure, original identity

System parity is desirable. Content duplication is not.

- Similar player motivation: yes.
- Similar progression layers: yes.
- Similar town/field/instance/raid rhythm: yes.
- Similar specialist transformation fantasy: yes.
- Identical names, maps, stories or assets: no.
- Pixel-identical UI or copied numbers: no.

### 2.2 The world dominates the screen

Normal gameplay must primarily show the world, Hero, enemies and other players.

Persistent HUD is limited to:

- compact Hero health/resource;
- current objective;
- minimap;
- equipped combat actions;
- movement control;
- context-sensitive party or boss information.

Inventory, skills, progression and social systems use dedicated mobile surfaces rather than overlapping desktop windows.

### 2.3 Camera freedom is a Harvest feature

Unlike the reference model, Harvest Colossus retains a true spatial camera:

- yaw/orbit;
- meaningful pitch up/down;
- player-controlled zoom/dolly;
- optional world pan/look;
- smooth Follow reset;
- contextual Boss Focus and Tactical modes;
- no mandatory Boss centring;
- Boss may leave the viewport;
- camera obstruction handling;
- local camera state never changes gameplay truth.

### 2.4 Mobile first does not mean simplified into an idle game

The game remains a directly controlled action MMORPG.

- analog movement;
- direct skill activation;
- real spatial positioning;
- readable telegraphs;
- dash/evasion;
- manual camera;
- build decisions;
- active raid mechanics.

Mobile reduction applies to interface clutter and simultaneous complexity, not to player agency.

### 2.5 Browser is the master client

- URL to play remains first class.
- Guest entry is supported before mandatory account friction where safe.
- The same gameplay core powers web, Android and iOS.
- Native apps are wrappers/distribution channels, not separate games.
- Accounts, saves and multiplayer state are shared.
- Camera and input adapt per platform; gameplay rules do not fork.

## 3. Parity classification

Every reference feature receives one of four labels.

| Label | Meaning |
|---|---|
| PARITY | Preserve the recognizable purpose and loop closely. |
| MODERNIZE | Preserve purpose but redesign interaction/presentation. |
| SIMPLIFY | Retain the value with fewer layers or currencies. |
| LATER | Architect for it, but exclude it from the first vertical slice. |

## 4. System parity matrix

| Reference function | Harvest equivalent | Decision | Initial scope |
|---|---|---:|---:|
| Central social town | Harvest capital / working name `Haven` | PARITY | One city district |
| Connected field maps | Region map network | PARITY | Two field maps |
| Adventure level | Hero Level | PARITY | Levels 1–15 slice |
| Job level | Calling Level | PARITY | Levels 1–20 slice |
| Base classes | Callings | PARITY | One playable, three designed |
| Specialist cards | Aspect Cards | PARITY | One playable, six designed |
| SP job level | Aspect Mastery | PARITY | One card progression |
| SP point allocation | Aspect Points | MODERNIZE | Compact node allocation |
| Elements/fairies | Affinities/Spirits | SIMPLIFY | Four affinities, no clutter |
| Time-Spaces | Story Rifts | PARITY | One complete Rift |
| Raid seals | Raid Keys | SIMPLIFY | One deterministic unlock path |
| Raids and raid boxes | Colossus Raids/Caches | PARITY | Harvest Colossus raid |
| NosMates | Companions | PARITY | Ember Wisp first |
| Partners | Combat Companions | LATER | Contract only |
| Miniland | Sanctuary | PARITY | Entry space later |
| Families | Alliances | PARITY | Domain planned, UI later |
| Channels | World Channels | PARITY | Server architecture boundary |
| Bazaar | Market | LATER | Server-authoritative only |
| Instant Combat | World Incursions | LATER | Event contract only |
| Act progression | Chapters/Regions | PARITY | Chapter 1 only |
| Reputation | Renown | SIMPLIFY | One visible track later |
| Equipment rarity | Gear rarity | PARITY | Five readable rarities |
| Item upgrades | Reinforcement | PARITY | One material family initially |
| Shells/options | Relic Imprints | SIMPLIFY | Later, bounded affix pool |
| Resist equipment sets | Affinity Resistance | SIMPLIFY | Stats, not four gear wardrobes |
| Wings | Modular Wings | PARITY | Cosmetic-first |
| Costumes | Skins | PARITY | Architecture only initially |
| Mounts | Mounts | LATER | No first-slice implementation |
| PvP region | Conflict region | LATER | No first-slice PvP |
| Group/party | Party | PARITY | Four-player party first |
| Friends/chat | Social foundation | PARITY | Minimal party/local chat later |

## 5. Core player experience

### 5.1 Session loop

1. Enter the capital.
2. Review objective, equipment and selected Aspect.
3. Leave through a physical gate/portal.
4. Traverse a shared field map.
5. Fight monsters and complete compact objectives.
6. Earn Hero XP, Calling XP, items and materials.
7. Discover or enter a Story Rift.
8. Complete the short instance and unlock progression.
9. Return to town or continue into another region.
10. Form a party and enter a Colossus Raid.
11. Defeat the Boss and receive a physical/reward-cache payoff.
12. Reinforce gear, improve the Aspect and prepare the next route.

### 5.2 Long-term loop

- unlock Callings and Aspect Cards;
- master different combat roles;
- collect gear and cosmetics;
- improve Companions;
- clear progressively harder Rifts and Raids;
- discover new Chapters;
- develop a Sanctuary;
- join an Alliance;
- participate in rotating events and world encounters.

### 5.3 The first 30 minutes

- immediate guest play;
- controllable Hero within seconds;
- short movement/combat tutorial embedded in the world;
- first loot drop within five minutes;
- capital reached early;
- Calling identity introduced without a large selection wall;
- first Story Rift teased;
- first Colossus visible or referenced as the Chapter goal.

## 6. World structure

### 6.1 Map model

The world uses multiple authored maps connected by gates, paths and portals. It is not one enormous seamless landmass and not a menu-only map selector.

Each world map is data-driven and contains:

- stable map ID and version;
- dimensions and world scale;
- player and portal spawns;
- walkable surfaces and elevation;
- collision geometry;
- encounter regions;
- NPCs and interactive objects;
- ambient creature spawns;
- quest objective zones;
- loot/resource regions;
- landmarks and navigation cues;
- channel/instance policy;
- audio and lighting theme;
- mobile LOD configuration.

### 6.2 Initial Chapter 1 geography

Working content, subject to naming/art lock:

1. **Haven Capital** — social home and service centre.
2. **Lower Approach** — beginner field and movement onboarding.
3. **Ruined West Road** — first serious field map and group route.
4. **Crystal Verge** — affinity-focused field and Story Rift access.
5. **Harvest Basin** — Raid map using the existing Colossus foundation.

The existing 5600×4000 arena remains a production reference and fallback. The M10 Hybrid-3D basin becomes a Raid location, not the entire game world.

### 6.3 Shared versus instanced spaces

| Space | Ownership |
|---|---|
| Capital | Shared channel |
| Field map | Shared channel |
| Story Rift | Solo or party instance |
| Dungeon | Party instance |
| Colossus Raid | Dedicated raid instance |
| Sanctuary | Private/party instance |

## 7. Hero and class architecture

### 7.1 Character identity

The current compact cream/charcoal creature with blue eyes remains the base visual identity.

The Hero must remain:

- cute but capable;
- readable at phone size;
- modular;
- recognizable across transformations;
- visually distinct from Companions;
- compatible with Wings, weapons and cosmetic attachments.

### 7.2 Callings

Three initial Calling families are designed, but only one is required for the first online slice.

| Calling | Core role | Combat language |
|---|---|---|
| Vanguard | close range/control | impact, guard, break |
| Ranger | mobile range | projectiles, marks, repositioning |
| Arcanist | magic/control/support | zones, pulses, buffs |

Final names must be original and may change during lore production.

### 7.3 Aspect Cards

An Aspect Card is an equippable transformation with:

- its own visual form;
- ability kit;
- combat role;
- Affinity;
- Aspect Mastery level;
- Aspect Points;
- reinforcement tier;
- optional cosmetic variant;
- shared Hero equipment rules where appropriate.

Rules:

- transformation is never a permanent replacement of the base Hero;
- Aspect switching is restricted during unsafe combat states;
- each Aspect is viable, not merely a linear upgrade;
- loadouts are compact and understandable;
- no card-specific copy of every inventory/economy system;
- the same account owns and progresses multiple Aspects.

### 7.4 Animation decision

Directional 2D remains a safe prototype/fallback. Long-term production should move the Hero to a shared rigged 3D foundation because the multiplication of directions, animation frames, Aspects, skins, Wings and weapons is not sustainable in 2D.

Target 3D structure:

- one base skeleton;
- shared locomotion set;
- Calling weapon sockets;
- Head, Back, Wings, Tail, Chest/Core, Paws and Aura attachment points;
- compatible Aspect meshes/material variants;
- compressed glTF/GLB runtime assets;
- mobile LOD and animation budgets.

## 8. Progression model

### 8.1 Launch-visible tracks

1. **Hero Level** — world access and baseline attributes.
2. **Calling Level** — base skills and class proficiency.
3. **Aspect Mastery** — progression of the equipped Aspect Card.

No Champion/Paragon/account level is added during the first slice.

### 8.2 Experience ownership

- Hero XP always progresses the character.
- Calling XP progresses the active base Calling where applicable.
- Aspect XP progresses the equipped Aspect.
- capped tracks do not silently consume or waste rewards; overflow rules must be explicit.
- XP values and rewards are authoritative server data online.

### 8.3 Aspect Points

Aspect Points provide focused build differentiation through a small readable set of categories:

- Power;
- Guard;
- Affinity;
- Vitality/Resource;
- optional signature modifier at milestones.

The mobile UI must not reproduce dense legacy point windows. Presets and reset previews are supported before confirmation.

## 9. Combat design

### 9.1 Equipped actions

Normal mobile combat exposes:

- one basic/auto-capable attack;
- four active skills maximum;
- Dash/Evade;
- context/interact;
- Aspect transformation or signature action;
- optional target/retarget assistance.

Passive skills and conditional modifiers are represented in the build, not as additional permanent buttons.

### 9.2 Targeting

The default system combines:

- soft target assistance for mobile;
- manual movement and positioning;
- target cycling/retarget;
- ground- and direction-based abilities;
- world-space projectiles;
- readable range feedback;
- no camera-authoritative targeting.

### 9.3 Combat values

Gameplay truth remains renderer-independent:

- position;
- facing;
- velocity;
- health/resource;
- cooldowns;
- cast state;
- projectile state;
- collision/hit volumes;
- buffs/debuffs;
- threat/contribution;
- loot eligibility.

### 9.4 Death and recovery

Field death, instance failure and raid defeat require distinct rules. The first slice uses recoverable field defeat and clean instance restart without punitive item loss.

## 10. Story Rifts

Story Rifts are the original equivalent of short progression instances.

Target duration: 5–12 minutes.

Possible objectives:

- clear rooms/areas;
- protect an NPC or object;
- activate mechanisms;
- choose an optional reward route;
- defeat a miniboss;
- complete under a time/score condition;
- discover a lore object;
- survive a final encounter.

Rifts support:

- solo and party variants;
- explicit entry requirements;
- deterministic objective state;
- server-authoritative completion;
- compact result screen;
- replay rewards with bounded farming rules;
- difficulty tiers later.

## 11. Colossus Raids

Raids are the flagship repeatable content.

### 11.1 Raid flow

1. Unlock or acquire access.
2. Form/join a party.
3. Enter a dedicated instance.
4. Traverse a short approach or mechanic section.
5. Enter the Boss arena.
6. Resolve spatial mechanics and Break phases.
7. Defeat the Boss.
8. Enter loot/clear phase.
9. Receive a server-owned Colossus Cache and contribution rewards.
10. Return to world/town.

### 11.2 First raid

The existing Harvest Colossus provides:

- world position and footprint;
- front/flank/rear relation;
- Break I, Break II and Core phases;
- ground attacks and telegraphs;
- physical projectiles;
- death/loot/respawn prototype;
- production visual identity.

It must later receive a true 3D production Boss or a sufficiently complete multi-angle solution before becoming a shipping multiplayer Raid.

### 11.3 Group size

- first networked proof: four players;
- later standard raids: four to eight;
- exceptional world/Alliance encounters may be larger;
- encounter readability and mobile performance take precedence over large player counts.

## 12. Items, loot and reinforcement

### 12.1 Equipment slots

Initial compact set:

- weapon/focus;
- body;
- accessory;
- relic;
- optional secondary Calling item.

Avoid an early grid of many resistance-specific wardrobes.

### 12.2 Rarity

Five visually distinct rarities:

- Common;
- Rare;
- Epic;
- Legendary;
- Mythic.

Rarity changes silhouette/detail where practical, not only colour.

### 12.3 Reinforcement

- predictable material requirements;
- preview before confirmation;
- clear success/risk rules;
- no hidden value changes;
- bounded upgrade tiers;
- server-authoritative consumption and reward;
- no paid progression implementation during the foundation phase.

### 12.4 Loot presentation

Preserve the current physical reward language:

- world position;
- launch/arc;
- bounce/landing;
- contact shadow;
- rarity silhouette;
- restrained rarity beam;
- magnet/pickup;
- compact pickup summary.

## 13. Companions, Sanctuary and social systems

### 13.1 Companions

Companions may provide:

- visual companionship;
- collection identity;
- limited utility/combat role;
- progression;
- cosmetic variants.

The Ember Wisp remains the first production Companion. Companion power must not obscure the Hero or turn combat into uncontrolled VFX clutter.

### 13.2 Sanctuary

The Sanctuary is the private-space equivalent and may later contain:

- selected Companions;
- trophies;
- resource stations;
- cosmetic layout;
- visitors/party access;
- storage shortcuts;
- small activities.

It is later content, but entity ownership and map instancing must not block it.

### 13.3 Alliances

Alliance architecture later supports:

- membership and roles;
- chat;
- shared objectives;
- raid coordination;
- contribution events;
- cosmetic identity;
- audit/moderation controls.

No Alliance feature is required for the first playable slice.

## 14. UI and mobile presentation

### 14.1 Combat HUD budget

The combat centre remains clear. Persistent controls are limited and ergonomically separated.

Portrait baseline:

- movement lower left;
- four-skill cluster lower right;
- Dash and signature action adjacent but distinct;
- compact Hero status;
- top Boss bar only during relevant encounters;
- collapsed party rows by default;
- minimap at a safe top corner;
- manual zoom remains user-owned;
- utility controls do not occupy the combat centre.

Landscape baseline:

- wider world view;
- movement lower left;
- actions lower right in a wider arc/row;
- party status may expand;
- objective and chat gain horizontal room;
- identical gameplay ranges and timings.

### 14.2 Progressive disclosure

- Loot details appear on pickup/inspection.
- Full buff lists expand on demand.
- Chat collapses to recent messages.
- Quest tracker shows the active objective only.
- Secondary currencies/materials stay inside relevant menus.
- System notifications are short and avoid Hero/Boss focus.

### 14.3 Meta navigation

Initial top-level destinations should remain few:

1. Hero;
2. Inventory;
3. Aspects/Skills;
4. Quests/World;
5. Social/More.

Shop, collection, reinforcement, companions and customization are contextual subareas, not ten permanent primary navigation buttons.

The current Hero Sanctum UI is a component/reference catalog. It must be progressively bound to real domain data rather than becoming a second disconnected game shell.

## 15. Camera and orientation specification

### 15.1 Camera state

Local presentation state:

- mode;
- yaw;
- pitch;
- user zoom distance;
- collision-limited distance;
- actual distance;
- follow target;
- manual target offset;
- obstruction/fade state;
- composition profile for portrait/landscape.

Camera state is never authoritative or replicated as gameplay truth.

### 15.2 Camera modes

- **FOLLOW** — default world traversal with deadzone and lookahead.
- **LOOK** — deliberate independent world inspection.
- **BOSS FOCUS** — optional framing of Hero/Boss.
- **TACTICAL** — wider local context for telegraphs/party/loot.

Manual input always takes priority. Follow recovery is smooth and delayed. No automatic change to the player's chosen zoom.

### 15.3 Orientation changes

- world/simulation coordinates remain unchanged;
- camera composition profile changes;
- HUD relocates rather than uniformly scaling;
- touch zones are rebuilt for safe areas;
- active inputs are cleanly cancelled/reacquired;
- network state is unaffected;
- orientation may be chosen in settings and changed where the platform permits.

## 16. Online architecture

### 16.1 Authority

Server owns:

- character progression;
- item ownership;
- currency/material balances;
- combat validation;
- monster/Boss state;
- valuable loot generation;
- quest completion;
- instance state;
- party membership;
- market transactions;
- social permissions.

Client owns only local presentation/input intent, including camera, UI arrangement, graphics quality and accessibility settings.

### 16.2 Shared code boundaries

Recommended logical packages/domains:

- `shared-contracts` — IDs, commands, events and snapshots;
- `gameplay-core` — deterministic rules usable by server/client prediction;
- `content-definitions` — versioned classes, skills, items, maps and encounters;
- `web-client` — renderer, input, HUD and local presentation;
- `world-server` — authoritative maps/entities/combat;
- `instance-service` — Rifts, Dungeons and Raids;
- `persistence` — accounts, characters, inventory and progress;
- `social` — party, friends, chat and Alliances;
- `admin-content` — safe data/configuration tooling later.

Exact deployment technology is selected in a dedicated backend architecture decision, not implicitly inside the current Vite client.

### 16.3 Multiplayer world model

- stable world/map/instance IDs;
- server ticks and timestamps;
- entity snapshots/deltas;
- interpolation for remote entities;
- client prediction and reconciliation for local movement where required;
- interest management by map/region;
- reconnect/resume boundaries;
- versioned content and protocol;
- anti-cheat validation for damage, movement, loot and economy.

## 17. Content and asset pipeline

### 17.1 3D production

- modular environment kits;
- shared materials and texture atlases;
- reusable rigs and animations;
- compressed GLB/glTF;
- KTX2/optimized texture path where supported;
- LOD and culling metadata;
- collision proxies separate from render meshes;
- deterministic pivots/scale conventions;
- source masters retained separately from runtime assets.

### 17.2 Scale convention

Use a documented world-metre convention across maps:

- Hero approximately 1.6–2.0 visual metres;
- normal doors/arches and props based on Hero scale;
- Colossi monumental but camera-readable;
- collision dimensions independent from cosmetic overhang;
- one unit conversion boundary between simulation and renderer if legacy coordinates remain.

### 17.3 Data-driven content

No complete map, class or raid is hardcoded into a scene controller. Definitions reference stable IDs and versioned content assets.

## 18. Existing source migration

### 18.1 Retain

- Three.js Hybrid-3D foundation;
- world coordinate separation;
- player movement intent and camera-relative control;
- perspective camera modes;
- camera collision/occluder concepts;
- ground sampling/collision lessons;
- world-space projectiles;
- telegraphs;
- physical loot;
- Harvest Colossus encounter logic;
- Break/Core presentation;
- AssetManifest and fallback rules;
- UI component foundation;
- responsive mobile input lessons;
- current 2D arena as fallback/reference.

### 18.2 Refactor before scale-up

- move single-scene orchestration into reusable map/session boundaries;
- separate Raid-specific rules from general world traversal;
- replace local reward authority with ports/contracts;
- create content IDs for skills, items, maps, NPCs and quests;
- define local/remote player entity representation;
- centralize orientation-responsive input layout;
- prevent UI previews from becoming authoritative progression state;
- prepare rigged 3D Hero renderer alongside the directional fallback.

### 18.3 Retire only after replacement

- single-front Boss impostor;
- flat directional Hero as primary long-term production path;
- one-off test-scene map assumptions;
- local-only valuable loot decisions;
- prototype-only duplicated presentation paths;
- hardcoded combat-only spawn lifecycle.

## 19. First playable MMORPG vertical slice

The first slice is deliberately small but complete.

### 19.1 Required content

- one capital district;
- two connected field maps;
- one complete Story Rift;
- one Harvest Colossus Raid;
- one playable Calling;
- one playable Aspect Card;
- one Companion;
- Hero Level and Calling Level;
- Aspect Mastery;
- inventory and four equipment slots;
- reinforcement preview/operation;
- NPC dialogue and compact quest chain;
- portal/map transitions;
- persistent character save;
- portrait and landscape layouts;
- one shared multiplayer map proof;
- four-player Raid proof.

### 19.2 Explicit exclusions

- market;
- PvP;
- Alliances;
- housing decoration;
- mounts;
- large live events;
- multiple Chapters;
- dozens of Aspects;
- monetization;
- full endgame;
- native-only gameplay fork.

### 19.3 Acceptance experience

A new player can:

1. open a URL;
2. enter as guest;
3. move through a real town;
4. see another player;
5. accept a quest;
6. leave town through a world gate;
7. fight monsters on a shared field map;
8. gain Hero and Calling XP;
9. collect/equip an item;
10. complete a Story Rift;
11. unlock/use an Aspect Card;
12. join a party;
13. enter the Harvest Colossus Raid;
14. defeat the Boss;
15. receive a persistent reward;
16. return to town;
17. rotate the device and continue with an appropriate layout.

If that loop works and feels coherent, the product foundation is proven.

## 20. Development sequence

### Phase 0 — Direction lock

- approve this master plan;
- lock naming strategy and original-IP rules;
- create visual targets for capital, field combat and Raid in portrait/landscape;
- decide the first Calling and Aspect;
- define first-slice content IDs.

### Phase 1 — World/client foundation

- reusable map loader;
- map transitions;
- rigged 3D Hero spike;
- shared scale/material conventions;
- responsive orientation system;
- simplified field combat session separate from Raid logic.

### Phase 2 — Progression/content foundation

- Hero/Calling/Aspect progression models;
- item/inventory/equipment definitions;
- quest and NPC definitions;
- Story Rift state machine;
- save format migration.

### Phase 3 — Online proof

- authoritative world room;
- remote player entities;
- input/state protocol;
- persistence boundary;
- reconnect;
- party proof;
- no client-owned rewards.

### Phase 4 — Complete first slice

- capital district;
- two field maps;
- Story Rift;
- Calling/Aspect content;
- Harvest Raid integration;
- portrait/landscape UX;
- mobile optimization;
- physical Android/iOS/browser validation.

### Phase 5 — Product expansion

- remaining starter Callings;
- additional Aspects;
- Companions;
- Sanctuary;
- additional Rifts/Raids;
- social systems;
- economy/market after server authority is proven.

## 21. Quality gates

### World

- maps feel inhabited rather than decorated canvases;
- paths and exits are readable;
- other players are spatially coherent;
- camera freedom never exposes invalid empty world;
- mobile LOD preserves landmarks and gameplay entities.

### Hero

- grounded on every walkable surface;
- continuous believable movement;
- stable scale and animation;
- clear in dark environments;
- modular transformations;
- no sprite/asset popping.

### Camera/input

- pitch, yaw and user zoom remain responsive;
- Hero and camera input never conflict;
- no forced automatic zoom;
- obstruction never makes the game unplayable;
- portrait and landscape are independently composed;
- camera never changes simulation.

### Combat

- launch, flight, hit and reaction are causally readable;
- telegraphs remain the highest-priority floor information;
- parties and Boss mechanics remain readable on a phone;
- damage and rewards are authoritative online.

### UI

- no tiny desktop windows;
- no permanent feature wall;
- touch targets remain usable;
- dynamic values are live text;
- menus use progressive disclosure;
- normal gameplay remains visually dominant.

## 22. Risks and controls

| Risk | Control |
|---|---|
| MMO scope becomes unfinishable | Complete one end-to-end slice before adding breadth. |
| NosTale expression is copied too closely | Original-IP review for names, art, maps, text, UI and data. |
| Mobile UI becomes crowded | Fixed combat HUD budget and progressive disclosure. |
| 2D animation production explodes | Shared rigged 3D Hero/monster pipeline. |
| Browser download becomes too large | Critical bundles, compressed assets, map streaming and LOD. |
| Client cheating controls rewards | Server authority for combat, progress, loot and economy. |
| Portrait harms spatial combat | Dedicated camera/HUD composition, not uniform scaling. |
| Landscape becomes secondary/unmaintained | Required acceptance coverage for both orientations. |
| Existing prototype is discarded | Reuse Raid logic, camera lessons, assets and world systems selectively. |

## 23. Locked decisions summary

- Harvest Colossus becomes a modern social action MMORPG.
- NosTale is the structural/parity reference.
- All expression, source and content remain original.
- Browser is the primary client.
- Android and iOS use the same gameplay core later.
- Crossplay and shared progress are foundational goals.
- Portrait and landscape are both supported.
- Free 3D camera pitch/yaw/zoom remains a defining difference.
- Direct analog/action control remains.
- The mobile interface is calmer and contains fewer simultaneous controls/systems.
- Content launches narrow and high quality, then expands modularly.
- The current Harvest Colossus becomes the first Raid foundation.
- Long-term Hero/monster production should use shared rigged 3D assets.
- Online progression, valuable loot and economy must become server-authoritative.
- The next implementation is a complete small world loop, not another isolated UI or Boss-only feature stack.

## 24. Immediate next decisions

Before Phase 1 implementation, lock:

1. final game title versus `Harvest Colossus` as project title;
2. capital name and Chapter 1 theme;
3. first playable Calling;
4. first Aspect Card;
5. whether the base Hero is one species or supports several body archetypes;
6. portrait default versus remembering the last orientation;
7. first multiplayer proof player count per shared field channel;
8. backend architecture decision and hosting budget;
9. final 3D asset production route for Hero, monsters and modular environments;
10. first-slice visual mockups for capital, field, Story Rift and Raid in both orientations.
