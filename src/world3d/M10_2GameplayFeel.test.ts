import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlayerProjectileSystem } from '../gameplay/PlayerProjectileSystem';
import { cameraGestureAllowed } from '../ui/GameUI';
import { HeroVisualState } from './HeroVisualState';
import { heroFootAnchor } from './HeroFootAnchors';
import { HybridCameraController } from './HybridCameraController';
import { heroRenderY } from './HeroGrounding';
import { sampleBaseTerrainHeight, sampleGroundHeight } from './HybridGroundSampler';
import { M10_HYBRID_TEST_SCENE } from './Hybrid3DTestScene';
import { bossVisualSectorFromView } from './HybridWorldRenderer';
import { cameraRelativeMovement } from './Hybrid3DVerticalSlice';

function settleCamera(controller: HybridCameraController, frames = 50): void {
  for (let index = 0; index < frames; index += 1) {
    controller.update(16, { x: 0, y: 720 }, { x: 0, y: 0 }, M10_HYBRID_TEST_SCENE.bossSpawn);
  }
}

describe('M10.2 spatial camera controls', () => {
  it('changes real pitch after vertical drag and clamps it to the playable range', () => {
    const controller = new HybridCameraController(new THREE.PerspectiveCamera());
    const initial = controller.snapshot().pitchDeg;
    controller.gesture(0, -90);
    settleCamera(controller);
    expect(controller.snapshot().pitchDeg).toBeLessThan(initial);
    controller.gesture(0, -10000);
    settleCamera(controller, 100);
    expect(controller.snapshot().pitchDeg).toBeGreaterThanOrEqual(28);
    controller.gesture(0, 10000);
    settleCamera(controller, 100);
    expect(controller.snapshot().pitchDeg).toBeLessThanOrEqual(68);
  });

  it('changes yaw after horizontal drag without mutating Hero coordinates', () => {
    const controller = new HybridCameraController(new THREE.PerspectiveCamera());
    const hero = { x: 140, y: 510 };
    const before = { ...hero };
    controller.gesture(140, 0);
    for (let index = 0; index < 50; index += 1) controller.update(16, hero, { x: 0, y: 0 }, M10_HYBRID_TEST_SCENE.bossSpawn);
    expect(Math.abs(controller.snapshot().yaw)).toBeGreaterThan(.2);
    expect(hero).toEqual(before);
  });

  it('suspends Boss bias during manual camera control', () => {
    const controller = new HybridCameraController(new THREE.PerspectiveCamera());
    controller.gesture(24, -16);
    settleCamera(controller, 1);
    expect(controller.snapshot().mode).toBe('look');
    expect(controller.snapshot().bossBias).toBe(0);
    expect(controller.snapshot().manualControlMs).toBeGreaterThan(0);
  });
});

describe('M10.2 Hero grounding and visual stability', () => {
  it('samples base terrain, raised approach, Boss basin and side shelf deterministically', () => {
    expect(sampleGroundHeight(0, 9)).toBeCloseTo(sampleBaseTerrainHeight(0, 9), 6);
    expect(sampleGroundHeight(0, 3)).toBeCloseTo(.225, 6);
    expect(sampleGroundHeight(0, -3.8)).toBeCloseTo(.24, 6);
    expect(sampleGroundHeight(7.7, -5.4)).toBeCloseTo(.41, 6);
  });

  it('places the visual Hero at sampled ground plus the foot clearance', () => {
    expect(heroRenderY(0, -3.8)).toBeCloseTo(sampleGroundHeight(0, -3.8) + .035, 6);
    expect(heroFootAnchor('s', 'run')).toBeCloseTo(.1042, 3);
    expect(heroFootAnchor('w', 'attack')).toBeCloseTo(.1042, 3);
  });

  it('uses direction and run hysteresis instead of oscillating at thresholds', () => {
    const state = new HeroVisualState();
    state.update(100, { x: 40, y: 0 }, false, false);
    expect(state.snapshot().pose).toBe('run');
    state.update(100, { x: 25, y: 0 }, false, false);
    expect(state.snapshot().pose).toBe('run');
    state.update(100, { x: 10, y: 0 }, false, false);
    expect(state.snapshot().pose).toBe('idle');
    const direction = state.snapshot().direction;
    for (let index = 0; index < 12; index += 1) state.update(16, { x: 20, y: index % 2 ? 8.2 : 8 }, false, false);
    expect(state.snapshot().direction).toBe(direction);
    expect(state.snapshot().textureSwapsPerSecond).toBe(0);
  });
});

