import type { CombatModel } from '../core/CombatModel';
import { GAME_CONFIG } from '../config';
import { BossAttackSystem } from '../gameplay/BossAttackSystem';
import { BossWorldEntity } from '../gameplay/BossWorldEntity';
import { createLocalPlayer, type MovementInput, type Vec2 } from '../gameplay/ArenaTypes';
import { LootSystem } from '../gameplay/LootSystem';
import { PlayerMovementController } from '../gameplay/PlayerMovementController';
import { PlayerProjectileSystem, type PlayerProjectileImpact, type PlayerProjectileKind } from '../gameplay/PlayerProjectileSystem';
import type { GameUI } from '../ui/GameUI';
import { HybridCameraController, MAX_USER_ZOOM_DISTANCE, MIN_USER_ZOOM_DISTANCE } from './HybridCameraController';
import { M10_HYBRID_TEST_SCENE, type Hybrid3DSceneDefinition } from './Hybrid3DTestScene';
import { HybridWorldRenderer } from './HybridWorldRenderer';
import { HybridWalkableSurfaceSystem } from './HybridWalkableSurfaceSystem';
import { BossEncounterLoop, type BossEncounterEvent } from '../gameplay/BossEncounterLoop';

export class Hybrid3DVerticalSlice {
  readonly definition: Hybrid3DSceneDefinition;
  readonly player = createLocalPlayer('m10-local-player', 'm10-guest');
  readonly boss: BossWorldEntity;
  readonly attacks: BossAttackSystem;
  readonly loot: LootSystem;
  readonly movement = new PlayerMovementController({ acceleration: 3600, deceleration: 5200, turnAcceleration: 6800, dashSpeed: 1900 });
  readonly renderer: HybridWorldRenderer;
  readonly surfaces: HybridWalkableSurfaceSystem;
  readonly projectiles = new PlayerProjectileSystem();
  readonly bossEncounter = new BossEncounterLoop();
  private movementInput: MovementInput = { x: 0, y: 0 };
  private readonly keyboard = new Set<string>();
  private previousTime = performance.now();
  private raf = 0;
  private dashCooldownMs = 0;
  private attackPoseMs = 0;
  private autoAttackMs = 380;
  private paused = false;
  private destroyed = false;
  private debugElement: HTMLElement;
  private collisionState: 'clear'|'blocked' = 'clear';

  constructor(
    mount: HTMLElement,
    private readonly ui: GameUI,
    private readonly combat: CombatModel,
    definition: Hybrid3DSceneDefinition = M10_HYBRID_TEST_SCENE,
  ) {
    this.definition = definition;
    this.player.position = { ...definition.playerSpawn };
    this.player.stats.moveSpeed = 520;
    this.boss = new BossWorldEntity(definition.bossSpawn);
    this.boss.orientation = definition.bossOrientation;
    this.boss.footprint.radiusX = definition.bossFootprint.radiusX;
    this.boss.footprint.radiusY = definition.bossFootprint.radiusY;
    this.attacks = new BossAttackSystem(definition.seed);
    this.loot = new LootSystem(definition.seed, 18);
    this.surfaces = new HybridWalkableSurfaceSystem(definition.dimensions.width, definition.dimensions.depth, definition.colliders, 38);
    this.renderer = new HybridWorldRenderer(mount, definition);
    this.applyVisualProofPreset(new URLSearchParams(location.search).get('proof'));
    if (!new URLSearchParams(location.search).has('proof')) this.renderer.cameraController.setUserZoomDistance(loadZoomPreference());
    this.debugElement = createDebugElement();
    definition.lootSpawns.forEach((target, index) => this.loot.spawn(index === 2 ? 'relic' : 'run-xp', index === 2 ? 'epic' : index === 1 ? 'rare' : 'common', definition.bossSpawn, 10 + index * 10, target));
    this.attacks.force('ground-slam', definition.telegraphSpawn, 1, { position: definition.bossSpawn, orientation: definition.bossOrientation });
    this.bindInput();
    this.raf = requestAnimationFrame(this.frame);
  }

