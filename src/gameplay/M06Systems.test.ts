import { describe, expect, it } from 'vitest';
import { CombatModel } from '../core/CombatModel';
import { GamePersistence, RUN_KEY, SAVE_KEY, type StoragePort } from '../progress/GamePersistence';
import { createPlayerProgress } from '../progress/PlayerProgress';
import { FullscreenController } from '../platform/FullscreenController';
import { ArenaRunModel } from './ArenaRunModel';
import { ARENA_BOUNDS } from './ArenaTypes';
import { BossAttackSystem, BOSS_ATTACKS } from './BossAttackSystem';
import { RUN_MODES } from './RunModes';
import { isJsonSafeContract, type ContributionContract } from '../online/Contracts';

function create(seed = 101): { combat: CombatModel; arena: ArenaRunModel } {
  const combat = new CombatModel(0, { seedGenerator: () => seed, idGenerator: () => `run-${seed}`, wallClock: () => '2026-09-24T00:00:00.000Z' });
  return { combat, arena: new ArenaRunModel(combat, 'guest-test') };
}

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe('M06 arena gameplay foundation', () => {
  it('clamps movement to arena bounds', () => {
    const { arena } = create();
    for (let i = 0; i < 200; i += 1) arena.movePlayer(50, { x: 1, y: 1 });
    expect(arena.player.position.x).toBe(ARENA_BOUNDS.maxX); expect(arena.player.position.y).toBe(ARENA_BOUNDS.maxY);
  });

  it('boss telegraph progresses to one impact', () => {
    const system = new BossAttackSystem(3); const attack = system.force('ground-slam', { x: 500, y: 300 });
    expect(attack.phase).toBe('telegraph');
    const impacts = system.update(BOSS_ATTACKS['ground-slam'].telegraphMs, { x: 500, y: 300 }, 1);
    expect(impacts).toHaveLength(1); expect(impacts[0].hit).toBe(true);
    expect(system.update(1, { x: 500, y: 300 }, 1)).toHaveLength(0);
  });

  it('pauses telegraph lifecycle outside playing state', () => {
    const system = new BossAttackSystem(4); const attack = system.force('core-beam', { x: 400, y: 300 });
    system.update(5000, { x: 400, y: 300 }, 1, false); expect(attack.phase).toBe('telegraph'); expect(attack.elapsedMs).toBe(0);
  });

  it('applies player damage once during invulnerability', () => {
    const { arena } = create(); expect(arena.takeDamage(20, 'ground-slam', 10)).toBe(20);
    expect(arena.takeDamage(20, 'ground-slam', 20)).toBe(0); expect(arena.player.hp).toBe(80);
  });

  it('spawns, lands and collects loot only once', () => {
    const { arena } = create(); arena.loot.spawn('run-xp', 'common', { ...arena.player.position }, 25, { ...arena.player.position });
    arena.update(1000, { x: 0, y: 0 }, 1000); arena.update(16, { x: 0, y: 0 }, 1016);
    expect(arena.pickupCount).toBe(1); arena.update(16, { x: 0, y: 0 }, 1032); expect(arena.pickupCount).toBe(1);
  });

  it('levels, pauses and applies a serializable upgrade', () => {
    const { combat, arena } = create(); arena.grantXp(100, 100);
    expect(combat.phase).toBe('upgrade'); expect(arena.pendingUpgradeIds).toHaveLength(3);
    expect(arena.chooseUpgrade(arena.pendingUpgradeIds[0], 200)).toBe(true); expect(combat.phase).toBe('playing');
    expect(JSON.parse(JSON.stringify(arena.selectedUpgrades))).toEqual(arena.selectedUpgrades);
  });

  it('mutation and upgrade modifiers combine in CombatModel', () => {
    const { combat, arena } = create(); combat.debugGrantBuild(['crystal', 'void'], 1);
    arena.grantUpgrade('heavy-core', 2); const damage = combat.attack('normal', 500).damage;
    expect(damage).toBeGreaterThan(10);
  });

  it('transitions boss cycles with HP and attack scaling', () => {
    const { combat, arena } = create(); const baseHp = combat.maxHp;
    arena.onBossDefeated(10); expect(arena.advanceCycle(20)).toBe(true);
    expect(arena.bossCycle).toBe(2); expect(combat.maxHp).toBeGreaterThan(baseHp);
    const strike = arena.bossAttacks.force('ground-slam', arena.player.position, 2); expect(strike.damage).toBeGreaterThan(BOSS_ATTACKS['ground-slam'].baseDamage);
  });

  it('dummy allies remain explicit non-network test entities', () => {
    const { arena } = create(); arena.spawnDummy(); expect(arena.dummyAllies[0].kind).toBe('dummy-ally'); expect(arena.dummyAllies[0].isOnlinePlayer).toBe(false);
  });
});

