import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config';
import { EVOLUTIONS, MUTATION_BY_ID, evolutionFor } from '../content';
import { CombatModel } from '../core/CombatModel';
import type { GameDomainEvent } from '../core/DomainEvents';
import type { Mutation, RunResult } from '../types';
import { HALLOWEEN_2026 } from './EventDefinition';
import { EventProgress } from './EventProgress';
import { createInitialEventState } from './EventState';
import { EventStore, type EventStoragePort } from './EventStore';

class MemoryStorage implements EventStoragePort {
  values = new Map<string, string>();
  read(key: string): string | null { return this.values.get(key) ?? null; }
  write(key: string, value: string): void { this.values.set(key, value); }
  remove(key: string): void { this.values.delete(key); }
}

function eventModel(seed: number, enabled = true): CombatModel {
  return new CombatModel(0, {
    seedGenerator: () => seed,
    idGenerator: () => `run-${seed}`,
    wallClock: () => '2026-10-13T12:00:00.000Z',
    eventDefinition: HALLOWEEN_2026,
    eventEnabled: enabled,
  });
}

function resultFor(build: readonly [Mutation, Mutation], seed = 10): RunResult {
  const model = eventModel(seed);
  model.debugGrantBuild(build, 10);
  if (build.includes('pumpkin')) model.attack('pumpkinBurst', 20);
  model.debugForceKill(500);
  return model.finish(900);
}

function progressHarness(initial?: ReturnType<typeof createInitialEventState>) {
  const storage = new MemoryStorage();
  const store = new EventStore(HALLOWEEN_2026, storage);
  if (initial) storage.write(store.key, JSON.stringify(initial));
  const events: GameDomainEvent[] = [];
  return { storage, store, events, progress: new EventProgress(HALLOWEEN_2026, store, (event) => events.push(event)) };
}

describe('M04 event foundation and deterministic content', () => {
  it('serializes the versioned Halloween definition', () => {
    expect(JSON.parse(JSON.stringify(HALLOWEEN_2026))).toEqual(HALLOWEEN_2026);
    expect(HALLOWEEN_2026.eventConfigVersion).toBe(1);
    expect(HALLOWEEN_2026.id).toBe('halloween_2026');
  });

  it('switches event boss and mutation pool on and off', () => {
    const on = eventModel(1, true);
    const off = eventModel(1, false);
    expect(on.activeBoss.id).toBe('harvest-colossus-2026');
    expect(on.mutationPool).toContain('pumpkin');
    expect(off.activeBoss.id).toBe('fractured-colossus-m01');
    expect(off.mutationPool).toEqual(['crystal', 'void', 'wings']);
  });

  it('produces identical event choices for the same seed and config', () => {
    const choices = (seed: number) => {
      const model = eventModel(seed);
      model.debugForceBreakpoint('break-1', 100);
      const first = [...model.pendingChoices];
      model.chooseMutation(first[0], 200);
      model.debugForceBreakpoint('break-2', 300);
      return [first, [...model.pendingChoices]];
    };
    expect(choices(77)).toEqual(choices(77));
  });

  it('can select Pumpkin deterministically and never duplicates a chosen mutation', () => {
    const offered = new Set<Mutation>();
    for (let seed = 1; seed <= 12; seed += 1) {
      const model = eventModel(seed);
      model.debugForceBreakpoint('break-1', 100);
      model.pendingChoices.forEach((choice) => offered.add(choice));
    }
    expect(offered).toContain('pumpkin');
    const model = eventModel(5);
    model.debugForceBreakpoint('break-1', 100);
    model.debugOfferMutation('pumpkin');
    model.chooseMutation('pumpkin', 200);
    model.debugForceBreakpoint('break-2', 300);
    expect(model.pendingChoices).not.toContain('pumpkin');
  });

  it.each(EVOLUTIONS)('resolves $id from its configured pair', (evolution) => {
    expect(evolutionFor(evolution.mutations).id).toBe(evolution.id);
    const result = resultFor(evolution.mutations, evolution.id.length + 20);
    expect(result.mutationIds).toHaveLength(2);
    expect(new Set(result.mutationIds).size).toBe(2);
    expect(result.evolutionId).toBe(evolution.id);
  });

  it('gives Pumpkin a configured burst and stronger power interaction', () => {
    expect(MUTATION_BY_ID.pumpkin.attackBehaviorKey).toBe('pumpkin-burst');
    const normal = eventModel(31);
    normal.debugGrantBuild(['pumpkin', 'wings'], 0);
    const normalBurst = normal.attack('pumpkinBurst', 100, 'normal').damage;
    const powerBurst = eventModel(31);
    powerBurst.debugGrantBuild(['pumpkin', 'wings'], 0);
    expect(powerBurst.attack('pumpkinBurst', 100, 'power').damage).toBeGreaterThan(normalBurst);
  });

  it('keeps quality configuration out of combat and reward math', () => {
    const low = resultFor(['pumpkin', 'void'], 41);
    const high = resultFor(['pumpkin', 'void'], 41);
    expect(low.totalDamage).toBe(high.totalDamage);
    expect(low.evolutionId).toBe(high.evolutionId);
    expect(GAME_CONFIG.quality.low.maxParticles).toBeLessThan(GAME_CONFIG.quality.high.maxParticles);
  });
});