  private applyVisualProofPreset(proof: string | null): void {
    if (!proof) return;
    document.body.classList.add('hud-hidden', 'm10-visual-proof');
    const camera = this.renderer.cameraController;
    if (proof === 'master') {
      this.player.position = { x: 0, y: 720 };
      camera.setVisualProofView({ mode: 'follow', distance: 16.2, yaw: 0, pitchDeg: 55 });
    } else if (proof === 'flank') {
      this.player.position = { x: -520, y: -320 };
      camera.setVisualProofView({ mode: 'look', distance: 14.2, yaw: .52, pitchDeg: 52, offsetX: .8, offsetZ: -.5 });
    } else if (proof === 'rear') {
      this.player.position = { x: 80, y: -760 };
      camera.setVisualProofView({ mode: 'look', distance: 13.8, yaw: Math.PI, pitchDeg: 51, offsetZ: -.8 });
    } else if (proof === 'occlusion') {
      this.player.position = { x: -520, y: 120 };
      camera.setVisualProofView({ mode: 'look', distance: 12.8, yaw: 0, pitchDeg: 49, offsetX: -4.9, offsetZ: 2.7 });
    } else if (proof === 'away') {
      this.player.position = { x: 0, y: 650 };
      camera.setVisualProofView({ mode: 'look', distance: 15.8, yaw: Math.PI, pitchDeg: 54, offsetZ: 2.2 });
    } else if (proof === 'wide') {
      this.player.position = { x: 0, y: 650 };
      camera.setVisualProofView({ mode: 'tactical', distance: 20.5, yaw: 0, pitchDeg: 58 });
    } else if (proof === 'close') {
      this.player.position = { x: 0, y: 470 };
      camera.setVisualProofView({ mode: 'follow', distance: 10.2, yaw: 0, pitchDeg: 49 });
    }
  }

