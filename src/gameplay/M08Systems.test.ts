import { describe, expect, it } from 'vitest';
import { ArenaCamera } from './ArenaCamera';
import { ARENA_REGIONS, BOSS_WORLD_ANCHOR, BOSS_ZONE_RADIUS, arenaRegionAt, constrainOutsideBossZone } from './ArenaRegions';
import { BossAttackSystem } from './BossAttackSystem';
import { LootSystem } from './LootSystem';
import { BossWorldPresentation } from '../render/BossWorldPresentation';

describe('M08 world feel and presentation inputs', () => {
  it('maps travel positions into recognizable arena regions', () => {
    for (const region of ARENA_REGIONS) expect(arenaRegionAt(region.center).id).toBe(region.id);
    expect(new Set(ARENA_REGIONS.map((region) => region.id)).size).toBe(6);
  });

  it('keeps players outside the Harvest Colossus interaction zone', () => {
    const constrained = constrainOutsideBossZone({ ...BOSS_WORLD_ANCHOR });
    expect(Math.hypot(constrained.x - BOSS_WORLD_ANCHOR.x, constrained.y - BOSS_WORLD_ANCHOR.y)).toBeCloseTo(BOSS_ZONE_RADIUS);
    const safe = { x: 400, y: 1400 };
    expect(constrainOutsideBossZone(safe)).toEqual(safe);
  });

  it('moves the hybrid boss laterally and scales it by distance', () => {
    const camera = new ArenaCamera(3200, 1800, .68, 1.3); camera.resize(390, 844);
    const presentation = new BossWorldPresentation();
    camera.position = { x: 1100, y: 1100 };
    const left = presentation.pose(camera, { x: 1100, y: 950 }, 390, 844, true);
    camera.position = { x: 2100, y: 1100 };
    const right = presentation.pose(camera, { x: 2100, y: 950 }, 390, 844, true);
    const far = presentation.pose(camera, { x: 2900, y: 1650 }, 390, 844, true);
    expect(left.x).toBeGreaterThan(right.x);
    expect(left.scale).toBeGreaterThan(far.scale);
  });

  it('camera travel reveals world while zoom remains presentation-only', () => {
    const camera = new ArenaCamera(3200, 1800, .68, 1.3); camera.resize(390, 844);
    const before = camera.worldToScreen({ x: 400, y: 900 });
    for (let step = 0; step < 20; step += 1) camera.update(50, { x: 2550, y: 1350 }, { x: 500, y: 140 });
    const after = camera.worldToScreen({ x: 400, y: 900 });
    expect(after.x).toBeLessThan(before.x - 100);
    expect(camera.setZoom(.1)).toBe(.68);
    expect(camera.setZoom(9)).toBe(1.3);
  });

  it('distance expands the boss vocabulary without losing phase rules', () => {
    const scheduler = new BossAttackSystem(12);
    expect(scheduler.availableKinds(1, 1, 1500)).toContain('core-beam');
    expect(scheduler.availableKinds(1, 1, 500)).toContain('shockwave');
    expect(scheduler.availableKinds(1, 1, 900)).not.toContain('void-cone');
  });

  it('places premium loot in readable risk-reward territory', () => {
    const loot = new LootSystem(44);
    const epic = loot.spawn('relic', 'epic', BOSS_WORLD_ANCHOR, 1)!;
    const common = loot.spawn('run-xp', 'common', BOSS_WORLD_ANCHOR, 10)!;
    expect(epic.target.x).toBeGreaterThanOrEqual(1120);
    expect(epic.target.x).toBeLessThanOrEqual(2080);
    expect(epic.target.y).toBeLessThanOrEqual(950);
    expect(common.target.y).toBeGreaterThanOrEqual(560);
  });
});