describe('M06 persistence, run modes and contracts', () => {
  it('serializes and restores a run at a clean boundary', () => {
    const first = create(202); first.arena.movePlayer(500, { x: 1, y: 0 }); first.arena.grantUpgrade('swift-step', 50);
    const snapshot = first.arena.snapshot(1000); const second = create(303); second.arena.restore(JSON.parse(JSON.stringify(snapshot)), 2000);
    expect(second.combat.runId).toBe(first.combat.runId); expect(second.arena.player.position).toEqual(first.arena.player.position); expect(second.arena.selectedUpgrades).toEqual(first.arena.selectedUpgrades);
    expect(second.arena.bossAttacks.active).toHaveLength(0); expect(second.arena.loot.drops).toHaveLength(0);
  });

  it('persists versioned guest progress and run snapshots', () => {
    const storage = new MemoryStorage(); const persistence = new GamePersistence(storage); const progress = createPlayerProgress('guest-fixed');
    persistence.saveProgress(progress); expect(persistence.loadProgress().guestId).toBe('guest-fixed');
    const { arena } = create(); persistence.saveRun(arena.snapshot(50)); expect(persistence.loadRun()?.combat.runId).toBe(arena.combat.runId);
    persistence.clearRun(); expect(storage.getItem(RUN_KEY)).toBeNull(); expect(storage.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('recovers safely from corrupt persistence', () => {
    const storage = new MemoryStorage(); storage.setItem(SAVE_KEY, '{bad'); storage.setItem(RUN_KEY, '{bad'); const persistence = new GamePersistence(storage);
    expect(persistence.loadProgress().guestId).toContain('guest-'); expect(persistence.loadRun()).toBeUndefined(); expect(storage.getItem(RUN_KEY)).toBeNull();
  });

  it('defines local modes separately from future server modes', () => {
    expect(RUN_MODES.solo.implemented).toBe(true); expect(RUN_MODES.event.implemented).toBe(true);
    expect(RUN_MODES.group.authority).toBe('future-server'); expect(RUN_MODES.country.aggregation).toBe('country-contribution'); expect(RUN_MODES.world.aggregation).toBe('world-contribution');
  });

  it('keeps country/world contribution contracts JSON safe', () => {
    const contract: ContributionContract = { schemaVersion: 1, runId: 'r', guestId: 'g', runMode: 'world', bossId: 'b', bossCyclesCleared: 2, damageDealt: 100, breakpoints: ['break-1'], runDurationMs: 1234, buildId: 'voidshard', mutations: ['crystal', 'void'], upgradeSummary: [{ id: 'heavy-core', stacks: 1 }], lootSummary: { relic: 1 }, validation: { clientVersion: '0.6.0', seed: 8 } };
    expect(isJsonSafeContract(contract)).toBe(true); expect(JSON.parse(JSON.stringify(contract))).toEqual(contract);
  });

  it('fullscreen controller falls back and toggles supported documents', async () => {
    const unsupported = new FullscreenController({}, {}, () => undefined); expect(await unsupported.toggle()).toBe(false);
    let requested = false; let changed = 0; const doc: { fullscreenElement?: object; exitFullscreen: () => Promise<void> } = { exitFullscreen: async () => { doc.fullscreenElement = undefined; } };
    const controller = new FullscreenController(doc, { requestFullscreen: async () => { requested = true; doc.fullscreenElement = {}; } }, () => { changed += 1; });
    expect(await controller.toggle()).toBe(true); expect(requested).toBe(true); expect(changed).toBe(1); expect(controller.active).toBe(true);
  });
});