describe('M10.2 world-space projectile combat', () => {
  it('spawns, travels, hits exactly once and is destroyed at impact', () => {
    const system = new PlayerProjectileSystem();
    const projectile = system.launch('normal', { x: 0, y: 0 }, { x: 1000, y: 0 }, 42);
    expect(projectile).toBeDefined();
    const start = projectile!.position.x;
    expect(system.update(100, { x: 1000, y: 0 }, 80)).toEqual([]);
    expect(projectile!.position.x).toBeGreaterThan(start);
    let impacts = [] as ReturnType<PlayerProjectileSystem['update']>;
    for (let index = 0; index < 20 && impacts.length === 0; index += 1) impacts = system.update(50, { x: 1000, y: 0 }, 80);
    expect(impacts).toHaveLength(1);
    expect(impacts[0].damage).toBe(42);
    expect(system.active).toHaveLength(0);
    expect(system.update(50, { x: 1000, y: 0 }, 80)).toEqual([]);
  });

  it('keeps projectile simulation camera-independent and differentiates Power Hit', () => {
    const system = new PlayerProjectileSystem();
    const normal = system.launch('normal', { x: 0, y: 0 }, { x: 1000, y: 0 }, 42)!;
    const power = system.launch('power', { x: 0, y: 50 }, { x: 1000, y: 50 }, 160)!;
    const controller = new HybridCameraController(new THREE.PerspectiveCamera());
    const before = { ...normal.position };
    controller.gesture(300, -180);
    controller.zoom(.5);
    settleCamera(controller);
    expect(normal.position).toEqual(before);
    expect(power.visualType).not.toBe(normal.visualType);
    expect(power.radius).toBeGreaterThan(normal.radius);
    expect(power.damage).toBeGreaterThan(normal.damage);
  });
});

describe('M10.2 mobile input arbitration', () => {
  it('accepts camera gestures only from free world input', () => {
    expect(cameraGestureAllowed('world')).toBe(true);
    expect(cameraGestureAllowed('joystick')).toBe(false);
    expect(cameraGestureAllowed('combat-button')).toBe(false);
    expect(cameraGestureAllowed('hud')).toBe(false);
  });

  it('keeps joystick directions screen-relative after camera orbit', () => {
    expect(cameraRelativeMovement({ x: 0, y: -1 }, 0)).toEqual({ x: 0, y: -1 });
    const quarterTurn = cameraRelativeMovement({ x: 0, y: -1 }, Math.PI / 2);
    expect(quarterTurn.x).toBeCloseTo(-1, 6);
    expect(quarterTurn.y).toBeCloseTo(0, 6);
    const right = cameraRelativeMovement({ x: 1, y: 0 }, Math.PI / 2);
    expect(right.x).toBeCloseTo(0, 6);
    expect(right.y).toBeCloseTo(-1, 6);
  });
});

describe('M10.2 Boss hybrid visual sectors', () => {
  it('selects stable front, flank and rear views from world orientation', () => {
    const boss = { x: 0, z: 0 };
    expect(bossVisualSectorFromView({ x: 10, z: 0 }, boss, 0)).toBe('front');
    expect(bossVisualSectorFromView({ x: 0, z: 10 }, boss, 0)).toBe('flank');
    expect(bossVisualSectorFromView({ x: -10, z: 0 }, boss, 0)).toBe('rear');
  });
});