  resize(): void { this.renderer.resize(); }
  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; this.previousTime = performance.now(); }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.debugElement.remove();
    this.renderer.destroy();
  }

  cameraState(): ReturnType<HybridCameraController['snapshot']> { return this.renderer.cameraController.snapshot(); }

  private frame = (now: number): void => {
    if (this.destroyed) return;
    const deltaMs = Math.min(50, Math.max(0, now - this.previousTime));
    this.previousTime = now;
    if (!this.paused) this.update(deltaMs, now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(deltaMs: number, now: number): void {
    const input = this.combinedInput();
    this.movement.update(this.player, input, deltaMs, (position) => this.constrain(position));
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - deltaMs);
    this.attackPoseMs = Math.max(0, this.attackPoseMs - deltaMs);
    this.autoAttackMs -= deltaMs;
    if (this.autoAttackMs <= 0 && this.combat.phase === 'playing' && this.bossEncounter.attackEnabled) {
      this.performAttack('normal', now);
      this.autoAttackMs = this.combat.attackIntervalMs;
    }
    if (this.bossEncounter.state === 'alive') this.boss.update(deltaMs, this.player.position);
    const projectileImpacts = this.projectiles.update(deltaMs, this.boss.position, Math.min(this.boss.footprint.radiusX, this.boss.footprint.radiusY) * .78);
    for (const impact of projectileImpacts) this.resolveProjectileImpact(impact, now);
    const relative = this.boss.relativeTo(this.player.position);
    this.attacks.update(deltaMs, this.player.position, this.bossEncounter.bossLevel, this.combat.phase === 'playing' && this.bossEncounter.attackEnabled, this.combat.bossHp / this.combat.maxHp, {
      position: this.boss.position, orientation: this.boss.orientation, sector: relative.sector, distanceZone: relative.distanceZone, velocity: this.player.velocity,
    });
    this.loot.update(deltaMs, this.player.position, this.player.stats.pickupRadius);
    for (const event of this.bossEncounter.update(deltaMs)) this.handleBossEncounterEvent(event, now);
    const bossSnapshot = this.bossEncounter.snapshot();
    this.renderer.update(deltaMs, {
      player: this.player,
      bossPosition: this.boss.position,
      bossOrientation: this.boss.orientation,
      bossHpRatio: this.combat.bossHp / this.combat.maxHp,
      telegraphs: this.attacks.active,
      loot: this.loot.drops,
      projectiles: this.projectiles.active,
      projectileImpacts,
      dashing: this.movement.isDashing,
      attacking: this.attackPoseMs > 0,
      aimDirection: { x: this.boss.position.x - this.player.position.x, y: this.boss.position.y - this.player.position.y },
      bossState: bossSnapshot.state,
      bossDeathProgress: bossSnapshot.deathProgress,
    });
    this.ui.update(this.combat.bossHp, this.combat.maxHp, this.combat.elapsedMs(now), this.combat.powerCooldownRemaining(now), this.combat.phase === 'playing', this.projectiles.hasPendingPower);
    this.ui.updateArena(this.player.hp, this.player.maxHp, 1, 30, 100, this.bossEncounter.bossRoundIndex, this.dashCooldownMs);
    this.ui.updateBossRound(this.bossEncounter.bossRoundIndex, this.bossEncounter.bossLevel, this.bossEncounter.state);
    const cameraSnapshot = this.renderer.cameraController.snapshot();
    this.ui.updateZoomControl(cameraSnapshot.userZoomDistance, MIN_USER_ZOOM_DISTANCE, MAX_USER_ZOOM_DISTANCE);
    this.ui.updateMinimap(toFullMap(this.player.position), toFullMap(this.boss.position), []);
    this.updateDebug(relative.sector, relative.distance);
  }

  private bindInput(): void {
    this.ui.bindMovement((input) => { this.movementInput = { ...input }; });
    this.ui.bindDash(() => this.dash());
    this.ui.bindPower(() => this.performAttack('power', performance.now()));
    this.ui.bindZoom((delta) => { this.renderer.cameraController.zoom(delta); saveZoomPreference(this.renderer.cameraController.userZoomDistance); });
    this.ui.bindZoomAbsolute((distance) => { this.renderer.cameraController.setUserZoomDistance(distance); saveZoomPreference(distance); });
    this.ui.bindCameraGesture((dx, dy, gesture) => this.renderer.cameraController.gesture(dx, dy, gesture));
    this.ui.bindCameraReset(() => this.renderer.cameraController.resetFollow());
    this.ui.bindDebug((action) => {
      if (action === 'camera-follow') this.renderer.cameraController.setMode('follow');
      else if (action === 'camera-look') this.renderer.cameraController.setMode('look');
      else if (action === 'camera-boss') this.renderer.cameraController.setMode('boss-focus');
      else if (action === 'scenario-master') { this.player.position = { x: 0, y: 720 }; this.renderer.cameraController.resetFollow(); }
      else if (action === 'telegraphs') this.attacks.force('radial-shockwave', this.player.position, 1, { position: this.boss.position, orientation: this.boss.orientation });
      else if (action === 'spawn-loot') this.loot.spawn('run-xp', 'common', this.boss.position, 10, this.player.position);
      else if (action === 'spawn-rare') this.loot.spawn('relic', 'epic', this.boss.position, 30, { x: this.player.position.x + 260, y: this.player.position.y - 120 });
      else if (action === 'hud-toggle') this.ui.toggleHud();
      else if (action === 'performance' || action === 'collision-bounds') this.renderer.toggleDebug();
      else if (action === 'attack-slam') this.attacks.force('ground-slam', this.player.position, 1, { position: this.boss.position, orientation: this.boss.orientation });
      else if (action === 'attack-beam') this.attacks.force('core-beam', this.player.position, 1, { position: this.boss.position, orientation: this.boss.orientation });
      else if (action === 'attack-ring') this.attacks.force('corruption-ring', this.player.position, 1, { position: this.boss.position, orientation: this.boss.orientation });
      else if (action === 'attack-cone') this.attacks.force('void-cone', this.player.position, 1, { position: this.boss.position, orientation: this.boss.orientation });
      else if (action === 'kill') {
        const result = this.combat.debugForceKill(performance.now());
        if (result.bossDefeated) this.beginBossDefeat();
      }
    });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keyboard.add(event.code);
    if (event.code === 'Space') { event.preventDefault(); this.dash(); }
    if (event.code === 'KeyE' || event.code === 'KeyF') this.performAttack('power', performance.now());
    if (event.code === 'KeyR') this.renderer.cameraController.resetFollow();
    if (event.code === 'KeyT') this.renderer.cameraController.setMode('tactical');
    if (event.code === 'F3') this.renderer.toggleDebug();
  };
  private onKeyUp = (event: KeyboardEvent): void => { this.keyboard.delete(event.code); };

  private combinedInput(): MovementInput {
    let x = this.movementInput.x, y = this.movementInput.y;
    if (this.keyboard.has('KeyA') || this.keyboard.has('ArrowLeft')) x -= 1;
    if (this.keyboard.has('KeyD') || this.keyboard.has('ArrowRight')) x += 1;
    if (this.keyboard.has('KeyW') || this.keyboard.has('ArrowUp')) y -= 1;
    if (this.keyboard.has('KeyS') || this.keyboard.has('ArrowDown')) y += 1;
    const magnitude = Math.hypot(x, y);
    const normalized = magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
    return cameraRelativeMovement(normalized, this.renderer.cameraController.yaw);
  }

  private dash(): void {
    if (this.dashCooldownMs > 0) return;
    if (this.movement.startDash(this.combinedInput())) this.dashCooldownMs = 1450;
  }

  private performAttack(kind: 'normal' | 'power', now: number): void {
    if (this.combat.phase !== 'playing' || this.combat.isPaused || !this.bossEncounter.attackEnabled) return;
    if (kind === 'power' && (!this.combat.canPowerHit(now) || this.projectiles.hasPendingPower)) return;
    const damage = kind === 'power' ? GAME_CONFIG.combat.powerDamage : GAME_CONFIG.combat.normalDamage;
    const launched = this.projectiles.launch(kind, this.player.position, this.boss.position, damage);
    if (!launched) return;
    // Normal auto attacks only need a readable launch beat. Holding a full
    // directional cutout for most of the fire interval made locomotion pop
    // between run and attack art on every shot.
    this.attackPoseMs = kind === 'power' ? 380 : 160;
  }

  private resolveProjectileImpact(impact: PlayerProjectileImpact, now: number): void {
    const result = this.combat.attack(impact.kind as PlayerProjectileKind, now);
    if (!result.accepted) return;
    this.ui.showDamageNumber(result.damage, impact.kind === 'power');
    if (result.triggeredBreakpointId && this.combat.pendingChoices.length) {
      this.ui.showChoices(this.combat.pendingChoices, (mutation) => {
        if (this.combat.chooseMutation(mutation, performance.now())) { this.ui.setMutation(mutation); this.ui.hideChoices(); }
      });
    }
    if (result.bossDefeated) {
      this.beginBossDefeat();
    }
  }

  private constrain(position: Vec2): Vec2 {
    const resolved = this.surfaces.resolve(position);
    this.collisionState = resolved.collisionState;
    return this.bossEncounter.collisionEnabled ? this.boss.constrain(resolved.position, 36) : resolved.position;
  }

  private updateDebug(sector: string, distance: number): void {
    if (!this.renderer.debugRoot.visible) { this.debugElement.hidden = true; return; }
    this.debugElement.hidden = false;
    const metrics = this.renderer.metrics(), camera = this.renderer.cameraController;
    const cameraSnapshot = camera.snapshot();
    this.debugElement.textContent = [
      'M10 HYBRID 3D',
      `HERO ${this.player.position.x.toFixed(0)} / ${this.player.position.y.toFixed(0)}`,
      `BOSS ${sector.toUpperCase()} · ${distance.toFixed(0)}u`,
      `CAM ${camera.mode.toUpperCase()} · USER ${cameraSnapshot.userZoomDistance.toFixed(1)}m · COLL ${cameraSnapshot.collisionLimitedDistance.toFixed(1)}m · ACT ${cameraSnapshot.actualCameraDistance.toFixed(1)}m`,
      `${metrics.calls} calls · ${metrics.triangles} tris · ${metrics.textures} tex`,
      `PITCH ${cameraSnapshot.pitchDeg.toFixed(1)}° · YAW ${(cameraSnapshot.yaw * 180 / Math.PI).toFixed(0)}° · BIAS ${cameraSnapshot.bossBias.toFixed(2)}`,
      `SHOT ${metrics.projectiles} · POOL ${metrics.projectilePool} · BOSS VIEW ${metrics.bossView.toUpperCase()}`,
      `HERO DIR ${metrics.heroDirectionSwaps}/s · POSE ${metrics.heroPoseSwaps}/s · TEX ${metrics.heroTextureSwaps}/s`,
      `GROUND ${metrics.surfaceId} ${metrics.groundHeight.toFixed(2)}m · HERO Y ${metrics.heroRenderY.toFixed(2)} · ANCHOR ${metrics.heroAnchor.toFixed(3)} · ${this.collisionState.toUpperCase()}`,
      `ANIM ${metrics.heroAnimationFrame} · ${metrics.heroAsset}`,
      `BOSS ${this.bossEncounter.state.toUpperCase()} · ROUND ${this.bossEncounter.bossRoundIndex} · LV ${this.bossEncounter.bossLevel} · HP ${this.combat.bossHp}/${this.combat.maxHp}`,
      `CAMERA ${metrics.cameraObstructed ? 'OCCLUDED / FADE' : 'CLEAR'} · ${metrics.heroAsset}`,
    ].join('\n');
  }

  private beginBossDefeat(): void {
    const events = this.bossEncounter.defeat();
    if (!events.length) return;
    this.attacks.reset(this.definition.seed + this.bossEncounter.bossRoundIndex);
    this.projectiles.reset();
    this.attackPoseMs = 0;
    this.ui.announce('COLOSSUS BROKEN', `ROUND ${this.bossEncounter.bossRoundIndex} CLEARED`, '#ff8a42', 1150);
  }

  private handleBossEncounterEvent(event: BossEncounterEvent, now: number): void {
    if (event === 'loot') {
      this.loot.spawn('relic', 'epic', this.boss.position, 50, { x: this.player.position.x + 180, y: this.player.position.y - 140 });
      this.loot.spawn('run-xp', 'rare', this.boss.position, 30, { x: this.player.position.x - 130, y: this.player.position.y - 80 });
    } else if (event === 'respawn') {
      this.boss.position = { ...this.definition.bossSpawn };
      this.boss.orientation = this.definition.bossOrientation;
      this.attacks.reset(this.definition.seed + this.bossEncounter.bossRoundIndex * 31);
      this.projectiles.reset();
      this.combat.startNextCycle(now, this.bossEncounter.maxHp(this.combat.activeBoss.maxHp));
      this.autoAttackMs = 650;
      this.ui.announce(`ROUND ${this.bossEncounter.bossRoundIndex}`, `HARVEST COLOSSUS · LV. ${this.bossEncounter.bossLevel}`, '#ffb45c', 1100);
    }
  }
}

