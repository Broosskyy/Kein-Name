import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BossEncounterLoop } from '../gameplay/BossEncounterLoop';
import { CombatModel } from '../core/CombatModel';
import { BossAttackSystem } from '../gameplay/BossAttackSystem';
import { PlayerProjectileSystem } from '../gameplay/PlayerProjectileSystem';
import { distanceToZoomLevel, zoomLevelToDistance } from '../ui/GameUI';
import { HeroAnimationController, heroAnimationClip } from './HeroAnimationController';
import { HERO_FOOT_CLEARANCE, HeroGroundingController } from './HeroGrounding';
import { HybridCameraController, MAX_USER_ZOOM_DISTANCE, MIN_USER_ZOOM_DISTANCE } from './HybridCameraController';
import type { CameraObstructionResolver } from './HybridCameraObstruction';
import { sampleWalkableSurface } from './HybridGroundSampler';
import { M10_HYBRID_TEST_SCENE } from './Hybrid3DTestScene';
import { HybridWalkableSurfaceSystem } from './HybridWalkableSurfaceSystem';

const root = fileURLToPath(new URL('../../', import.meta.url));

describe('M10.4 shared walkable surfaces and grounding', () => {
  it('samples every authored walkable family from one source of truth', () => {
    expect(sampleWalkableSurface(9.5, 8.8).surfaceId).toBe('base-ground');
    expect(sampleWalkableSurface(2.8, 8).surfaceId).toBe('lower-approach');
    expect(sampleWalkableSurface(0, 4.8).surfaceId).toMatch(/approach|paving/);
    expect(sampleWalkableSurface(0, 3.2).surfaceId).toBe('paving-slabs');
    expect(sampleWalkableSurface(4.6, -3.8).surfaceId).toBe('boss-basin');
    expect(sampleWalkableSurface(0, -3.8).surfaceId).toBe('inner-basin');
    expect(sampleWalkableSurface(-7.8, -5.7).surfaceId).toBe('west-shelf');
  });

  it('uses the same sampled top face for Hero render Y and blocks major colliders', () => {
    const surfaces = new HybridWalkableSurfaceSystem(M10_HYBRID_TEST_SCENE.dimensions.width, M10_HYBRID_TEST_SCENE.dimensions.depth, M10_HYBRID_TEST_SCENE.colliders);
    const position = { x: 0, y: -380 };
    const grounding = new HeroGroundingController();
    const surface = surfaces.sample(position);
    const renderY = grounding.update(position.x / 100, position.y / 100, 16);
    expect(renderY).toBeCloseTo(surface.height + HERO_FOOT_CLEARANCE, 5);
    const blocked = surfaces.resolve({ x: -520, y: 250 });
    expect(blocked.collisionState).toBe('blocked');
    expect(blocked.position).not.toEqual({ x: -520, y: 250 });
  });
});

describe('M10.4 manual zoom ownership', () => {
  it('maps the fold-out slider to the full user distance range', () => {
    expect(zoomLevelToDistance(100)).toBe(MIN_USER_ZOOM_DISTANCE);
    expect(zoomLevelToDistance(0)).toBe(MAX_USER_ZOOM_DISTANCE);
    expect(distanceToZoomLevel(MIN_USER_ZOOM_DISTANCE)).toBe(100);
  });

  it('keeps follow, pitch and boss focus from mutating user zoom', () => {
    const camera = new THREE.PerspectiveCamera();
    const controller = new HybridCameraController(camera);
    controller.setUserZoomDistance(18.25);
    controller.setMode('follow');
    controller.gesture(0, 120);
    controller.setMode('boss-focus');
    for (let index = 0; index < 30; index += 1) controller.update(16, { x: 0, y: 500 }, { x: 0, y: -100 }, { x: 0, y: -380 });
    expect(controller.snapshot().userZoomDistance).toBe(18.25);
  });

  it('lets collision reduce only actual distance and restores the user distance', () => {
    class ToggleObstruction implements CameraObstructionResolver {
      blocked = true;
      resolve(_target: THREE.Vector3, _desired: THREE.Vector3, requested: number): number { return this.blocked ? 7 : requested; }
    }
    const obstruction = new ToggleObstruction();
    const controller = new HybridCameraController(new THREE.PerspectiveCamera(), 10.6, obstruction);
    controller.setUserZoomDistance(17);
    for (let index = 0; index < 30; index += 1) controller.update(16, { x: 0, y: 500 }, { x: 0, y: 0 }, { x: 0, y: -380 });
    expect(controller.actualCameraDistance).toBeLessThan(controller.userZoomDistance);
    obstruction.blocked = false;
    for (let index = 0; index < 240; index += 1) controller.update(16, { x: 0, y: 500 }, { x: 0, y: 0 }, { x: 0, y: -380 });
    expect(controller.actualCameraDistance).toBeCloseTo(17, 2);
    expect(controller.userZoomDistance).toBe(17);
  });
});

