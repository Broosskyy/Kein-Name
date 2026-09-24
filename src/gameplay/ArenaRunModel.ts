import { GAME_CONFIG } from '../config';
import type { CombatSnapshot } from '../core/CombatModel';
import { CombatModel } from '../core/CombatModel';
import { RunRandom } from '../core/RunRandom';
import type { Mutation } from '../types';
import { BossAttackSystem, type BossAttackImpact, type BossAttackKind } from './BossAttackSystem';
import { EQUIPMENT, PROTOTYPE_PET } from './Equipment';
import { LootSystem, type LootKind, type LootPickup, type LootRarity } from './LootSystem';
import { RUN_MODES, type RunModeId } from './RunModes';
import { RUN_UPGRADES, applyUpgrades, eligibleUpgrades, type RunUpgradeDefinition, type SelectedUpgrade } from './RunUpgrades';
import { clampToArena, createDummyAlly, createLocalPlayer, type CombatEntityState, type MovementInput } from './ArenaTypes';

export interface RunInventoryState {
  equipmentIds: string[]; temporaryBuffIds: string[]; petId?: string; resources: Record<string, number>;
}

export interface ArenaRunSnapshot {
  schemaVersion: 1; eligible: boolean; savedAt: string; runMode: RunModeId; combat: CombatSnapshot;
  player: CombatEntityState; runLevel: number; runXp: number; xpToNext: number; selectedUpgrades: SelectedUpgrade[];
  pendingUpgradeIds: string[]; inventory: RunInventoryState; bossCycle: number; bossCyclesCleared: number;
  pickups: number; lootSummary: Record<string, number>;
}

export type ArenaRunEvent =
  | { type: 'PLAYER_MOVED'; position: { x: number; y: number } }
  | { type: 'PLAYER_DAMAGED'; damage: number; hp: number; source: BossAttackKind }
  | { type: 'PLAYER_DEFEATED' }
  | { type: 'LOOT_SPAWNED'; kind: LootKind; rarity: LootRarity }
  | { type: 'LOOT_PICKED'; pickup: LootPickup }
  | { type: 'RUN_LEVEL_UP'; level: number; choices: string[] }
  | { type: 'UPGRADE_ACQUIRED'; upgradeId: string; stacks: number }
  | { type: 'BOSS_CYCLE_CLEARED'; cycle: number }
  | { type: 'BOSS_CYCLE_STARTED'; cycle: number };

export class ArenaRunModel {
  readonly player: CombatEntityState;
  readonly dummyAllies: CombatEntityState[] = [];
  readonly bossAttacks: BossAttackSystem;
  readonly loot: LootSystem;
  readonly inventory: RunInventoryState = { equipmentIds: [], temporaryBuffIds: [], resources: {} };
  runMode: RunModeId;
  runLevel = 1;
  runXp = 0;
  xpToNext = 100;
  selectedUpgrades: SelectedUpgrade[] = [];
  pendingUpgradeIds: string[] = [];
  bossCycle = 1;
  bossCyclesCleared = 0;
  pickupCount = 0;
  lootSummary: Record<string, number> = {};
  endlessCycles = false;
  pickupRadiusVisible = false;
  collisionBoundsVisible = false;
  telegraphsVisible = true;
  performanceCountersVisible = false;
  private readonly random: RunRandom;
  private readonly baseStats;
  private emit: (event: ArenaRunEvent) => void;

  constructor(readonly combat: CombatModel, guestId: string, runMode: RunModeId = 'solo', emit: (event: ArenaRunEvent) => void = () => undefined) {
    if (!RUN_MODES[runMode].implemented) throw new Error(`${runMode} is architecture-ready but not implemented.`);
    this.runMode = runMode; this.emit = emit; this.random = new RunRandom(combat.seed ^ 0xa6e06e);
    this.player = createLocalPlayer(`player-${combat.runId}`, guestId); this.baseStats = { ...this.player.stats };
    this.bossAttacks = new BossAttackSystem(combat.seed); this.loot = new LootSystem(combat.seed, GAME_CONFIG.arena.maxLoot);
    this.syncCombatModifiers();
  }

