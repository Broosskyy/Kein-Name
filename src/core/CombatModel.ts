import { GAME_CONFIG } from '../config';
import { ACTIVE_BOSS, MUTATION_BY_ID, bossForEvent, evolutionFor, mutationPoolForEvent } from '../content';
import type { EventDefinition } from '../event/EventDefinition';
import type { AttackKind, AttackResult, BreakpointId, Mutation, RunContract, RunPhase } from '../types';
import type { GameDomainEvent } from './DomainEvents';
import { createRunSeed, RunRandom } from './RunRandom';

export interface CombatModelOptions {
  emit?: (event: GameDomainEvent) => void;
  idGenerator?: () => string;
  wallClock?: () => string;
  seedGenerator?: () => number;
  eventDefinition?: EventDefinition;
  eventEnabled?: boolean;
}

type InactiveReason = 'background' | 'choice';
let runSequence = 0;

export class CombatModel {
  runId = '';
  seed = 0;
  startedAtMs = 0;
  endedAtMs = 0;
  startedAtIso = '';
  bossHp: number = ACTIVE_BOSS.maxHp;
  phase: RunPhase = 'playing';
  totalDamage = 0;
  buildDamage = 0;
  powerHits = 0;
  mutations = new Set<Mutation>();
  triggered = new Set<BreakpointId>();
  pendingChoices: readonly Mutation[] = [];
  breakpointEvents: RunContract['breakpointEvents'] = [];
  lastPowerAtActiveMs = Number.NEGATIVE_INFINITY;
  private random = new RunRandom(1);
  private inactiveReasons = new Set<InactiveReason>();
  private inactiveSinceMs = 0;
  private inactiveDurationMs = 0;
  private completedResult?: RunContract;
  private bossDefeatEmitted = false;
  private readonly emitEvent: (event: GameDomainEvent) => void;
  private readonly idGenerator: () => string;
  private readonly wallClock: () => string;
  private readonly seedGenerator: () => number;
  private readonly eventDefinition?: EventDefinition;
  private eventEnabled: boolean;

  constructor(nowMs = 0, options: CombatModelOptions = {}) {
    this.emitEvent = options.emit ?? (() => undefined);
    this.idGenerator = options.idGenerator ?? (() => `run-${Date.now()}-${++runSequence}`);
    this.wallClock = options.wallClock ?? (() => new Date().toISOString());
    this.seedGenerator = options.seedGenerator ?? createRunSeed;
    this.eventDefinition = options.eventDefinition;
    this.eventEnabled = options.eventEnabled ?? options.eventDefinition?.enabled ?? false;
    this.reset(nowMs);
  }

  reset(nowMs = 0): void {
    this.runId = this.idGenerator();
    this.seed = this.seedGenerator() >>> 0 || 1;
    this.random = new RunRandom(this.seed);
    this.startedAtMs = nowMs;
    this.endedAtMs = 0;
    this.startedAtIso = this.wallClock();
    this.bossHp = this.maxHp;
    this.phase = 'playing';
    this.totalDamage = 0;
    this.buildDamage = 0;
    this.powerHits = 0;
    this.mutations.clear();
    this.triggered.clear();
    this.pendingChoices = [];
    this.breakpointEvents = [];
    this.lastPowerAtActiveMs = Number.NEGATIVE_INFINITY;
    this.inactiveReasons.clear();
    this.inactiveSinceMs = 0;
    this.inactiveDurationMs = 0;
    this.completedResult = undefined;
    this.bossDefeatEmitted = false;
    this.emitEvent({ type: 'RUN_STARTED', runId: this.runId, bossId: this.activeBoss.id });
  }

  setEventEnabled(enabled: boolean, nowMs = 0): void {
    this.eventEnabled = enabled;
    this.reset(nowMs);
  }

  get isEventRun(): boolean { return this.eventEnabled && Boolean(this.eventDefinition); }
  get activeBoss() { return bossForEvent(this.isEventRun); }
  get maxHp(): number { return this.activeBoss.maxHp; }
  get mutationPool(): readonly Mutation[] { return mutationPoolForEvent(this.isEventRun); }

  pause(nowMs: number): void {
    if (this.phase !== 'result') this.addInactive('background', nowMs);
  }

  resume(nowMs: number): void {
    this.removeInactive('background', nowMs);
  }

  get isPaused(): boolean {
    return this.inactiveReasons.has('background');
  }

  elapsedMs(nowMs: number): number {
    const activeInactive = this.inactiveReasons.size > 0 ? Math.max(0, nowMs - this.inactiveSinceMs) : 0;
    return Math.max(0, nowMs - this.startedAtMs - this.inactiveDurationMs - activeInactive);
  }

  get attackIntervalMs(): number {
    const multiplier = this.mutations.has('wings') ? GAME_CONFIG.combat.wingAttackIntervalMultiplier : 1;
    return Math.round(GAME_CONFIG.combat.attackIntervalMs * multiplier);
  }

  get voidEchoDelayMs(): number {
    return this.mutations.has('wings') ? GAME_CONFIG.combat.nightwingEchoDelayMs : GAME_CONFIG.combat.voidEchoDelayMs;
  }

