import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config';
import { ACTIVE_BOSS, evolutionFor } from '../content';
import type { Mutation } from '../types';
import type { GameDomainEvent } from './DomainEvents';
import { CombatModel } from './CombatModel';

function modelWithSeed(seed: number, events?: GameDomainEvent[]): CombatModel {
  return new CombatModel(0, { seedGenerator: () => seed, emit: (event) => events?.push(event), wallClock: () => '2026-09-23T19:00:00.000Z' });
}

function damageUntilStopped(model: CombatModel, now = 1000): number {
  while (model.phase === 'playing') {
    model.attack('normal', now++);
  }
  return now;
}

function choose(model: CombatModel, mutation: Mutation, now: number): number {
  if (!model.pendingChoices.includes(mutation)) model.debugOfferMutation(mutation);
  expect(model.chooseMutation(mutation, now)).toBe(true);
  return now + 1;
}

function completeRun(model: CombatModel, build?: readonly [Mutation, Mutation], now = 1000): { now: number; selected: Mutation[] } {
  const selected: Mutation[] = [];
  for (let index = 0; index < 2; index += 1) {
    now = damageUntilStopped(model, now);
    const mutation = build?.[index] ?? model.pendingChoices[0];
    selected.push(mutation);
    now = choose(model, mutation, now + 400);
  }
  now = damageUntilStopped(model, now);
  expect(model.phase).toBe('finalizing');
  return { now, selected };
}

function choiceSequence(seed: number): Mutation[][] {
  const model = modelWithSeed(seed);
  const sequence: Mutation[][] = [];
  let now = damageUntilStopped(model);
  sequence.push([...model.pendingChoices]);
  now = choose(model, model.pendingChoices[0], now);
  damageUntilStopped(model, now);
  sequence.push([...model.pendingChoices]);
  return sequence;
}

function containsNonPlainValue(value: unknown): boolean {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return false;
  if (Array.isArray(value)) return value.some(containsNonPlainValue);
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return true;
  return Object.values(value as Record<string, unknown>).some(containsNonPlainValue);
}

describe('CombatModel M01.5 foundations', () => {
  it('initializes and lowers boss HP', () => {
    const model = modelWithSeed(1);
    expect(model.phase).toBe('playing');
    expect(model.attack('normal', 1000).accepted).toBe(true);
    expect(model.bossHp).toBeLessThan(model.maxHp);
  });

  it('triggers both choice breakpoints and boss defeat exactly once', () => {
    const model = modelWithSeed(2);
    const completed = completeRun(model);
    expect(model.triggered.size).toBe(2);
    expect(model.breakpointEvents).toHaveLength(2);
    expect(model.mutations.size).toBe(2);
    model.debugForceKill(completed.now + 1);
    expect(model.phase).toBe('finalizing');
  });

  it('enforces power hit cooldown', () => {
    const model = modelWithSeed(3);
    expect(model.attack('power', 1000).accepted).toBe(true);
    expect(model.attack('power', 1001).accepted).toBe(false);
    expect(model.attack('power', 1000 + GAME_CONFIG.combat.powerCooldownMs).accepted).toBe(true);
  });

  it('retry resets the complete run state and build', () => {
    let seed = 10;
    const model = new CombatModel(0, { seedGenerator: () => seed++ });
    const runId = model.runId;
    const oldSeed = model.seed;
    model.debugGrantBuild(['crystal', 'void'], 50);
    model.reset(5000);
    expect(model.bossHp).toBe(model.maxHp);
    expect(model.phase).toBe('playing');
    expect(model.mutations.size).toBe(0);
    expect(model.triggered.size).toBe(0);
    expect(model.pendingChoices).toEqual([]);
    expect(model.totalDamage).toBe(0);
    expect(model.buildDamage).toBe(0);
    expect(model.runId).not.toBe(runId);
    expect(model.seed).not.toBe(oldSeed);
  });

  it('development shortcuts can target breakpoints and builds', () => {
    const model = modelWithSeed(4);
    expect(model.debugForceBreakpoint('break-1', 500).triggeredBreakpointId).toBe('break-1');
    expect(model.phase).toBe('choice');
    model.debugOfferMutation('crystal');
    model.chooseMutation('crystal', 800);
    model.debugGrantBuild(['crystal', 'wings'], 900);
    expect(evolutionFor(model.mutations).id).toBe('skyshard');
  });

  it('uses boss content configuration and mutation combat configuration', () => {
    const base = modelWithSeed(5).attack('normal', 1000).damage;
    const model = modelWithSeed(5);
    model.debugGrantBuild(['crystal', 'void'], 0);
    expect(model.maxHp).toBe(ACTIVE_BOSS.maxHp);
    expect(model.attack('normal', 1000).damage).toBeGreaterThan(base);
  });

  it('freezes combat, cooldown and elapsed time in background, then resumes', () => {
    const model = modelWithSeed(6);
    model.attack('power', 200);
    const hp = model.bossHp;
    model.pause(500);
    expect(model.attack('normal', 5000).accepted).toBe(false);
    expect(model.bossHp).toBe(hp);
    expect(model.elapsedMs(5000)).toBe(500);
    const cooldown = model.powerCooldownRemaining(5000);
    model.resume(5000);
    expect(model.elapsedMs(5500)).toBe(1000);
    expect(model.powerCooldownRemaining(5000)).toBe(cooldown);
    expect(model.attack('normal', 5500).accepted).toBe(true);
  });

  it('produces a plain JSON-serializable run contract', () => {
    const model = modelWithSeed(7);
    const { now } = completeRun(model, ['crystal', 'void']);
    const result = model.finish(now + 1000);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(result.schemaVersion).toBe(GAME_CONFIG.schemaVersion);
    expect(result.bossId).toBe(ACTIVE_BOSS.id);
    expect(result.bossDefeated).toBe(true);
    expect(result.totalDamage).toBe(ACTIVE_BOSS.maxHp);
    expect(containsNonPlainValue(result)).toBe(false);
  });

  it('generates unique run IDs for separate runs and models', () => {
    const model = modelWithSeed(8);
    const ids = new Set([model.runId]);
    model.reset(1);
    ids.add(model.runId);
    ids.add(modelWithSeed(8).runId);
    expect(ids.size).toBe(3);
  });

  it('emits domain events once', () => {
    const events: GameDomainEvent[] = [];
    const model = modelWithSeed(9, events);
    const { now } = completeRun(model, ['void', 'wings']);
    model.finish(now);
    model.finish(now + 100);
    expect(events.filter((event) => event.type === 'RUN_STARTED')).toHaveLength(1);
    expect(events.filter((event) => event.type === 'BREAKPOINT_REACHED')).toHaveLength(2);
    expect(events.filter((event) => event.type === 'MUTATION_ACQUIRED')).toHaveLength(2);
    expect(events.filter((event) => event.type === 'BOSS_DEFEATED')).toHaveLength(1);
    expect(events.filter((event) => event.type === 'RUN_COMPLETED')).toHaveLength(1);
  });
});