  setEventSink(emit: (event: ArenaRunEvent) => void): void { this.emit = emit; }
  get pausedForUpgrade(): boolean { return this.pendingUpgradeIds.length > 0; }
  get runComplete(): boolean { return !this.endlessCycles && this.bossCyclesCleared >= GAME_CONFIG.cycles.max; }

  reset(guestId = this.player.playerId ?? 'guest'): void {
    Object.assign(this.player, createLocalPlayer(`player-${this.combat.runId}`, guestId));
    this.runLevel = 1; this.runXp = 0; this.xpToNext = 100; this.selectedUpgrades = []; this.pendingUpgradeIds = [];
    this.bossCycle = 1; this.bossCyclesCleared = 0; this.pickupCount = 0; this.lootSummary = {};
    this.inventory.equipmentIds = []; this.inventory.temporaryBuffIds = []; this.inventory.resources = {}; delete this.inventory.petId;
    this.dummyAllies.length = 0; this.bossAttacks.reset(this.combat.seed); this.loot.reset(this.combat.seed); this.syncCombatModifiers();
  }

  resultExtras(): Record<string, unknown> {
    return { runMode: this.runMode, bossCyclesCleared: this.bossCyclesCleared, runLevel: this.runLevel,
      upgradeIds: this.selectedUpgrades.flatMap((item) => Array(item.stacks).fill(item.id)), pickupCount: this.pickupCount,
      lootSummary: { ...this.lootSummary }, playerDefeated: this.player.hp <= 0 };
  }

  update(deltaMs: number, input: MovementInput, nowMs: number): void {
    if (this.combat.phase === 'playing' && !this.pausedForUpgrade) this.movePlayer(deltaMs, input);
    this.player.invulnerableMs = Math.max(0, this.player.invulnerableMs - deltaMs);
    const attackEnabled = this.combat.phase === 'playing' && !this.pausedForUpgrade;
    for (const impact of this.bossAttacks.update(deltaMs, this.player.position, this.bossCycle, attackEnabled)) this.resolveBossImpact(impact, nowMs);
    for (const pickup of this.loot.update(deltaMs, this.player.position, this.player.stats.pickupRadius)) this.collect(pickup, nowMs);
  }

  movePlayer(deltaMs: number, input: MovementInput): void {
    const magnitude = Math.hypot(input.x, input.y);
    const nx = magnitude > 1 ? input.x / magnitude : input.x;
    const ny = magnitude > 1 ? input.y / magnitude : input.y;
    this.player.velocity.x = nx * this.player.stats.moveSpeed; this.player.velocity.y = ny * this.player.stats.moveSpeed;
    this.player.position = clampToArena({ x: this.player.position.x + this.player.velocity.x * deltaMs / 1000, y: this.player.position.y + this.player.velocity.y * deltaMs / 1000 });
    if (Math.abs(nx) > 0.05) this.player.facing = nx < 0 ? 'left' : 'right';
    if (magnitude > 0.02) this.emit({ type: 'PLAYER_MOVED', position: { ...this.player.position } });
  }

  takeDamage(rawDamage: number, source: BossAttackKind, nowMs: number): number {
    if (this.player.invulnerableMs > 0 || this.combat.phase !== 'playing') return 0;
    const damage = Math.max(1, Math.round(rawDamage * (1 - this.player.stats.mitigation)));
    this.player.hp = Math.max(0, this.player.hp - damage); this.player.invulnerableMs = 520;
    this.emit({ type: 'PLAYER_DAMAGED', damage, hp: this.player.hp, source });
    if (this.player.hp === 0) { this.combat.failRun(nowMs); this.emit({ type: 'PLAYER_DEFEATED' }); }
    return damage;
  }