describe('M10.4 Boss round lifecycle', () => {
  it('emits defeat, loot and respawn exactly once and scales the next round', () => {
    const loop = new BossEncounterLoop();
    expect(loop.defeat()).toEqual(['death-started']);
    expect(loop.defeat()).toEqual([]);
    expect(loop.attackEnabled).toBe(false);
    const events = [...loop.update(1100), ...loop.update(1100), ...loop.update(1800)];
    expect(events.filter((event) => event === 'loot')).toHaveLength(1);
    expect(events.filter((event) => event === 'respawn')).toHaveLength(1);
    expect(loop.state).toBe('alive');
    expect(loop.bossRoundIndex).toBe(2);
    expect(loop.bossLevel).toBe(2);
    expect(loop.maxHp(1000)).toBe(1320);
  });

  it('supports clearing stale player projectiles at defeat/respawn boundaries', () => {
    const shots = new PlayerProjectileSystem();
    shots.launch('normal', { x: 0, y: 0 }, { x: 800, y: 0 }, 10);
    expect(shots.active).toHaveLength(1);
    shots.reset();
    expect(shots.active).toHaveLength(0);
  });

  it('restores HP for the next round with no stale telegraph or projectile', () => {
    const combat = new CombatModel(0, { idGenerator: () => 'm10.4', seedGenerator: () => 44, wallClock: () => '2026-09-30T00:00:00.000Z' });
    const loop = new BossEncounterLoop();
    const attacks = new BossAttackSystem(44);
    const shots = new PlayerProjectileSystem();
    attacks.force('ground-slam', { x: 0, y: 0 });
    shots.launch('normal', { x: 0, y: 0 }, { x: 500, y: 0 }, 10);
    expect(combat.debugForceKill(100).bossDefeated).toBe(true);
    loop.defeat(); attacks.reset(45); shots.reset();
    expect(attacks.active).toHaveLength(0);
    expect(shots.active).toHaveLength(0);
    expect(attacks.update(1000, { x: 0, y: 0 }, 1, loop.attackEnabled)).toEqual([]);
    const events = loop.update(4000);
    expect(events).toContain('respawn');
    combat.startNextCycle(4100, loop.maxHp(combat.activeBoss.maxHp));
    expect(combat.bossHp).toBe(combat.maxHp);
    expect(combat.bossHp).toBeGreaterThan(combat.activeBoss.maxHp);
  });
});

describe('M10.4 animated eight-direction Hero foundation', () => {
  it('provides real timed frame sequences for all 32 direction/state clips', () => {
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
    const states = ['idle', 'run', 'dash', 'attack'] as const;
    for (const direction of directions) for (const state of states) {
      const clip = heroAnimationClip(state, direction);
      expect(clip.frames.length).toBeGreaterThanOrEqual(state === 'run' ? 6 : 3);
      expect(clip.frames.every((frame) => frame.asset === `creature.direction.${direction}.${state}`)).toBe(true);
    }
  });

  it('advances frames without resetting every render tick and preserves gait phase on turns', () => {
    const animation = new HeroAnimationController();
    animation.update(90, 'run', 'n');
    const first = animation.frameIndex;
    animation.update(90, 'run', 'n');
    expect(animation.frameIndex).toBeGreaterThan(first);
    const beforeTurn = animation.frameIndex;
    animation.update(1, 'run', 'ne');
    expect(animation.frameIndex).toBe(beforeTurn);
  });

  it('ships a complete normalized audit with no flagged source cutouts', () => {
    const audit = JSON.parse(readFileSync(`${root}production-assets/audit/hero-animation-audit.json`, 'utf8')) as { actualAssets: number; anomalyCount: number };
    expect(audit.actualAssets).toBe(32);
    expect(audit.anomalyCount).toBe(0);
  });
});
