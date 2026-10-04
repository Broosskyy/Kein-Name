import * as THREE from 'three';
import type { BossTelegraph } from '../gameplay/BossAttackSystem';
import { BOSS_ATTACKS } from '../gameplay/BossAttackSystem';
import { StableHeroViewSelector, type HeroDirection } from '../gameplay/HeroDirection';
import type { LootDrop } from '../gameplay/LootSystem';
import type { CombatEntityState, Vec2 } from '../gameplay/ArenaTypes';
import type { PlayerProjectile, PlayerProjectileImpact } from '../gameplay/PlayerProjectileSystem';
import { ASSET_MANIFEST, type AssetKey } from '../assets';
import { HybridCameraController } from './HybridCameraController';
import type { Hybrid3DSceneDefinition, HybridPropDefinition } from './Hybrid3DTestScene';
import { simulationToWorld3D, WORLD3D_UNITS_PER_METER } from './World3DTypes';
import { sampleBaseTerrainHeight, sampleGroundHeight } from './HybridGroundSampler';
import { HeroGroundingController } from './HeroGrounding';
import { HeroVisualState, type HeroVisualSnapshot } from './HeroVisualState';
import { HybridProjectileRenderer } from './HybridProjectileRenderer';
import { HybridCameraObstruction } from './HybridCameraObstruction';
import { BossDirectionalState, bossViewAnchor, bossViewAsset, bossViewSector } from './BossDirectionalView';
import { HeroAnimationController } from './HeroAnimationController';
import type { BossEncounterState } from '../gameplay/BossEncounterLoop';
import type { FieldMonsterState } from '../gameplay/FieldMonsterSystem';
import type { WorldNpcDefinition, WorldPortalDefinition } from '../gameplay/WorldMapDefinition';

const STONE = 0x333746;
const STONE_DARK = 0x202430;
const STONE_LIGHT = 0x4b4e5e;
const ORANGE = 0xff6b23;
const BOSS_VISUAL_SIZE = 5.8;

export interface HybridRenderState {
  player: CombatEntityState;
  bossPosition: Vec2;
  bossOrientation: number;
  bossHpRatio: number;
  telegraphs: readonly BossTelegraph[];
  loot: readonly LootDrop[];
  projectiles: readonly PlayerProjectile[];
  projectileImpacts: readonly PlayerProjectileImpact[];
  dashing: boolean;
  attacking: boolean;
  aimDirection?: Vec2;
  bossState: BossEncounterState;
  bossDeathProgress: number;
  bossVisible?: boolean;
  fieldMonsters?: readonly FieldMonsterState[];
  worldNpcs?: readonly WorldNpcDefinition[];
  worldPortals?: readonly WorldPortalDefinition[];
  selectedFieldMonsterId?: string;
}

