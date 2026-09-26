import { describe, expect, it } from 'vitest';
import { ArenaCamera } from './ArenaCamera';
import { BOSS_WORLD_ANCHOR } from './ArenaRegions';
import { BossAttackSystem } from './BossAttackSystem';
import { BossWorldEntity } from './BossWorldEntity';
import { createLocalPlayer } from './ArenaTypes';
import { PlayerMovementController } from './PlayerMovementController';
import { ArenaDepthSystem } from './ArenaDepthSystem';

describe('M09 true boss arena foundation', () => {
  it('accelerates, normalizes diagonals and decelerates predictably', () => {
    const player = createLocalPlayer('p', 'g');
    const controller = new PlayerMovementController();
    const unconstrained = <T extends { x: number; y: number }>(point: T): T => point;
    const first = controller.update(player, { x: 1, y: 1 }, 16, unconstrained);
    expect(first.speedRatio).toBeGreaterThan(0);
    expect(Math.abs(player.velocity.x)).toBeCloseTo(Math.abs(player.velocity.y));
    for (let i = 0; i < 30; i += 1) controller.update(player, { x: 1, y: 1 }, 16, unconstrained);
    expect(Math.hypot(player.velocity.x, player.velocity.y)).toBeLessThanOrEqual(player.stats.moveSpeed + .01);
    const beforeBrake = Math.hypot(player.velocity.x, player.velocity.y);
    controller.update(player, { x: 0, y: 0 }, 16, unconstrained);
    expect(Math.hypot(player.velocity.x, player.velocity.y)).toBeLessThan(beforeBrake);
  });

  it('runs dash as a timed movement state', () => {
    const player = createLocalPlayer('p', 'g');
    const controller = new PlayerMovementController();
    expect(controller.startDash({ x: 1, y: 0 })).toBe(true);
    const frame = controller.update(player, { x: 0, y: 0 }, 50, (point) => point);
    expect(frame.dashing).toBe(true);
    expect(player.position.x).toBeGreaterThan(0);
    expect(controller.startDash({ x: 0, y: 1 })).toBe(false);
    controller.update(player, { x: 0, y: 0 }, 220, (point) => point);
    expect(controller.isDashing).toBe(false);
  });

  it('classifies every boss-relative side and distance zone', () => {
    const boss = new BossWorldEntity(BOSS_WORLD_ANCHOR);
    boss.orientation = Math.PI / 2;
    expect(boss.relativeTo({ x: 2800, y: 2700 }).sector).toBe('front');
    expect(boss.relativeTo({ x: 3600, y: 1900 }).sector).toBe('left-flank');
    expect(boss.relativeTo({ x: 2000, y: 1900 }).sector).toBe('right-flank');
    expect(boss.relativeTo({ x: 2800, y: 900 }).sector).toBe('rear');
    expect(boss.relativeTo({ x: 2800, y: 2600 }).distanceZone).toBe('near');
    expect(boss.relativeTo({ x: 2800, y: 3200 }).distanceZone).toBe('mid');
    expect(boss.relativeTo({ x: 5000, y: 1900 }).distanceZone).toBe('far');
  });

  it('keeps the player outside the elliptical physical footprint', () => {
    const boss = new BossWorldEntity(BOSS_WORLD_ANCHOR);
    const constrained = boss.constrain({ ...BOSS_WORLD_ANCHOR });
    const dx = (constrained.x - boss.position.x) / (boss.footprint.radiusX + 46);
    const dy = (constrained.y - boss.position.y) / (boss.footprint.radiusY + 46);
    expect(dx * dx + dy * dy).toBeCloseTo(1);
  });

  it('changes boss/player depth when circling behind the boss', () => {
    const depth = new ArenaDepthSystem();
    expect(depth.bossAndPlayer(BOSS_WORLD_ANCHOR, { x: 2800, y: 2600 }).player).toBeGreaterThan(depth.bossAndPlayer(BOSS_WORLD_ANCHOR, { x: 2800, y: 2600 }).boss);
    expect(depth.bossAndPlayer(BOSS_WORLD_ANCHOR, { x: 2800, y: 1100 }).player).toBeLessThan(depth.bossAndPlayer(BOSS_WORLD_ANCHOR, { x: 2800, y: 1100 }).boss);
  });

  it('supports independent manual look, reset and zoom without moving gameplay', () => {
    const camera = new ArenaCamera(5600, 4000, .62, 1.38);
    camera.resize(390, 844);
    const player = { x: 2800, y: 2920 };
    camera.position = { ...player };
    camera.panByScreen(120, -90);
    for (let i = 0; i < 12; i += 1) camera.update(16, player, { x: 0, y: 0 });
    expect(camera.mode).toBe('look');
    expect(Math.abs(camera.manualOffset.x) + Math.abs(camera.manualOffset.y)).toBeGreaterThan(100);
    const unchanged = { ...player };
    camera.setZoom(1.38);
    camera.update(200, player, { x: 0, y: 0 });
    expect(player).toEqual(unchanged);
    camera.resetFollow();
    expect(camera.mode).toBe('follow');
  });

  it('selects spatial attacks for front, flank and rear positions', () => {
    const scheduler = new BossAttackSystem(91);
    expect(scheduler.availableKinds(2, .5, 700, 'front')).toContain('shockwave');
    expect(scheduler.availableKinds(2, .5, 900, 'left-flank')).toContain('arm-sweep');
    expect(scheduler.availableKinds(2, .5, 700, 'rear')).toContain('rear-slam');
    expect(scheduler.availableKinds(3, .2, 1400, 'front')).toContain('radial-shockwave');
  });
});