function toFullMap(point: Vec2): Vec2 { return { x: point.x + 2800, y: point.y + 2000 }; }
/** Maps screen-space stick/WASD input to the planar simulation using the
 * local camera yaw. Up on the stick therefore remains up on the screen after
 * the player orbits the camera; camera state still never enters simulation
 * snapshots or authoritative world state. */
export function cameraRelativeMovement(input: MovementInput, cameraYaw: number): MovementInput {
  const cos = Math.cos(cameraYaw), sin = Math.sin(cameraYaw);
  return {
    x: input.x * cos + input.y * sin,
    y: -input.x * sin + input.y * cos,
  };
}
function createDebugElement(): HTMLElement {
  const element = document.createElement('pre'); element.id = 'hybrid-debug'; element.hidden = true; document.body.appendChild(element); return element;
}
const ZOOM_STORAGE_KEY = 'mutation-boss.hybrid.userZoomDistance';
function loadZoomPreference(): number {
  try {
    const value = Number(sessionStorage.getItem(ZOOM_STORAGE_KEY));
    return Number.isFinite(value) && value >= MIN_USER_ZOOM_DISTANCE && value <= MAX_USER_ZOOM_DISTANCE ? value : 16.8;
  } catch { return 16.8; }
}
function saveZoomPreference(distance: number): void { try { sessionStorage.setItem(ZOOM_STORAGE_KEY, String(distance)); } catch { /* storage can be unavailable in privacy mode */ } }