export class HybridWorldRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, .1, 90);
  readonly cameraController: HybridCameraController;
  readonly debugRoot = new THREE.Group();
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly textureCache = new Map<string, THREE.Texture>();
  private readonly hero: THREE.Sprite;
  private readonly heroShadow: THREE.Mesh;
  private readonly heroGroundRing: THREE.Mesh;
  private readonly bossVisual?: THREE.Sprite;
  private readonly bossProxy?: THREE.Group;
  private readonly projectileRenderer: HybridProjectileRenderer;
  private readonly cameraObstruction = new HybridCameraObstruction();
  private readonly telegraphMeshes = new Map<string, THREE.Object3D>();
  private readonly lootMeshes = new Map<string, THREE.Group>();
  private readonly worldActorMeshes = new Map<string, THREE.Group>();
  private readonly heroVisualState = new HeroVisualState();
  private readonly heroAnimation = new HeroAnimationController();
  private readonly heroGrounding = new HeroGroundingController();
  private readonly bossDirectionalState = new BossDirectionalState();
  private readonly heroVisibilityPoint = new THREE.Vector3();
  private appliedHeroAsset: AssetKey = 'creature.evo1.direction.n.idle';
  private appliedBossAsset: AssetKey = 'boss.halloween.view.front';
  private heroVisualSnapshot: HeroVisualSnapshot = this.heroVisualState.snapshot();
  private bossHitMs = 0;
  private bossViewSector: 'front'|'flank'|'rear' = 'front';
  private heroViewDirection: HeroDirection = 'n';
  private readonly heroViewSelector = new StableHeroViewSelector('n');
  private elapsed = 0;

  constructor(private readonly mount: HTMLElement, private readonly definition: Hybrid3DSceneDefinition) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    const constrainedMobile = Math.min(window.innerWidth, window.innerHeight) < 700
      || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, constrainedMobile ? 1.35 : 1.65));
    this.renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.id = 'hybrid-3d-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'M10 Hybrid 3D Harvest Arena');
    mount.appendChild(this.renderer.domElement);

    const haven = definition.sceneKind === 'haven';
    this.scene.background = new THREE.Color(haven ? 0x283247 : 0x171b28);
    this.scene.fog = new THREE.FogExp2(haven ? 0x344156 : 0x1a1d29, haven ? .009 : .018);
    this.cameraController = new HybridCameraController(this.camera, definition.dimensions.width / WORLD3D_UNITS_PER_METER / 2 - 1, this.cameraObstruction);
    this.addLighting();
    this.addGround();
    for (const prop of definition.props) this.addProp(prop);
    this.addBoundaryGeometry();
    this.addArenaAtmosphere();
    this.heroShadow = makeDisc(.62, 0x000000, .48);
    this.scene.add(this.heroShadow);
    this.heroGroundRing = makeRing(.52, .62, 0x69d8ff, .4);
    this.scene.add(this.heroGroundRing);
    this.hero = this.makeSprite(assetUrl('creature.evo1.direction.n.idle'), 2.45, 2.45);
    this.hero.center.set(.5, .0521);
    this.scene.add(this.hero);
    // Directional textures now load on demand. Pre-decoding every Hero pose
    // and every Colossus view during construction caused a severe first-frame
    // decode spike on mobile. Haven has no Boss at all, so do not construct or
    // load the raid-only visual/proxy on that route.
    if (!haven) {
      this.bossProxy = this.addBossProxy();
      this.bossVisual = this.makeSprite(assetUrl(this.appliedBossAsset), BOSS_VISUAL_SIZE, BOSS_VISUAL_SIZE);
      this.bossVisual.center.set(.5, bossViewAnchor('front'));
      this.scene.add(this.bossVisual);
    }
    this.projectileRenderer = new HybridProjectileRenderer(this.scene);
    this.scene.add(this.debugRoot);
    this.debugRoot.visible = new URLSearchParams(location.search).has('debug3d');
    this.resize();
  }

  update(deltaMs: number, state: HybridRenderState): void {
    this.elapsed += deltaMs;
    const player = simulationToWorld3D(state.player.position);
    const boss = simulationToWorld3D(state.bossPosition);
    const speed = Math.hypot(state.player.velocity.x, state.player.velocity.y);
    // Update the local camera before choosing a billboard view. The Hero's
    // simulation-facing direction remains untouched, while its authored view
    // now reacts immediately when the player orbits around it.
    this.cameraController.update(deltaMs, state.player.position, state.player.velocity, state.bossPosition);
    this.heroVisualSnapshot = this.heroVisualState.update(deltaMs, state.player.velocity, state.dashing, state.attacking, state.aimDirection);
    this.heroViewDirection = this.heroViewSelector.update(deltaMs, this.heroVisualSnapshot.direction, this.cameraController.yaw);
    const animationFrame = this.heroAnimation.update(deltaMs, this.heroVisualSnapshot.pose, this.heroViewDirection);
    const desiredAsset = animationFrame.asset;
    const desiredTexture = this.texture(assetUrl(desiredAsset));
    if (desiredAsset !== this.appliedHeroAsset && desiredTexture.userData.ready === true) {
      this.appliedHeroAsset = desiredAsset;
      this.hero.material.map = desiredTexture;
      this.hero.material.needsUpdate = true;
      this.hero.center.set(.5, this.heroAnimation.clip().footAnchor);
      this.heroVisualState.recordTextureSwap();
    }
    const cadence = speed > 24 ? Math.abs(animationFrame.offsetY) : Math.max(0, animationFrame.offsetY);
    const heroY = this.heroGrounding.update(player.x, player.z, deltaMs, cadence);
    const playerGround = this.heroGrounding.groundHeight;
    this.hero.position.set(player.x + animationFrame.offsetX, heroY, player.z);
    const baseScale = this.heroAnimation.clip().scale;
    this.hero.scale.set(baseScale * animationFrame.scaleX, baseScale * animationFrame.scaleY, 1);
    this.hero.material.rotation = animationFrame.rotation;
    this.heroShadow.position.set(player.x, playerGround + .012, player.z);
    this.heroShadow.scale.set(state.dashing ? 1.35 : 1, state.dashing ? .7 : 1, 1);
    this.heroGroundRing.position.set(player.x, playerGround + .018, player.z);
    (this.heroGroundRing.material as THREE.MeshBasicMaterial).opacity = state.dashing ? .52 : .34;

    this.heroVisibilityPoint.set(player.x, playerGround + .9, player.z);
    this.cameraObstruction.updateFades(deltaMs, this.camera.position, this.heroVisibilityPoint);
    if (this.bossVisual && this.bossProxy) {
      const bossGround = sampleGroundHeight(boss.x, boss.z);
      this.bossProxy.position.set(boss.x, bossGround, boss.z);
      this.bossProxy.rotation.y = -state.bossOrientation + Math.PI / 2;
      const cameraAngle = Math.atan2(this.camera.position.z - boss.z, this.camera.position.x - boss.x);
      const bossView = this.bossDirectionalState.update(deltaMs, cameraAngle, state.bossOrientation);
      const desiredBossAsset = bossViewAsset(bossView);
      const desiredBossTexture = this.texture(assetUrl(desiredBossAsset));
      if (desiredBossAsset !== this.appliedBossAsset && desiredBossTexture.userData.ready === true) {
        this.appliedBossAsset = desiredBossAsset;
        this.bossVisual.material.map = desiredBossTexture;
        this.bossVisual.material.needsUpdate = true;
        this.bossVisual.center.y = bossViewAnchor(bossView);
      }
      this.bossViewSector = bossViewSector(bossView);
      this.bossHitMs = Math.max(0, this.bossHitMs - deltaMs);
      if (state.projectileImpacts.length) {
        const powerImpact = state.projectileImpacts.some((impact) => impact.kind === 'power');
        this.bossHitMs = powerImpact ? 300 : 150;
        if (powerImpact) this.cameraController.addImpulse(.12);
      }
      const hitRatio = this.bossHitMs > 0 ? this.bossHitMs / 260 : 0;
      const death = THREE.MathUtils.clamp(state.bossDeathProgress, 0, 1);
      this.bossVisual.material.color.setRGB(
        Math.max(.18, 1 - death * .58),
        Math.max(.08, 1 - hitRatio * .28 - death * .7),
        Math.max(.04, 1 - hitRatio * .48 - death * .76),
      );
      this.bossVisual.material.opacity = state.bossState === 'alive' ? 1 : Math.max(0, 1 - death * 1.08);
      this.bossVisual.visible = state.bossVisible !== false && (state.bossState === 'alive' || death < .96);
      this.bossProxy.visible = state.bossVisible !== false && this.debugRoot.visible;
      const pulse = 1 + Math.sin(this.elapsed * .0028) * .012 + (1 - state.bossHpRatio) * .02;
      const recoil = hitRatio * .1 - death * .34;
      this.bossVisual.position.set(boss.x, bossGround + .02 + recoil, boss.z);
      this.bossVisual.scale.set(BOSS_VISUAL_SIZE * pulse * (1 + hitRatio * .035) * (1 - death * .12), BOSS_VISUAL_SIZE * pulse * (1 - hitRatio * .025) * (1 - death * .46), 1);
    }
    this.syncTelegraphs(state.telegraphs);
    this.syncLoot(state.loot);
    this.syncWorldActors(state.fieldMonsters ?? [], state.worldNpcs ?? [], state.worldPortals ?? [], state.selectedFieldMonsterId);
    this.projectileRenderer.update(deltaMs, state.projectiles, state.projectileImpacts);
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const width = Math.max(1, this.mount.clientWidth), height = Math.max(1, this.mount.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  toggleDebug(): boolean { this.debugRoot.visible = !this.debugRoot.visible; return this.debugRoot.visible; }
  pickFieldMonster(clientX: number, clientY: number): string | undefined {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return undefined;
    const pointer = new THREE.Vector2(
      (clientX - rect.left) / rect.width * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    const monsters = [...this.worldActorMeshes.values()].filter((group) => group.visible && group.userData.actorKind === 'monster');
    const hit = raycaster.intersectObjects(monsters, true)[0]?.object;
    let current: THREE.Object3D | null = hit ?? null;
    while (current && !current.userData.actorId) current = current.parent;
    return current?.userData.actorKind === 'monster' ? current.userData.actorId as string : undefined;
  }
  projectSimulationPoint(position: Vec2, height = 0): Readonly<{ x: number; y: number }> {
    const world = simulationToWorld3D(position);
    const projected = new THREE.Vector3(world.x, sampleGroundHeight(world.x, world.z) + height / WORLD3D_UNITS_PER_METER, world.z).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = (projected.x * .5 + .5) * rect.width;
    const y = (-projected.y * .5 + .5) * rect.height;
    // A context transition, resize or point behind the camera can briefly
    // yield invalid projection values. Keep those values out of CSS rather
    // than letting optional combat feedback poison the runtime frame.
    return { x: Number.isFinite(x) ? x : rect.width * .5, y: Number.isFinite(y) ? y : rect.height * .4 };
  }
  metrics(): Readonly<{ calls: number; triangles: number; points: number; lines: number; textures: number; projectiles: number; projectilePool: number; heroDirectionSwaps: number; heroPoseSwaps: number; heroTextureSwaps: number; heroAnimationFrame: number; heroViewDirection: HeroDirection; bossView: string; cameraObstructed: boolean; fadedOccluders: number; groundHeight: number; surfaceId: string; heroRenderY: number; heroAnchor: number; heroAsset: string }> {
    const render = this.renderer.info.render;
    const obstruction = this.cameraObstruction.snapshot();
    return {
      calls: render.calls, triangles: render.triangles, points: render.points, lines: render.lines, textures: this.renderer.info.memory.textures,
      projectiles: this.projectileRenderer.activeCount, projectilePool: this.projectileRenderer.poolCount,
      heroDirectionSwaps: this.heroVisualSnapshot.directionChangesPerSecond, heroPoseSwaps: this.heroVisualSnapshot.poseChangesPerSecond,
      heroTextureSwaps: this.heroVisualSnapshot.textureSwapsPerSecond, heroAnimationFrame: this.heroAnimation.frameIndex, heroViewDirection: this.heroViewDirection, bossView: this.bossViewSector,
      cameraObstructed: obstruction.hit, fadedOccluders: obstruction.fadedOccluders,
      groundHeight: this.heroGrounding.groundHeight, surfaceId: this.heroGrounding.surfaceId, heroRenderY: this.heroGrounding.renderY, heroAnchor: this.hero.center.y, heroAsset: this.appliedHeroAsset,
    };
  }

  destroy(): void {
    this.renderer.setAnimationLoop(null);
    this.cameraObstruction.restoreMaterials();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.textureCache.forEach((texture) => texture.dispose());
    this.projectileRenderer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private addLighting(): void {
    const haven = this.definition.sceneKind === 'haven';
    this.scene.add(new THREE.HemisphereLight(haven ? 0xc0d6eb : 0x9ba8c8, haven ? 0x303425 : 0x251713, haven ? 2.35 : 2.05));
    const sun = new THREE.DirectionalLight(0xffd6ad, 2.55);
    sun.position.set(-7, 13, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -13; sun.shadow.camera.right = 13;
    sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -13;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 34;
    sun.shadow.bias = -.0008;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6d86b9, .55);
    fill.position.set(9, 7, -8);
    this.scene.add(fill);
    if (!haven) {
      const core = new THREE.PointLight(ORANGE, 7.5, 12, 2);
      const boss = simulationToWorld3D(this.definition.bossSpawn);
      core.position.set(boss.x, 2.6, boss.z + .3);
      this.scene.add(core);
    }
  }

  private addGround(): void {
    const width = this.definition.dimensions.width / WORLD3D_UNITS_PER_METER;
    const depth = this.definition.dimensions.depth / WORLD3D_UNITS_PER_METER;
    const geometry = new THREE.PlaneGeometry(width, depth, 34, 34);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      positions.setY(i, sampleBaseTerrainHeight(positions.getX(i), positions.getZ(i)));
    }
    geometry.computeVertexNormals();
    const haven = this.definition.sceneKind === 'haven';
    const groundMaterial = new THREE.MeshStandardMaterial({ color: haven ? 0x465044 : 0x343844, roughness: .98, metalness: .01 });
    const ground = new THREE.Mesh(geometry, groundMaterial);
    ground.receiveShadow = true;
    this.scene.add(ground);

    if (haven) { this.addHavenGround(); return; }

    // Large authored floor masses: the arena reads as one place rather than a flat test plane.
    const boss = simulationToWorld3D(this.definition.bossSpawn);
    const approach = new THREE.Mesh(new THREE.BoxGeometry(6.2, .16, 10.5), stoneMaterial(0x242530));
    approach.position.set(0, .02, 3.05); approach.receiveShadow = true; this.scene.add(approach);
    const approachInset = new THREE.Mesh(new THREE.BoxGeometry(4.5, .08, 10.2), stoneMaterial(0x2e2e37));
    approachInset.position.set(0, .12, 3.0); approachInset.receiveShadow = true; this.scene.add(approachInset);

    // Broken paving slabs create true parallax but keep broad navigation lanes open.
    for (let row = 0; row < 6; row += 1) {
      for (let col = -2; col <= 2; col += 1) {
        if ((row + col + 9) % 4 === 0) continue;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(.82 + ((row + col + 8) % 3) * .12, .09, 1.05), stoneMaterial((row + col) % 3 === 0 ? 0x34333c : 0x292a33));
        slab.position.set(col * 1.02 + (row % 2) * .15, .18 + ((row + col + 9) % 2) * .018, 7.45 - row * 1.7);
        slab.rotation.y = ((row * 7 + col * 3) % 5 - 2) * .018;
        slab.receiveShadow = true; slab.castShadow = true; this.scene.add(slab);
      }
    }

    // Real raised boss basin and fractured ring.
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 5.15, .38, 56), stoneMaterial(0x30333e));
    basin.position.set(boss.x, -.03, boss.z); basin.receiveShadow = true; this.scene.add(basin);
    const innerBasin = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.7, .12, 48), stoneMaterial(0x292c36));
    innerBasin.position.set(boss.x, .18, boss.z); innerBasin.receiveShadow = true; this.scene.add(innerBasin);

    for (let i = 0; i < 18; i += 1) {
      if (i === 4 || i === 5 || i === 13) continue;
      const angle = i / 18 * Math.PI * 2 + (i % 3) * .025;
      const radius = 4.48 + (i % 2) * .22;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.15, .3 + (i % 3) * .04, .82), stoneMaterial(i % 5 === 0 ? STONE_LIGHT : STONE));
      slab.position.set(boss.x + Math.cos(angle) * radius, .26, boss.z + Math.sin(angle) * radius);
      slab.rotation.y = -angle; slab.rotation.z = (i % 2 ? 1 : -1) * .04;
      slab.castShadow = true; slab.receiveShadow = true; this.scene.add(slab);
    }

    // Decorative fissures are deliberately dimmer than active telegraphs.
    for (let i = 0; i < 14; i += 1) {
      const angle = i / 14 * Math.PI * 2 + .11;
      const length = 1.7 + (i % 4) * .42;
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(.045 + (i % 3) * .012, length), new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0x9a351b : 0x52231d, transparent: true, opacity: .48, depthWrite: false }));
      crack.rotation.x = -Math.PI / 2; crack.rotation.z = angle;
      crack.position.set(boss.x + Math.cos(angle) * (2.4 + i % 2 * .5), .225, boss.z + Math.sin(angle) * (2.4 + i % 2 * .5));
      this.scene.add(crack);
    }

    // Fractured side shelves give the vertical slice genuine height and silhouettes.
    const shelves = [
      [-7.8, -5.7, 3.8, 4.5, .38], [7.7, -5.4, 3.9, 4.2, .46],
      [-8.0, 5.7, 3.3, 4.8, .26], [8.1, 5.5, 3.5, 4.6, .32],
    ] as const;
    shelves.forEach(([x, z, w, d, h], index) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMaterial(index % 2 ? 0x171923 : 0x1d1e28));
      shelf.position.set(x, h / 2 - .05, z); shelf.rotation.y = (index % 2 ? 1 : -1) * .08;
      shelf.receiveShadow = true; shelf.castShadow = true; this.scene.add(shelf);
    });
  }

  private addProp(prop: HybridPropDefinition): void {
    const position = simulationToWorld3D(prop.position);
    const root = new THREE.Group();
    root.position.set(position.x, 0, position.z);
    root.rotation.y = prop.rotation;
    root.scale.setScalar(prop.scale);
    if (prop.kind === 'pillar' || prop.kind === 'broken-pillar') this.buildPillar(root, prop.kind === 'broken-pillar');
    else if (prop.kind === 'arch') this.buildArch(root);
    else if (prop.kind === 'rock') this.buildRock(root);
    else if (prop.kind === 'crystal') this.buildCrystal(root);
    else if (prop.kind === 'corruption') this.buildCorruption(root);
    else if (prop.kind === 'wall') this.buildWall(root);
    else if (prop.kind === 'ring') this.buildRingFragment(root);
    else if (prop.kind === 'house' || prop.kind === 'inn' || prop.kind === 'forge' || prop.kind === 'guild-hall') this.buildHavenBuilding(root, prop.kind);
    else if (prop.kind === 'market-stall') this.buildMarketStall(root);
    else if (prop.kind === 'shrine') this.buildShrine(root);
    else if (prop.kind === 'tree') this.buildTree(root);
    else if (prop.kind === 'fence') this.buildFence(root);
    this.scene.add(root);
    const obstruction = propObstructionProfile(prop);
    if (obstruction) this.cameraObstruction.register(prop.id, root, obstruction.radius, obstruction.height, true);
  }

  private buildPillar(root: THREE.Group, broken: boolean): void {
    const height = broken ? 2.6 : 4.4;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.65, .78, .34, 8), stoneMaterial(STONE_DARK)); base.position.y = .17;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, height, 8), stoneMaterial(STONE)); shaft.position.y = .34 + height / 2;
    shaft.rotation.z = broken ? .13 : 0;
    base.castShadow = base.receiveShadow = true; shaft.castShadow = shaft.receiveShadow = true;
    root.add(base, shaft);
    if (!broken) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.68, .55, .36, 8), stoneMaterial(STONE_LIGHT)); cap.position.y = height + .48; cap.castShadow = cap.receiveShadow = true; root.add(cap); }
    root.add(makeDisc(.9, 0x000000, .36));
  }

  private buildArch(root: THREE.Group): void {
    const left = new THREE.Mesh(new THREE.BoxGeometry(.75, 4.2, .9), stoneMaterial(STONE)); left.position.set(-1.45, 2.1, 0);
    const right = left.clone(); right.position.x = 1.45;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, .85, 1), stoneMaterial(STONE_LIGHT)); lintel.position.set(0, 4.1, 0); lintel.rotation.z = -.05;
    left.castShadow = left.receiveShadow = true; right.castShadow = right.receiveShadow = true; lintel.castShadow = lintel.receiveShadow = true;
    root.add(left, right, lintel, makeDisc(2.5, 0x000000, .3));
  }

  private buildRock(root: THREE.Group): void {
    const material = stoneMaterial(STONE);
    for (let i = 0; i < 4; i += 1) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.65 + i * .13, 0), material);
      rock.position.set((i - 1.5) * .45, .55 + i * .09, (i % 2 - .5) * .45);
      rock.scale.y = 1.15 + i * .09;
      rock.rotation.set(i * .3, i * .7, i * .18);
      rock.castShadow = rock.receiveShadow = true; root.add(rock);
    }
    root.add(makeDisc(1.55, 0x000000, .38));
  }

  private buildCrystal(root: THREE.Group): void {
    const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0x3a718c, emissive: 0x153f62, emissiveIntensity: .58, roughness: .38, metalness: .08 });
    const baseMaterial = stoneMaterial(0x171b25);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), baseMaterial);
    base.scale.set(1.6, .5, 1.35); base.position.y = .3; base.castShadow = base.receiveShadow = true; root.add(base);
    const heights = [2.8, 2.0, 1.45, 1.2, 1.7];
    const offsets = [[0,0],[-.65,.18],[.58,.25],[-.35,-.55],[.45,-.48]];
    heights.forEach((height, index) => {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(.42 - index * .025, height, 5), crystalMaterial);
      shard.position.set(offsets[index][0], .45 + height / 2, offsets[index][1]);
      shard.rotation.z = (index - 2) * .08; shard.rotation.y = index * .7;
      shard.castShadow = true; root.add(shard);
    });
    root.add(makeDisc(1.55, 0x07101b, .48));
  }

  private buildCorruption(root: THREE.Group): void {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), stoneMaterial(0x17151f));
    stone.scale.set(1.25, 1.55, 1.1); stone.position.y = .95; stone.castShadow = stone.receiveShadow = true; root.add(stone);
    const veinMaterial = new THREE.MeshBasicMaterial({ color: 0x7b4ab1, transparent: true, opacity: .52 });
    for (let i = 0; i < 4; i += 1) {
      const vein = new THREE.Mesh(new THREE.CylinderGeometry(.045, .09, 2.1 + i * .25, 6), veinMaterial);
      vein.position.set((i - 1.5) * .32, .8, (i % 2 ? .38 : -.34)); vein.rotation.z = (i - 1.5) * .24; root.add(vein);
    }
    root.add(makeDisc(1.45, 0x090610, .48));
  }

  private buildWall(root: THREE.Group): void {
    const blocks = [[-1.3,1.05,.2],[0,1.0,0],[1.25,.9,-.12],[-.65,2.15,.06],[.62,1.9,-.08]] as const;
    blocks.forEach(([x,y,r], index) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.45 - (index % 2) * .18, .9), stoneMaterial(index % 3 === 0 ? STONE_LIGHT : STONE));
      block.position.set(x,y,0); block.rotation.z = r; block.rotation.y = (index - 2) * .035; block.castShadow = block.receiveShadow = true; root.add(block);
    });
    root.add(makeDisc(2.4, 0x000000, .34));
  }

  private buildRingFragment(root: THREE.Group): void {
    const material = stoneMaterial(0x252631);
    for (let i = -2; i <= 2; i += 1) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.1, .32, 1.65), material);
      slab.position.set(i * .95, .18 + Math.abs(i) * .025, Math.abs(i) * .15); slab.rotation.y = i * .07; slab.rotation.z = i * .012;
      slab.castShadow = slab.receiveShadow = true; root.add(slab);
    }
  }

  private addHavenGround(): void {
    const plazaMaterial = stoneMaterial(0x59606a);
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(5.9, 6.1, .16, 32), plazaMaterial);
    plaza.position.y = .055; plaza.receiveShadow = true; this.scene.add(plaza);
    const roadMaterial = stoneMaterial(0x4a4d50);
    const roads = [
      [0, 5.9, 3.1, 14.8, 0], [0, -7.2, 3.0, 12.8, 0],
      [-8.4, 1.5, 10.8, 2.7, Math.PI / 24], [8.3, 1.7, 10.8, 2.7, -Math.PI / 24],
    ] as const;
    roads.forEach(([x, z, w, d, rotation]) => {
      const road = new THREE.Mesh(new THREE.BoxGeometry(w, .11, d), roadMaterial);
      road.position.set(x, .08, z); road.rotation.y = rotation; road.receiveShadow = true; this.scene.add(road);
    });
    const farm = new THREE.Mesh(new THREE.BoxGeometry(20, .055, 8.4), new THREE.MeshStandardMaterial({ color: 0x3a4638, roughness: 1 }));
    farm.position.set(0, .03, 10.0); farm.receiveShadow = true; this.scene.add(farm);
    for (let i = -5; i <= 5; i += 1) {
      const furrow = new THREE.Mesh(new THREE.BoxGeometry(.08, .025, 7.5), new THREE.MeshBasicMaterial({ color: 0x293528 }));
      furrow.position.set(i * 1.55, .066, 10.1); this.scene.add(furrow);
    }
    const stream = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 17), new THREE.MeshStandardMaterial({ color: 0x315b71, emissive: 0x102c3d, emissiveIntensity: .35, roughness: .22, transparent: true, opacity: .82 }));
    stream.rotation.x = -Math.PI / 2; stream.rotation.z = -.08; stream.position.set(-12.6, .045, 5); this.scene.add(stream);
  }

  private buildHavenBuilding(root: THREE.Group, kind: 'house'|'inn'|'forge'|'guild-hall'): void {
    const large = kind === 'guild-hall';
    const width = large ? 4.6 : 3.5, depth = large ? 3.2 : 2.7, wallHeight = large ? 2.65 : 2.15;
    const wallColor = kind === 'forge' ? 0x4a4240 : kind === 'inn' ? 0x565160 : 0x4b5360;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), stoneMaterial(wallColor));
    body.position.y = wallHeight / 2; body.castShadow = body.receiveShadow = true; root.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(width * .73, large ? 2.15 : 1.55, 4), new THREE.MeshStandardMaterial({ color: kind === 'forge' ? 0x6b3528 : 0x263048, roughness: .88 }));
    roof.position.y = wallHeight + (large ? .82 : .6); roof.rotation.y = Math.PI / 4; roof.scale.z = depth / width; roof.castShadow = true; root.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.72, 1.25, .09), new THREE.MeshStandardMaterial({ color: 0x34261f, roughness: .9 }));
    door.position.set(0, .63, depth / 2 + .05); root.add(door);
    const trim = new THREE.MeshStandardMaterial({ color: 0xb88a4e, roughness: .6, metalness: .12 });
    for (const x of [-width * .32, width * .32]) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(.62, .55, .1), new THREE.MeshStandardMaterial({ color: 0x71b8cf, emissive: 0x21495f, emissiveIntensity: .55 }));
      window.position.set(x, 1.38, depth / 2 + .055); root.add(window);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(.12, wallHeight, .12), trim); beam.position.set(x * 1.35, wallHeight / 2, depth / 2 + .08); root.add(beam);
    }
    if (kind === 'forge') {
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(.55, 2.25, .55), stoneMaterial(0x343139)); chimney.position.set(1.05, 2.35, -.55); chimney.castShadow = true; root.add(chimney);
    }
    root.add(makeDisc(width * .66, 0x11141b, .28));
  }

  private buildMarketStall(root: THREE.Group): void {
    const wood = new THREE.MeshStandardMaterial({ color: 0x5b3d2a, roughness: .92 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.5, .85, 1.35), wood); counter.position.y = .45; counter.castShadow = true; root.add(counter);
    for (const x of [-1.05, 1.05]) { const pole = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.25, .12), wood); pole.position.set(x, 1.2, 0); root.add(pole); }
    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.8, .14, 1.7), new THREE.MeshStandardMaterial({ color: 0xa14b35, roughness: .8 })); awning.position.y = 2.15; awning.rotation.z = -.05; awning.castShadow = true; root.add(awning);
  }

  private buildShrine(root: THREE.Group): void {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, .32, 8), stoneMaterial(0x555866)); base.position.y = .16; root.add(base);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(.62), new THREE.MeshStandardMaterial({ color: 0x67bfe2, emissive: 0x265c7d, emissiveIntensity: 1.1, roughness: .3 })); core.position.y = 1.35; root.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.88, .07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xd5b36a })); ring.position.y = 1.35; ring.rotation.x = Math.PI / 2; root.add(ring);
  }

  private buildTree(root: THREE.Group): void {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, 2.2, 7), new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 1 })); trunk.position.y = 1.1; trunk.castShadow = true; root.add(trunk);
    const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x405d48, roughness: 1 });
    for (const [x, y, z, size] of [[0,2.65,0,1.15],[-.65,2.35,.1,.78],[.62,2.4,-.1,.84]] as const) { const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), crownMaterial); crown.position.set(x,y,z); crown.castShadow = true; root.add(crown); }
  }

  private buildFence(root: THREE.Group): void {
    const wood = new THREE.MeshStandardMaterial({ color: 0x5b4431, roughness: 1 });
    for (const x of [-1.2, 0, 1.2]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.14, 1.05, .14), wood); post.position.set(x,.52,0); root.add(post); }
    for (const y of [.35,.75]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(2.7,.12,.12),wood); rail.position.y=y; root.add(rail); }
  }

  private addArenaAtmosphere(): void {
    // Sparse ember motes supply depth cues without post-processing.
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    for (let i = 0; i < 75; i += 1) {
      const x = ((i * 47) % 210) / 10 - 10.5;
      const z = ((i * 83) % 210) / 10 - 10.5;
      const y = .25 + ((i * 29) % 34) / 10;
      positions.push(x, y, z);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const haven = this.definition.sceneKind === 'haven';
    const motes = new THREE.Points(geometry, new THREE.PointsMaterial({ color: haven ? 0xd4e7b0 : 0xff7138, size: .045, transparent: true, opacity: haven ? .22 : .38, depthWrite: false }));
    this.scene.add(motes);
  }

  private addBoundaryGeometry(): void {
    const half = this.definition.dimensions.width / WORLD3D_UNITS_PER_METER / 2;
    const material = stoneMaterial(this.definition.sceneKind === 'haven' ? 0x353e43 : 0x242834);
    for (let i = 0; i < 28; i += 1) {
      const side = i % 4, along = -half + .6 + Math.floor(i / 4) * 3.15;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.95 + (i % 3) * .16, 0), material);
      rock.position.set(side === 0 ? -half : side === 1 ? half : along, .35 + (i % 3) * .15, side === 2 ? -half : side === 3 ? half : along);
      rock.scale.y = 1.25;
      rock.rotation.y = i * .71; rock.castShadow = rock.receiveShadow = true;
      this.scene.add(rock);
      this.cameraObstruction.register(`boundary-${i}`, rock, 1.15, 2.7, true);
    }
  }

  private addBossProxy(): THREE.Group {
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.6, 5.2, 10), new THREE.MeshStandardMaterial({ color: 0x171821, roughness: .88, transparent: true, opacity: .18, depthWrite: false }));
    body.position.y = 2.6;
    root.add(body);
    const footprint = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.9, 48), new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: .1, side: THREE.DoubleSide }));
    footprint.rotation.x = -Math.PI / 2; footprint.position.y = .025; root.add(footprint);
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, .06, 0), 3.4, 0xffcc66, .55, .3); root.add(arrow);
    this.debugRoot.add(root);
    const boss = simulationToWorld3D(this.definition.bossSpawn); root.position.set(boss.x, sampleGroundHeight(boss.x, boss.z), boss.z);
    // A 3.5m / 56% black disc read as an opaque platform in portrait QA and
    // hid the lower half of the Boss. Keep grounding, not a second silhouette.
    if (this.definition.sceneKind !== 'haven') {
      const shadow = makeDisc(2.75, 0x05060a, .25); shadow.position.set(boss.x, sampleGroundHeight(boss.x, boss.z) + .012, boss.z); shadow.scale.z = .7; this.scene.add(shadow);
    }
    return root;
  }

  private syncTelegraphs(telegraphs: readonly BossTelegraph[]): void {
    const live = new Set(telegraphs.map((telegraph) => telegraph.id));
    for (const [id, mesh] of this.telegraphMeshes) if (!live.has(id)) { this.scene.remove(mesh); disposeObject(mesh); this.telegraphMeshes.delete(id); }
    for (const telegraph of telegraphs) {
      let mesh = this.telegraphMeshes.get(telegraph.id);
      if (!mesh) { mesh = this.createTelegraphMesh(telegraph); this.telegraphMeshes.set(telegraph.id, mesh); this.scene.add(mesh); }
      const position = simulationToWorld3D(telegraph.position);
      mesh.position.set(position.x, sampleGroundHeight(position.x, position.z) + .035, position.z);
      const material = firstMaterial(mesh);
      if (material) {
        material.opacity = telegraph.phase === 'impact' ? .72 : telegraph.phase === 'recovery' ? .14 : .28 + Math.sin(this.elapsed * .014) * .1;
        material.color.setHex(telegraph.phase === 'impact' ? 0xffdf82 : telegraph.kind.includes('void') || telegraph.kind.includes('corruption') ? 0x9c56ff : ORANGE);
      }
    }
  }

  private createTelegraphMesh(telegraph: BossTelegraph): THREE.Object3D {
    const definition = BOSS_ATTACKS[telegraph.kind];
    const radius = telegraph.radius / WORLD3D_UNITS_PER_METER;
    const material = new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide });
    let geometry: THREE.BufferGeometry;
    if (definition.shape === 'ring') geometry = new THREE.RingGeometry(Math.max(.1, telegraph.innerRadius / WORLD3D_UNITS_PER_METER), radius, 64);
    else if (definition.shape === 'line') geometry = new THREE.PlaneGeometry(telegraph.radius * 2 / WORLD3D_UNITS_PER_METER, 20);
    else if (definition.shape === 'cone') geometry = new THREE.CircleGeometry(radius, 48, -.58, 1.16);
    else geometry = new THREE.RingGeometry(radius * .78, radius, 48);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    if (definition.shape === 'line' || definition.shape === 'cone') mesh.rotation.z = -Math.atan2(telegraph.direction.y, telegraph.direction.x) + Math.PI / 2;
    return mesh;
  }

  private syncLoot(drops: readonly LootDrop[]): void {
    const active = drops.filter((drop) => drop.phase !== 'collected');
    const live = new Set(active.map((drop) => drop.id));
    for (const [id, group] of this.lootMeshes) if (!live.has(id)) { this.scene.remove(group); disposeObject(group); this.lootMeshes.delete(id); }
    for (const drop of active) {
      let group = this.lootMeshes.get(drop.id);
      if (!group) {
        group = new THREE.Group();
        const key: AssetKey = drop.rarity === 'epic' ? 'loot.epic' : drop.rarity === 'rare' ? 'loot.rare' : 'loot.common';
        const sprite = this.makeSprite(assetUrl(key), drop.rarity === 'epic' ? 1.25 : .85, drop.rarity === 'epic' ? 1.25 : .85);
        sprite.center.set(.5, .12); group.add(sprite);
        group.add(makeDisc(drop.rarity === 'epic' ? .46 : .3, 0x000000, .42));
        if (drop.rarity !== 'common') {
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(.035, .12, drop.rarity === 'epic' ? 5 : 3.2, 8, 1, true), new THREE.MeshBasicMaterial({ color: drop.rarity === 'epic' ? 0xffc34a : 0x62dfff, transparent: true, opacity: .24, depthWrite: false }));
          beam.position.y = drop.rarity === 'epic' ? 2.5 : 1.6; group.add(beam);
        }
        this.lootMeshes.set(drop.id, group); this.scene.add(group);
      }
      const position = simulationToWorld3D(drop.position);
      const airborne = drop.phase === 'airborne' ? Math.sin(Math.min(1, drop.ageMs / drop.flightMs) * Math.PI) * 2.6 : drop.bounce / WORLD3D_UNITS_PER_METER;
      group.position.set(position.x, sampleGroundHeight(position.x, position.z) + .05 + airborne, position.z);
      group.rotation.y += .008;
    }
  }

  private syncWorldActors(monsters: readonly FieldMonsterState[], npcs: readonly WorldNpcDefinition[], portals: readonly WorldPortalDefinition[], selectedMonsterId?: string): void {
    const live = new Set([...monsters.map((actor) => actor.id), ...npcs.map((actor) => actor.id), ...portals.map((actor) => actor.id)]);
    for (const [id, group] of this.worldActorMeshes) if (!live.has(id)) { this.scene.remove(group); disposeObject(group); this.worldActorMeshes.delete(id); }
    for (const monster of monsters) {
      let group = this.worldActorMeshes.get(monster.id);
      if (!group) {
        group = this.createMonsterVisual(monster.species);
        group.userData.actorId = monster.id; group.userData.actorKind = 'monster';
        this.worldActorMeshes.set(monster.id, group); this.scene.add(group);
      }
      const position = simulationToWorld3D(monster.position);
      group.position.set(position.x, sampleGroundHeight(position.x, position.z), position.z);
      group.visible = monster.alive || monster.defeatVisualMs > 0;
      group.rotation.y = Math.sin(this.elapsed * .0007 + position.x) * .35;
      group.position.y += monster.alive ? Math.abs(Math.sin(this.elapsed * .004 + position.z)) * .045 : 0;
      const hitRatio = THREE.MathUtils.clamp(monster.hitFlashMs / 260, 0, 1);
      const defeatRatio = monster.alive ? 0 : 1 - THREE.MathUtils.clamp(monster.defeatVisualMs / 420, 0, 1);
      const hitPulse = Math.sin(hitRatio * Math.PI) * .09;
      group.scale.set(1 + hitPulse + defeatRatio * .08, Math.max(.08, 1 - defeatRatio * .88), 1 + hitPulse + defeatRatio * .08);
      group.position.y += monster.alive ? 0 : defeatRatio * .12;
      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) material.emissiveIntensity = hitRatio > 0 ? .35 + hitRatio * 2.3 : .15;
        }
      });
      const targetRing = group.getObjectByName('field-target-ring');
      const targetMarker = group.getObjectByName('field-target-marker');
      const selected = monster.alive && monster.id === selectedMonsterId;
      if (targetRing) {
        targetRing.visible = selected;
        targetRing.scale.setScalar(1 + Math.sin(this.elapsed * .008) * .08);
        if (targetRing instanceof THREE.Mesh && targetRing.material instanceof THREE.MeshBasicMaterial) targetRing.material.opacity = .74 + Math.sin(this.elapsed * .01) * .2;
      }
      if (targetMarker) { targetMarker.visible = selected; targetMarker.position.y = 2.08 + Math.sin(this.elapsed * .006) * .12; targetMarker.rotation.y += .025; }
    }
    for (const npc of npcs) {
      let group = this.worldActorMeshes.get(npc.id);
      if (!group) { group = this.createNpcVisual(npc.role); this.worldActorMeshes.set(npc.id, group); this.scene.add(group); }
      const position = simulationToWorld3D(npc.position);
      group.position.set(position.x, sampleGroundHeight(position.x, position.z), position.z);
      group.rotation.y = -npc.facing;
    }
    for (const portal of portals) {
      let group = this.worldActorMeshes.get(portal.id);
      if (!group) { group = this.createPortalVisual(); this.worldActorMeshes.set(portal.id, group); this.scene.add(group); }
      const position = simulationToWorld3D(portal.position);
      group.position.set(position.x, sampleGroundHeight(position.x, position.z), position.z);
      group.rotation.y = this.elapsed * .00035;
      const core = group.getObjectByName('portal-core');
      if (core) core.rotation.z = this.elapsed * .0012;
    }
  }

  private createMonsterVisual(species: FieldMonsterState['species']): THREE.Group {
    const root = new THREE.Group();
    const color = species === 'mossling' ? 0x6d9b67 : species === 'stonebeak' ? 0x78879a : 0x65456f;
    const emissive = species === 'corrupted-sprout' ? 0x4b1d62 : 0x17231a;
    const material = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: .15, roughness: .82, flatShading: true });
    const body = new THREE.Mesh(new THREE.SphereGeometry(.55, 8, 6), material); body.scale.set(1.05, .8, 1.15); body.position.y = .62; body.castShadow = true; root.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.42, 8, 6), material); head.position.set(0, 1.12, .18); head.castShadow = true; root.add(head);
    for (const x of [-.2, .2]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.055, 7, 5), new THREE.MeshBasicMaterial({ color: species === 'corrupted-sprout' ? 0xd777ff : 0x9aeaff })); eye.position.set(x, 1.18, .55); root.add(eye); }
    if (species === 'stonebeak') { const beak = new THREE.Mesh(new THREE.ConeGeometry(.13, .42, 5), new THREE.MeshStandardMaterial({ color: 0xd7a95b })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.08, .7); root.add(beak); }
    else for (const x of [-.28, .28]) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(.18, .65, 5), material); leaf.position.set(x, 1.58, .05); leaf.rotation.z = x > 0 ? -.45 : .45; root.add(leaf); }
    root.add(makeDisc(.65, 0x0b1011, .3));
    const targetRing = makeRing(.64, .76, 0xffbe58, .9); targetRing.name = 'field-target-ring'; targetRing.visible = false; root.add(targetRing);
    const targetMarker = new THREE.Mesh(new THREE.OctahedronGeometry(.16, 0), new THREE.MeshBasicMaterial({ color: 0xffd36c, transparent: true, opacity: .92, depthWrite: false }));
    targetMarker.name = 'field-target-marker'; targetMarker.position.y = 2.08; targetMarker.visible = false; root.add(targetMarker);
    return root;
  }

  private createNpcVisual(role: WorldNpcDefinition['role']): THREE.Group {
    const root = new THREE.Group();
    const tones: Record<WorldNpcDefinition['role'], number> = { mayor: 0x7a5e8c, 'class-mentor': 0x476e91, blacksmith: 0x8b5540, merchant: 0x6d8c64, innkeeper: 0x8b7359, 'rift-keeper': 0x73548f };
    const robe = new THREE.Mesh(new THREE.ConeGeometry(.42, 1.35, 7), new THREE.MeshStandardMaterial({ color: tones[role], roughness: .8, flatShading: true })); robe.position.y = .68; robe.castShadow = true; root.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0b897, roughness: .82 })); head.position.y = 1.55; head.castShadow = true; root.add(head);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.11), new THREE.MeshBasicMaterial({ color: role === 'class-mentor' ? 0xffd467 : 0x73d9ff })); marker.position.y = 2.25; root.add(marker);
    root.add(makeDisc(.45, 0x101116, .27));
    return root;
  }

  private createPortalVisual(): THREE.Group {
    const root = new THREE.Group();
    const stone = stoneMaterial(0x34384b);
    for (const x of [-1.15, 1.15]) { const pillar = new THREE.Mesh(new THREE.BoxGeometry(.42, 3.25, .55), stone); pillar.position.set(x, 1.62, 0); pillar.castShadow = true; root.add(pillar); }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.7, .45, .62), stone); lintel.position.y = 3.1; lintel.castShadow = true; root.add(lintel);
    const core = new THREE.Mesh(new THREE.RingGeometry(.68, 1.03, 40), new THREE.MeshBasicMaterial({ color: 0xffa348, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false })); core.name = 'portal-core'; core.position.y = 1.62; root.add(core);
    const glow = new THREE.PointLight(0xff7d32, 3.2, 5.5, 2); glow.position.y = 1.6; root.add(glow);
    root.add(makeDisc(1.45, 0x1a0b08, .42));
    return root;
  }

  private makeSprite(url: string, width: number, height: number): THREE.Sprite {
    const material = new THREE.SpriteMaterial({ map: this.texture(url), transparent: true, depthTest: true, depthWrite: false, alphaTest: .05 });
    const sprite = new THREE.Sprite(material); sprite.scale.set(width, height, 1); return sprite;
  }

  private texture(url: string): THREE.Texture {
    const cached = this.textureCache.get(url); if (cached) return cached;
    const texture = this.textureLoader.load(url, (loaded) => { loaded.userData.ready = true; }, undefined, () => { texture.userData.ready = false; });
    texture.userData.ready = false; texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.textureCache.set(url, texture); return texture;
  }

}