describe('M02 mutation builds', () => {
  it('creates a non-zero seed and stores it in the result', () => {
    const model = modelWithSeed(123456);
    const { now } = completeRun(model);
    expect(model.seed).toBe(123456);
    expect(model.finish(now).seed).toBe(123456);
  });

  it('produces the same choice sequence for the same seed', () => {
    expect(choiceSequence(77)).toEqual(choiceSequence(77));
  });

  it('allows different seeds to produce different first choices', () => {
    expect(choiceSequence(1)[0]).not.toEqual(choiceSequence(2)[0]);
  });

  it('never offers an already selected mutation again', () => {
    const model = modelWithSeed(12);
    let now = damageUntilStopped(model);
    const selected = model.pendingChoices[0];
    now = choose(model, selected, now);
    damageUntilStopped(model, now);
    expect(model.pendingChoices).not.toContain(selected);
    expect(model.pendingChoices).toHaveLength(2);
  });

  it('completes with exactly two mutations', () => {
    const model = modelWithSeed(13);
    const { now } = completeRun(model);
    const result = model.finish(now);
    expect(result.mutationIds).toHaveLength(2);
    expect(model.mutations.size).toBe(2);
  });

  it.each([
    [['crystal', 'void'], 'voidshard', 'VOIDSHARD'],
    [['crystal', 'wings'], 'skyshard', 'SKYSHARD'],
    [['void', 'wings'], 'nightwing', 'NIGHTWING'],
  ] as const)('%s resolves to %s', (build, id, name) => {
    const model = modelWithSeed(14);
    const { now } = completeRun(model, build);
    const result = model.finish(now);
    expect(result.evolutionId).toBe(id);
    expect(result.evolutionName).toBe(name);
    expect(result.buildId).toBe([...build].sort().join('+') === 'void+wings' ? 'void+wings' : build.join('+'));
  });

  it('choice pauses combat and active run time until selection', () => {
    const model = modelWithSeed(15);
    const now = damageUntilStopped(model, 1000);
    const elapsed = model.elapsedMs(now);
    const hp = model.bossHp;
    expect(model.phase).toBe('choice');
    expect(model.attack('normal', now + 5000).accepted).toBe(false);
    expect(model.bossHp).toBe(hp);
    expect(model.elapsedMs(now + 5000)).toBe(elapsed);
    expect(model.chooseMutation(model.pendingChoices[0], now + 5000)).toBe(true);
    expect(model.phase).toBe('playing');
    expect(model.elapsedMs(now + 5100)).toBe(elapsed + 100);
    expect(model.attack('normal', now + 5100).accepted).toBe(true);
  });

  it('keeps lifecycle pause safe while a mutation choice is already pausing combat', () => {
    const model = modelWithSeed(151);
    const now = damageUntilStopped(model, 1000);
    const elapsed = model.elapsedMs(now);
    model.pause(now + 100);
    model.resume(now + 5100);
    expect(model.phase).toBe('choice');
    expect(model.elapsedMs(now + 8000)).toBe(elapsed);
    expect(model.chooseMutation(model.pendingChoices[0], now + 8000)).toBe(true);
    expect(model.elapsedMs(now + 8100)).toBe(elapsed + 100);
  });

  it('power hit incorporates mutation behavior', () => {
    const base = modelWithSeed(16).attack('power', 1000).damage;
    const crystal = modelWithSeed(16);
    crystal.debugGrantBuild(['crystal', 'wings'], 0);
    const crystalPower = crystal.attack('power', 1000).damage;
    expect(crystalPower).toBeGreaterThan(base);
    expect(crystal.attack('wingVolley', 1001, 'power').damage).toBeGreaterThan(0);
    const voidBuild = modelWithSeed(16);
    voidBuild.debugGrantBuild(['void', 'wings'], 0);
    expect(voidBuild.attack('voidEcho', 1000, 'power').damage).toBeGreaterThan(voidBuild.attack('voidEcho', 1001, 'normal').damage);
  });
});