  heal(amount: number): void { this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.max(0, amount)); }

  onBossDamage(damage: number, nowMs: number): void {
    this.grantXp(Math.max(1, Math.round(damage * 0.035)), nowMs);
  }

  onBreakpoint(mutationHint?: Mutation): void {
    const kind = mutationHint ? essenceKind(mutationHint) : 'run-xp';
    this.spawnLoot(kind, 'rare', 30);
    this.spawnLoot('run-xp', 'common', 45);
  }

  onBossDefeated(nowMs: number): void {
    this.bossCyclesCleared += 1; this.emit({ type: 'BOSS_CYCLE_CLEARED', cycle: this.bossCycle });
    this.grantXp(Math.round(100 * Math.pow(GAME_CONFIG.cycles.xpMultiplier, this.bossCycle - 1)), nowMs);
    this.spawnLoot('relic', this.bossCycle >= 3 ? 'epic' : 'rare', 1);
    for (let i = 0; i < Math.min(5, 2 + this.bossCycle); i += 1) this.spawnLoot(this.combat.isEventRun ? 'harvest-energy' : 'run-xp', i === 0 ? 'rare' : 'common', 20);
  }

  advanceCycle(nowMs: number): boolean {
    if (this.runComplete) return false;
    this.bossCycle += 1;
    const hp = this.combat.activeBoss.maxHp * Math.pow(GAME_CONFIG.cycles.hpMultiplier, this.bossCycle - 1);
    this.combat.startNextCycle(nowMs, hp); this.bossAttacks.active.length = 0;
    this.grantXp(0, nowMs);
    this.emit({ type: 'BOSS_CYCLE_STARTED', cycle: this.bossCycle }); return true;
  }

  grantXp(amount: number, nowMs: number): void {
    this.runXp += Math.max(0, Math.round(amount * this.player.stats.xpMultiplier));
    if (this.runXp < this.xpToNext || this.pausedForUpgrade || this.combat.phase !== 'playing') return;
    this.runXp -= this.xpToNext; this.runLevel += 1; this.xpToNext = Math.round(100 * Math.pow(1.28, this.runLevel - 1));
    const pool = eligibleUpgrades(this.selectedUpgrades, this.combat.mutations);
    this.pendingUpgradeIds = chooseDistinct(pool, this.random, 3).map((upgrade) => upgrade.id);
    if (this.pendingUpgradeIds.length) { this.combat.pauseForUpgrade(nowMs); this.emit({ type: 'RUN_LEVEL_UP', level: this.runLevel, choices: [...this.pendingUpgradeIds] }); }
  }

  chooseUpgrade(upgradeId: string, nowMs: number): boolean {
    if (!this.pendingUpgradeIds.includes(upgradeId)) return false;
    const definition = RUN_UPGRADES.find((upgrade) => upgrade.id === upgradeId); if (!definition) return false;
    const selected = this.selectedUpgrades.find((item) => item.id === upgradeId);
    if (selected) selected.stacks += 1; else this.selectedUpgrades.push({ id: upgradeId, stacks: 1 });
    this.pendingUpgradeIds = []; this.recalculateStats(); this.combat.resumeAfterUpgrade(nowMs);
    this.emit({ type: 'UPGRADE_ACQUIRED', upgradeId, stacks: selected?.stacks ?? 1 }); return true;
  }

  grantUpgrade(upgradeId: string, nowMs: number): boolean { this.pendingUpgradeIds = [upgradeId]; this.combat.pauseForUpgrade(nowMs); return this.chooseUpgrade(upgradeId, nowMs); }

  spawnLoot(kind: LootKind = 'run-xp', rarity: LootRarity = 'common', value = 10): void {
    const spawned = this.loot.spawn(kind, rarity, { x: 500, y: 0 }, value);
    if (spawned) this.emit({ type: 'LOOT_SPAWNED', kind, rarity });
  }

  forceBossAttack(kind: BossAttackKind): void { this.bossAttacks.force(kind, { ...this.player.position }, this.bossCycle); }
  spawnDummy(): boolean { if (this.dummyAllies.length >= GAME_CONFIG.arena.maxDummyAllies) return false; this.dummyAllies.push(createDummyAlly(this.dummyAllies.length + 1)); return true; }
  clearDummies(): void { this.dummyAllies.length = 0; }

  equip(itemId: string): boolean {
    if (!EQUIPMENT.some((item) => item.id === itemId) || this.inventory.equipmentIds.includes(itemId)) return false;
    this.inventory.equipmentIds.push(itemId); this.recalculateStats(); return true;
  }
  equipPrototypePet(): void { this.inventory.petId = PROTOTYPE_PET.petId; this.player.petId = PROTOTYPE_PET.petId; }

  snapshot(nowMs: number): ArenaRunSnapshot {
    return {
      schemaVersion: 1, eligible: this.combat.phase !== 'result' && this.combat.phase !== 'failed', savedAt: new Date().toISOString(), runMode: this.runMode,
      combat: this.combat.snapshot(nowMs), player: JSON.parse(JSON.stringify(this.player)) as CombatEntityState,
      runLevel: this.runLevel, runXp: this.runXp, xpToNext: this.xpToNext,
      selectedUpgrades: this.selectedUpgrades.map((item) => ({ ...item })), pendingUpgradeIds: [...this.pendingUpgradeIds],
      inventory: JSON.parse(JSON.stringify(this.inventory)) as RunInventoryState, bossCycle: this.bossCycle,
      bossCyclesCleared: this.bossCyclesCleared, pickups: this.pickupCount, lootSummary: { ...this.lootSummary },
    };
  }

  restore(snapshot: ArenaRunSnapshot, nowMs: number): void {
    this.runMode = snapshot.runMode; this.combat.restore(snapshot.combat, nowMs);
    Object.assign(this.player, JSON.parse(JSON.stringify(snapshot.player)) as CombatEntityState);
    this.runLevel = snapshot.runLevel; this.runXp = snapshot.runXp; this.xpToNext = snapshot.xpToNext;
    this.selectedUpgrades = snapshot.selectedUpgrades.map((item) => ({ ...item })); this.pendingUpgradeIds = [...snapshot.pendingUpgradeIds];
    Object.assign(this.inventory, JSON.parse(JSON.stringify(snapshot.inventory)) as RunInventoryState);
    this.bossCycle = snapshot.bossCycle; this.bossCyclesCleared = snapshot.bossCyclesCleared; this.pickupCount = snapshot.pickups; this.lootSummary = { ...snapshot.lootSummary };
    this.bossAttacks.reset(this.combat.seed); this.loot.reset(this.combat.seed); this.recalculateStats();
  }

  private resolveBossImpact(impact: BossAttackImpact, nowMs: number): void { if (impact.hit) this.takeDamage(impact.damage, impact.kind, nowMs); }
  private collect(pickup: LootPickup, nowMs: number): void {
    this.pickupCount += 1; this.lootSummary[pickup.kind] = (this.lootSummary[pickup.kind] ?? 0) + pickup.value;
    this.inventory.resources[pickup.kind] = (this.inventory.resources[pickup.kind] ?? 0) + pickup.value;
    if (pickup.kind === 'run-xp') this.grantXp(pickup.value, nowMs);
    if (pickup.kind === 'combat-orb') this.heal(pickup.value);
    if (pickup.kind === 'relic' && !this.inventory.equipmentIds.includes('fractured-core')) this.equip('fractured-core');
    this.emit({ type: 'LOOT_PICKED', pickup });
  }
  private recalculateStats(): void {
    const previousMax = this.player.maxHp; this.player.stats = applyUpgrades(this.baseStats, this.selectedUpgrades);
    for (const id of this.inventory.equipmentIds) {
      const item = EQUIPMENT.find((candidate) => candidate.id === id); if (!item) continue;
      for (const [key, value] of Object.entries(item.statEffects)) if (key in this.player.stats) (this.player.stats as unknown as Record<string, number>)[key] += value;
    }
    this.player.maxHp = this.player.stats.maxHp; this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.max(0, this.player.maxHp - previousMax));
    this.syncCombatModifiers();
  }
  private syncCombatModifiers(): void { this.combat.setRunModifiers(this.player.stats.damageMultiplier, this.player.stats.attackRateMultiplier); }
}

function chooseDistinct(pool: readonly RunUpgradeDefinition[], random: RunRandom, count: number): RunUpgradeDefinition[] {
  const copy = [...pool];
  for (let index = copy.length - 1; index > 0; index -= 1) { const swap = Math.floor(random.next() * (index + 1)); [copy[index], copy[swap]] = [copy[swap], copy[index]]; }
  return copy.slice(0, count);
}

function essenceKind(mutation: Mutation): LootKind {
  if (mutation === 'crystal') return 'crystal-essence'; if (mutation === 'void') return 'void-essence';
  if (mutation === 'wings') return 'wing-essence'; return 'pumpkin-essence';
}