function assetUrl(key: AssetKey): string { return ASSET_MANIFEST[key].src ?? ''; }
function stoneMaterial(color: number): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: .03, flatShading: true }); }
function makeDisc(radius: number, color: number, opacity: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = .015; return mesh;
}
function makeRing(innerRadius: number, outerRadius: number, color: number, opacity: number): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 40), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = .018;
  return mesh;
}
function propObstructionProfile(prop: HybridPropDefinition): { radius: number; height: number } | undefined {
  const scale = prop.scale;
  if (prop.kind === 'pillar' || prop.kind === 'broken-pillar') return { radius: .82 * scale, height: (prop.kind === 'pillar' ? 4.9 : 3.2) * scale };
  if (prop.kind === 'arch') return { radius: 2.25 * scale, height: 5 * scale };
  if (prop.kind === 'rock') return { radius: 1.75 * scale, height: 2.7 * scale };
  if (prop.kind === 'wall') return { radius: 2.35 * scale, height: 3 * scale };
  if (prop.kind === 'crystal') return { radius: 1.25 * scale, height: 3.4 * scale };
  if (prop.kind === 'corruption') return { radius: 1.2 * scale, height: 2.4 * scale };
  if (prop.kind === 'house' || prop.kind === 'inn' || prop.kind === 'forge' || prop.kind === 'guild-hall') return { radius: 2.35 * scale, height: 4.4 * scale };
  if (prop.kind === 'tree') return { radius: 1.15 * scale, height: 3.8 * scale };
  return undefined;
}
function firstMaterial(object: THREE.Object3D): THREE.MeshBasicMaterial | undefined {
  if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) return object.material;
  for (const child of object.children) { const material = firstMaterial(child); if (material) return material; }
  return undefined;
}
function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => { if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) { child.geometry?.dispose(); const materials = Array.isArray(child.material) ? child.material : [child.material]; materials.forEach((material) => material.dispose()); } });
}

export function bossVisualSectorFromView(cameraPosition: { x: number; z: number }, bossPosition: { x: number; z: number }, bossOrientation: number): 'front'|'flank'|'rear' {
  const cameraAngle = Math.atan2(cameraPosition.z - bossPosition.z, cameraPosition.x - bossPosition.x);
  const delta = Math.abs(wrapAngle(cameraAngle - bossOrientation));
  if (delta <= Math.PI * .3) return 'front';
  if (delta >= Math.PI * .7) return 'rear';
  return 'flank';
}

function wrapAngle(angle: number): number {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}