  canPowerHit(nowMs: number): boolean {
    return !this.isPaused && this.phase === 'playing' && this.elapsedMs(nowMs) - this.lastPowerAtActiveMs >= GAME_CONFIG.combat.powerCooldownMs;
  }

  powerCooldownRemaining(nowMs: number): number {
    return Math.max(0, GAME_CONFIG.combat.powerCooldownMs - (this.elapsedMs(nowMs) - this.lastPowerAtActiveMs));
  }

  attack(kind: AttackKind, nowMs: number, sourceKind: 'normal' | 'power' = 'normal'): AttackResult {
    const hpBefore = this.bossHp;
    if (this.isPaused || this.phase !== 'playing' || (kind === 'power' && !this.canPowerHit(nowMs))) {
      return { accepted: false, kind, damage: 0, hpBefore, hpAfter: hpBefore };
    }

    let damage = this.baseDamage(kind, sourceKind);
    for (const mutation of this.mutations) damage *= MUTATION_BY_ID[mutation].damageModifier;
    damage = Math.round(damage);

    if (kind === 'power') {
      this.lastPowerAtActiveMs = this.elapsedMs(nowMs);
      this.powerHits += 1;
    }

    this.bossHp = Math.max(0, this.bossHp - damage);
    const appliedDamage = hpBefore - this.bossHp;
    this.totalDamage += appliedDamage;
    if (this.mutations.size > 0) this.buildDamage += appliedDamage;
    this.emitEvent({ type: 'ATTACK_LANDED', runId: this.runId, atMs: this.elapsedMs(nowMs), attackKind: kind, damage: appliedDamage, bossHp: this.bossHp });

    const breakpoint = this.activeBoss.breakpoints.find((candidate) => this.bossHp / this.maxHp <= candidate.threshold && !this.triggered.has(candidate.id));
    if (breakpoint) {
      this.registerBreakpoint(breakpoint.id, breakpoint.threshold, nowMs);
      return { accepted: true, kind, damage: appliedDamage, hpBefore, hpAfter: this.bossHp, triggeredBreakpointId: breakpoint.id };
    }
    if (this.bossHp === 0) {
      this.registerBossDefeat(nowMs);
      return { accepted: true, kind, damage: appliedDamage, hpBefore, hpAfter: this.bossHp, bossDefeated: true };
    }
    return { accepted: true, kind, damage: appliedDamage, hpBefore, hpAfter: this.bossHp };
  }

  chooseMutation(mutation: Mutation, nowMs: number): boolean {
    if (this.phase !== 'choice' || !this.pendingChoices.includes(mutation) || this.mutations.has(mutation)) return false;
    this.mutations.add(mutation);
    const record = this.breakpointEvents.at(-1);
    if (record) record.selectedMutationId = mutation;
    this.pendingChoices = [];
    this.removeInactive('choice', nowMs);
    this.phase = 'playing';
    this.emitEvent({ type: 'MUTATION_ACQUIRED', runId: this.runId, atMs: this.elapsedMs(nowMs), mutationId: mutation });
    if (this.bossHp === 0 && this.triggered.size === this.activeBoss.breakpoints.length) this.registerBossDefeat(nowMs);
    return true;
  }

  debugForceBreakpoint(id: BreakpointId, nowMs: number): AttackResult {
    if (this.phase !== 'playing' || this.triggered.has(id)) return { accepted: false, kind: 'normal', damage: 0, hpBefore: this.bossHp, hpAfter: this.bossHp };
    const definition = this.activeBoss.breakpoints.find((candidate) => candidate.id === id);
    if (!definition) return { accepted: false, kind: 'normal', damage: 0, hpBefore: this.bossHp, hpAfter: this.bossHp };
    const hpBefore = this.bossHp;
    this.bossHp = Math.min(this.bossHp, Math.floor(this.maxHp * definition.threshold));
    const damage = hpBefore - this.bossHp;
    this.totalDamage += damage;
    if (this.mutations.size > 0) this.buildDamage += damage;
    this.registerBreakpoint(id, definition.threshold, nowMs);
    return { accepted: true, kind: 'normal', damage, hpBefore, hpAfter: this.bossHp, triggeredBreakpointId: id };
  }

  debugForceKill(nowMs: number): AttackResult {
    if (this.phase !== 'playing') return { accepted: false, kind: 'power', damage: 0, hpBefore: this.bossHp, hpAfter: this.bossHp };
    const hpBefore = this.bossHp;
    this.bossHp = 0;
    this.totalDamage += hpBefore;
    if (this.mutations.size > 0) this.buildDamage += hpBefore;
    this.registerBossDefeat(nowMs);
    return { accepted: true, kind: 'power', damage: hpBefore, hpBefore, hpAfter: 0, bossDefeated: true };
  }

  debugGrantBuild(mutations: readonly [Mutation, Mutation], nowMs: number): void {
    this.pendingChoices = [];
    this.removeInactive('choice', nowMs);
    this.mutations.clear();
    mutations.forEach((mutation) => this.mutations.add(mutation));
    this.phase = 'playing';
  }