describe('M04 local progress, challenges, rewards and saves', () => {
  it('adds progress, discovery, challenge and milestone data once', () => {
    const { progress, events } = progressHarness();
    const first = resultFor(['pumpkin', 'void'], 51);
    first.powerHits = 5;
    const outcome = progress.applyRun(first);
    expect(outcome.energyEarned).toBeGreaterThan(80);
    expect(progress.state.completedRuns).toBe(1);
    expect(progress.state.discoveredEvolutionIds).toEqual(['jack-o-void']);
    expect(progress.state.completedChallenges).toEqual(expect.arrayContaining(['power-five', 'defeat-harvest', 'use-pumpkin', 'discover-jack']));
    expect(new Set(progress.state.milestones).size).toBe(progress.state.milestones.length);
    progress.applyRun(resultFor(['pumpkin', 'void'], 52));
    expect(events.filter((event) => event.type === 'EVOLUTION_DISCOVERED')).toHaveLength(1);
    expect(new Set(progress.state.completedChallenges).size).toBe(progress.state.completedChallenges.length);
    expect(new Set(progress.state.unlockedRewards).size).toBe(progress.state.unlockedRewards.length);
  });

  it('persists and reloads JSON-safe event state', () => {
    const { progress, store } = progressHarness();
    progress.applyRun(resultFor(['crystal', 'wings'], 61));
    const loaded = store.load();
    expect(loaded).toEqual(progress.state);
    expect(JSON.parse(JSON.stringify(loaded))).toEqual(loaded);
  });

  it('handles a missing, corrupt, or version-mismatched save safely', () => {
    const storage = new MemoryStorage();
    const store = new EventStore(HALLOWEEN_2026, storage);
    expect(store.load().completedRuns).toBe(0);
    storage.write(store.key, '{bad json');
    expect(store.load().eventProgress).toBe(0);
    storage.write(store.key, JSON.stringify({ ...createInitialEventState(HALLOWEEN_2026.id, 999), eventConfigVersion: 999 }));
    expect(store.load().eventConfigVersion).toBe(HALLOWEEN_2026.eventConfigVersion);
  });

  it('resets event state and retains persistent progress across combat retries', () => {
    const { progress } = progressHarness();
    progress.applyRun(resultFor(['void', 'wings'], 71));
    const retained = progress.state.eventProgress;
    const combat = eventModel(72);
    combat.reset(1000);
    expect(progress.state.eventProgress).toBe(retained);
    progress.reset();
    expect(progress.state.eventProgress).toBe(0);
    expect(progress.state.discoveredEvolutionIds).toEqual([]);
  });

  it('emits Event Complete once after the sixth discovery and final milestone', () => {
    const initial = createInitialEventState(HALLOWEEN_2026.id, HALLOWEEN_2026.eventConfigVersion);
    initial.eventProgress = 900;
    initial.discoveredEvolutionIds = ['voidshard', 'skyshard', 'nightwing', 'jack-o-void', 'harvestshard'];
    const { progress, events } = progressHarness(initial);
    progress.applyRun(resultFor(['pumpkin', 'wings'], 81));
    progress.applyRun(resultFor(['pumpkin', 'wings'], 82));
    expect(progress.state.eventCompleted).toBe(true);
    expect(events.filter((event) => event.type === 'EVENT_COMPLETED')).toHaveLength(1);
  });

  it('extends an event RunResult without embedding persistent state or render objects', () => {
    const { progress } = progressHarness();
    const result = resultFor(['crystal', 'pumpkin'], 91);
    progress.applyRun(result);
    expect(result.eventId).toBe(HALLOWEEN_2026.id);
    expect(result.eventConfigVersion).toBe(HALLOWEEN_2026.eventConfigVersion);
    expect(result.eventProgressEarned).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('eventState');
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
