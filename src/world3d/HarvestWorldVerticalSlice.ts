import type { CombatModel } from '../core/CombatModel';
import { createLocalPlayer, type MovementInput, type Vec2 } from '../gameplay/ArenaTypes';
import { FieldMonsterSystem } from '../gameplay/FieldMonsterSystem';
import { FieldCombatTargeting } from '../gameplay/FieldCombatTargeting';
import { HARVEST_HAVEN_MAP } from '../gameplay/HarvestHavenMap';
import { LootSystem } from '../gameplay/LootSystem';
import { PlayerMovementController } from '../gameplay/PlayerMovementController';
import { PlayerProjectileSystem, type PlayerProjectileImpact } from '../gameplay/PlayerProjectileSystem';
import { WorldPortalSystem } from '../gameplay/WorldPortalSystem';
import { WorldProgression, type HeroClassId, type WorldProgressionSnapshot } from '../gameplay/WorldProgression';
import { WorldQuestSystem } from '../gameplay/WorldQuestSystem';
import type { GameUI } from '../ui/GameUI';
import { HarvestWorldHUD } from '../ui/HarvestWorldHUD';
import { HybridWorldRenderer } from './HybridWorldRenderer';
import { HybridWalkableSurfaceSystem } from './HybridWalkableSurfaceSystem';
import { MAX_USER_ZOOM_DISTANCE, MIN_USER_ZOOM_DISTANCE } from './HybridCameraController';
import { cameraRelativeMovement } from './Hybrid3DVerticalSlice';

export interface HarvestWorldPersistence {
  load(): WorldProgressionSnapshot;
  save(snapshot: WorldProgressionSnapshot): void;
}

export const FIELD_ATTACK_RANGE = 760;

export class HarvestWorldVerticalSlice {
  readonly definition = HARVEST_HAVEN_MAP.scene;
  readonly player = createLocalPlayer('haven-local-player', 'haven-guest');
  readonly movement = new PlayerMovementController({ acceleration: 3300, deceleration: 4900, turnAcceleration: 6200, dashSpeed: 1750 });
  readonly surfaces = new HybridWalkableSurfaceSystem(this.definition.dimensions.width, this.definition.dimensions.depth, this.definition.colliders, 38);
  readonly renderer: HybridWorldRenderer;
  readonly monsters = new FieldMonsterSystem(HARVEST_HAVEN_MAP.monsters);
  readonly targeting = new FieldCombatTargeting();
  readonly quests = new WorldQuestSystem(HARVEST_HAVEN_MAP.quests);
  readonly portals = new WorldPortalSystem(HARVEST_HAVEN_MAP.portals);
  readonly projectiles = new PlayerProjectileSystem();
  readonly loot = new LootSystem(this.definition.seed, 24);
  readonly progression: WorldProgression;
  readonly worldHud = new HarvestWorldHUD(HARVEST_HAVEN_MAP.name, HARVEST_HAVEN_MAP.subtitle);
  private readonly projectileTargets = new Map<string, string>();
  private movementInput: MovementInput = { x: 0, y: 0 };
  private readonly keyboard = new Set<string>();
  private raf = 0;
  private previousTime = performance.now();
  private paused = false;
  private destroyed = false;
  private dashCooldownMs = 0;
  private attackPoseMs = 0;
  private attackCooldownMs = 250;
  private powerCooldownMs = 0;
  private currentImpacts: PlayerProjectileImpact[] = [];

  constructor(mount: HTMLElement, private readonly ui: GameUI, _combat: CombatModel, private readonly persistence: HarvestWorldPersistence) {
    document.body.classList.add('world-mode');
    this.player.position = { ...this.definition.playerSpawn };
    this.player.stats.moveSpeed = 500;
    this.progression = new WorldProgression(persistence.load());
    this.renderer = new HybridWorldRenderer(mount, this.definition);
    this.renderer.cameraController.setUserZoomDistance(loadWorldZoom());
    this.worldHud.bindInteract(() => this.enterNearbyPortal());
    this.worldHud.bindClass((classId) => this.chooseClass(classId));
    this.worldHud.bindAttack(() => this.toggleAttack());
    this.worldHud.updateProgress(this.progression);
    this.worldHud.updateQuests(HARVEST_HAVEN_MAP.quests, this.quests.states);
    this.bindInput();
    this.ui.announce('HARVEST HAVEN', 'TOWN · SOUTHFIELDS · RAID GATE', '#8fd8ff', 1300);
    this.raf = requestAnimationFrame(this.frame);
  }