  debugOfferMutation(mutation: Mutation): boolean {
    if (this.phase !== 'choice' || this.mutations.has(mutation)) return false;
    const alternative = this.mutationPool.find((candidate) => candidate !== mutation && !this.mutations.has(candidate));
    if (!alternative) return false;
    this.pendingChoices = [mutation, alternative];
    const record = this.breakpointEvents.at(-1);
    if (record) record.choices = [...this.pendingChoices];
    return true;
  }

  finish(nowMs: number): RunContract {
    if (this.completedResult) return this.completedResult;
    if (!this.bossDefeatEmitted || this.mutations.size !== 2) throw new Error('Cannot finish before defeating the boss with a two-mutation build.');
    this.phase = 'result';
    this.endedAtMs = nowMs;
    const evolution = evolutionFor(this.mutations);
    this.completedResult = {
      schemaVersion: GAME_CONFIG.schemaVersion,
      clientVersion: GAME_CONFIG.clientVersion,
      runId: this.runId,
      bossId: this.activeBoss.id,
      startedAt: this.startedAtIso,
      endedAt: this.wallClock(),
      durationMs: this.elapsedMs(nowMs),
      totalDamage: this.totalDamage,
      buildDamage: this.buildDamage,
      powerHits: this.powerHits,
      seed: this.seed,
      mutationIds: this.mutationPool.filter((mutation) => this.mutations.has(mutation)),
      evolutionId: evolution.id,
      evolutionName: evolution.name,
      buildId: evolution.buildId,
      breakpointEvents: this.breakpointEvents.map((event) => ({ ...event, choices: [...event.choices] })),
      bossDefeated: true,
      qualityProfile: GAME_CONFIG.quality.active,
      ...(this.isEventRun && this.eventDefinition ? {
        eventId: this.eventDefinition.id,
        eventConfigVersion: this.eventDefinition.eventConfigVersion,
        eventThemeId: this.eventDefinition.themeId,
      } : {}),
    };
    this.emitEvent({ type: 'RUN_COMPLETED', runId: this.runId, result: this.completedResult });
    return this.completedResult;
  }

  private baseDamage(kind: AttackKind, sourceKind: 'normal' | 'power'): number {
    if (kind === 'power') return GAME_CONFIG.combat.powerDamage;
    if (kind === 'wingVolley') return GAME_CONFIG.combat.normalDamage * GAME_CONFIG.combat.wingPowerVolleyMultiplier;
    if (kind === 'pumpkinBurst') {
      return sourceKind === 'power'
        ? GAME_CONFIG.combat.powerDamage * GAME_CONFIG.combat.pumpkinPowerBurstMultiplier
        : GAME_CONFIG.combat.normalDamage * GAME_CONFIG.combat.pumpkinBurstMultiplier;
    }
    if (kind === 'voidEcho') {
      if (sourceKind === 'power') return GAME_CONFIG.combat.powerDamage * GAME_CONFIG.combat.voidPowerEchoMultiplier;
      const multiplier = this.mutations.has('wings') ? GAME_CONFIG.combat.nightwingEchoMultiplier : GAME_CONFIG.combat.voidEchoMultiplier;
      return GAME_CONFIG.combat.normalDamage * multiplier;
    }
    return GAME_CONFIG.combat.normalDamage;
  }

  private registerBreakpoint(id: BreakpointId, threshold: number, nowMs: number): void {
    if (this.triggered.has(id)) return;
    this.triggered.add(id);
    const available = this.mutationPool.filter((mutation) => !this.mutations.has(mutation));
    this.pendingChoices = this.random.chooseTwo(available);
    this.phase = 'choice';
    this.addInactive('choice', nowMs);
    const record = { breakpointId: id, threshold, bossHp: this.bossHp, elapsedMs: this.elapsedMs(nowMs), choices: [...this.pendingChoices] };
    this.breakpointEvents.push(record);
    this.emitEvent({ type: 'BREAKPOINT_REACHED', runId: this.runId, atMs: record.elapsedMs, breakpointId: id, threshold, bossHp: this.bossHp, choices: [...this.pendingChoices] });
  }

  private registerBossDefeat(nowMs: number): void {
    if (this.bossDefeatEmitted) return;
    this.bossDefeatEmitted = true;
    this.phase = 'finalizing';
    this.emitEvent({ type: 'BOSS_DEFEATED', runId: this.runId, atMs: this.elapsedMs(nowMs), bossId: this.activeBoss.id });
  }

  private addInactive(reason: InactiveReason, nowMs: number): void {
    if (this.inactiveReasons.has(reason)) return;
    if (this.inactiveReasons.size === 0) this.inactiveSinceMs = nowMs;
    this.inactiveReasons.add(reason);
  }

  private removeInactive(reason: InactiveReason, nowMs: number): void {
    if (!this.inactiveReasons.delete(reason)) return;
    if (this.inactiveReasons.size === 0) {
      this.inactiveDurationMs += Math.max(0, nowMs - this.inactiveSinceMs);
      this.inactiveSinceMs = 0;
    }
  }
}