  resize(): void { this.renderer.resize(); }
  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; this.previousTime = performance.now(); }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true; cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp);
    this.worldHud.destroy(); this.renderer.destroy(); document.body.classList.remove('world-mode');
  }

  private frame = (now: number): void => {
    if (this.destroyed) return;
    const deltaMs = Math.min(50, Math.max(0, now - this.previousTime)); this.previousTime = now;
    if (!this.paused) this.update(deltaMs, now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(deltaMs: number, now: number): void {
    this.movement.update(this.player, this.combinedInput(), deltaMs, (position) => this.surfaces.resolve(position).position);
    this.monsters.update(deltaMs);
    this.loot.update(deltaMs, this.player.position, this.player.stats.pickupRadius);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - deltaMs);
    this.attackPoseMs = Math.max(0, this.attackPoseMs - deltaMs);
    this.attackCooldownMs -= deltaMs;
    this.powerCooldownMs = Math.max(0, this.powerCooldownMs - deltaMs);
    const target = this.selectedTarget();
    const targetInRange = Boolean(target && this.targetDistance(target.position) <= FIELD_ATTACK_RANGE);
    if (target && targetInRange && this.targeting.autoAttackActive && this.attackCooldownMs <= 0 && this.projectiles.active.length < 3) {
      this.launchAttack('normal', target.id, target.position, 30 + this.progression.heroLevel * 2);
      this.attackCooldownMs = 760;
    }
    const trackedTarget = this.targeting.selectedTargetId ? this.monsters.monsters.find((monster) => monster.id === this.targeting.selectedTargetId && monster.alive) : undefined;
    this.currentImpacts = trackedTarget ? this.projectiles.update(deltaMs, trackedTarget.position, 54) : [];
    for (const impact of this.currentImpacts) this.resolveImpact(impact, now);
    const portal = this.portals.nearby(this.player.position);
    this.worldHud.showPortal(portal, Boolean(portal && this.portals.canEnter(portal, this.progression.heroLevel)));
    this.worldHud.showTarget(target?.name, target?.level, target?.hp, target?.maxHp);
    this.worldHud.updateAttack(Boolean(target), this.targeting.autoAttackActive, targetInRange);
    this.renderer.update(deltaMs, {
      player: this.player,
      bossPosition: this.player.position,
      bossOrientation: 0,
      bossHpRatio: 1,
      telegraphs: [], loot: this.loot.drops, projectiles: this.projectiles.active, projectileImpacts: this.currentImpacts,
      dashing: this.movement.isDashing, attacking: this.attackPoseMs > 0,
      aimDirection: target ? { x: target.position.x - this.player.position.x, y: target.position.y - this.player.position.y } : undefined,
      bossState: 'alive', bossDeathProgress: 0, bossVisible: false,
      fieldMonsters: this.monsters.monsters, worldNpcs: HARVEST_HAVEN_MAP.npcs, worldPortals: HARVEST_HAVEN_MAP.portals,
      selectedFieldMonsterId: this.targeting.selectedTargetId,
    });
    this.ui.updateArena(this.player.hp, this.player.maxHp, this.progression.heroLevel, this.progression.heroXp, this.progression.heroXpToNext, 1, this.dashCooldownMs);
    this.ui.updateZoomControl(this.renderer.cameraController.userZoomDistance, MIN_USER_ZOOM_DISTANCE, MAX_USER_ZOOM_DISTANCE);
    this.ui.update(1, 1, now, this.powerCooldownMs, Boolean(target && targetInRange), false);
  }

  private selectedTarget() {
    const target = this.targeting.selectedTargetId
      ? this.monsters.monsters.find((monster) => monster.id === this.targeting.selectedTargetId && monster.alive)
      : undefined;
    if (!target && this.targeting.selectedTargetId) this.targeting.stop(true);
    return target;
  }

  private targetDistance(position: Vec2): number {
    return Math.hypot(position.x - this.player.position.x, position.y - this.player.position.y);
  }

  private launchAttack(kind: 'normal'|'power', targetId: string, targetPosition: Vec2, damage: number): void {
    const projectile = this.projectiles.launch(kind, this.player.position, targetPosition, damage);
    if (!projectile) return;
    this.projectileTargets.set(projectile.id, targetId);
    this.targeting.select(targetId);
    this.attackPoseMs = kind === 'power' ? 380 : 165;
  }

  private resolveImpact(impact: PlayerProjectileImpact, _now: number): void {
    const targetId = this.projectileTargets.get(impact.projectileId); this.projectileTargets.delete(impact.projectileId);
    if (!targetId) return;
    const defeat = this.monsters.damage(targetId, impact.damage);
    this.ui.showDamageNumber(impact.damage, impact.kind === 'power');
    if (!defeat) return;
    // Any remaining bolts were authored for the defeated target. Retiring
    // them prevents a stale projectile from visually jumping to the next mob.
    this.projectiles.reset(); this.projectileTargets.clear(); this.targeting.removeTarget(targetId);
    const direct = this.progression.grant(defeat.heroXp, defeat.jobXp);
    let heroLevels = direct.heroLevels, jobLevels = direct.jobLevels;
    for (const quest of this.quests.onMonsterDefeated(defeat)) {
      const reward = this.progression.grant(quest.rewardHeroXp, quest.rewardJobXp);
      heroLevels += reward.heroLevels; jobLevels += reward.jobLevels;
      this.ui.announce('QUEST COMPLETE', quest.title, '#8fe4a1', 1150);
    }
    this.loot.spawn('run-xp', defeat.species === 'corrupted-sprout' ? 'rare' : 'common', defeat.position, 8, { x: defeat.position.x + 35, y: defeat.position.y + 20 });
    this.persistence.save(this.progression.snapshot());
    this.worldHud.updateProgress(this.progression);
    this.worldHud.updateQuests(HARVEST_HAVEN_MAP.quests, this.quests.states);
    if (heroLevels || jobLevels) this.ui.announce('LEVEL UP', `HERO ${this.progression.heroLevel} · JOB ${this.progression.jobLevel}`, '#ffd36a', 1050);
  }

  private chooseClass(classId: HeroClassId): void {
    if (!this.progression.chooseClass(classId)) return;
    this.persistence.save(this.progression.snapshot()); this.worldHud.updateProgress(this.progression);
    this.ui.announce('CLASS AWAKENED', classId.toUpperCase(), '#ffd36a', 1300);
  }

  private enterNearbyPortal(): void {
    const portal = this.portals.nearby(this.player.position);
    if (!portal || !this.portals.canEnter(portal, this.progression.heroLevel)) return;
    location.search = portal.query;
  }

  private bindInput(): void {
    this.ui.bindMovement((input) => { this.movementInput = { ...input }; });
    this.ui.bindDash(() => this.dash());
    this.ui.bindPower(() => this.powerAttack());
    this.ui.bindZoom((delta) => { this.renderer.cameraController.zoom(delta); saveWorldZoom(this.renderer.cameraController.userZoomDistance); });
    this.ui.bindZoomAbsolute((distance) => { this.renderer.cameraController.setUserZoomDistance(distance); saveWorldZoom(distance); });
    this.ui.bindCameraGesture((dx, dy, gesture) => this.renderer.cameraController.gesture(dx, dy, gesture));
    this.ui.bindCameraReset(() => this.renderer.cameraController.resetFollow());
    this.ui.bindWorldTap((clientX, clientY) => this.selectTargetAt(clientX, clientY));
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keyboard.add(event.code);
    if (event.code === 'Space') { event.preventDefault(); this.dash(); }
    if (event.code === 'KeyE' || event.code === 'KeyF') this.powerAttack();
    if (event.code === 'KeyX') this.toggleAttack();
    if (event.code === 'Enter' || event.code === 'KeyQ') this.enterNearbyPortal();
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
    const magnitude = Math.hypot(x, y); const normalized = magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
    return cameraRelativeMovement(normalized, this.renderer.cameraController.yaw);
  }
  private dash(): void { if (this.dashCooldownMs <= 0 && this.movement.startDash(this.combinedInput())) this.dashCooldownMs = 1450; }
  private powerAttack(): void {
    if (this.powerCooldownMs > 0) return;
    const target = this.selectedTarget(); if (!target || this.targetDistance(target.position) > FIELD_ATTACK_RANGE) return;
    this.launchAttack('power', target.id, target.position, 92 + this.progression.heroLevel * 4); this.powerCooldownMs = 5200;
  }

  private selectTargetAt(clientX: number, clientY: number): void {
    const targetId = this.renderer.pickFieldMonster(clientX, clientY);
    if (targetId === this.targeting.selectedTargetId) return;
    this.projectiles.reset(); this.projectileTargets.clear();
    this.targeting.select(targetId);
  }

  private toggleAttack(): void {
    const target = this.selectedTarget();
    if (!target) { this.targeting.stop(true); return; }
    if (this.targeting.autoAttackActive) { this.targeting.stop(); this.projectiles.reset(); this.projectileTargets.clear(); return; }
    if (this.targetDistance(target.position) > FIELD_ATTACK_RANGE) {
      this.ui.announce('OUT OF RANGE', 'MOVE CLOSER TO ATTACK', '#ffbd68', 850);
      return;
    }
    this.targeting.start();
    this.attackCooldownMs = 0;
  }
}

const WORLD_ZOOM_KEY = 'harvest-colossus.world.userZoomDistance';
function loadWorldZoom(): number { const value = Number(sessionStorage.getItem(WORLD_ZOOM_KEY)); return Number.isFinite(value) ? value : 16.2; }
function saveWorldZoom(value: number): void { try { sessionStorage.setItem(WORLD_ZOOM_KEY, String(value)); } catch { /* optional */ } }
