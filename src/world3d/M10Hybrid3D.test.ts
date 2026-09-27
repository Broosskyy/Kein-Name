import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BossAttackSystem } from '../gameplay/BossAttackSystem';
import { BossWorldEntity } from '../gameplay/BossWorldEntity';
import { createLocalPlayer } from '../gameplay/ArenaTypes';
import { LootSystem } from '../gameplay/LootSystem';
import { PlayerMovementController } from '../gameplay/PlayerMovementController';
import { HybridCameraController } from './HybridCameraController';
import { HybridCollisionSystem } from './HybridCollisionSystem';
import { M10_HYBRID_TEST_SCENE } from './Hybrid3DTestScene';
import { simulationToWorld3D, world3DToSimulation } from './World3DTypes';

describe('M10 hybrid 3D spatial foundation', () => {
  it('converts simulation X/depth into 3D X/Z without losing round-trip position', () => {
    const simulation = { x: 735, y: -412 };
    const world = simulationToWorld3D(simulation, 150);
    expect(world).toEqual({ x: 7.35, y: 1.5, z: -4.12 });
    expect(world3DToSimulation(world)).toEqual(simulation);
  });

  it('defines a deterministic playable test scene with required spatial contents', () => {
    expect(M10_HYBRID_TEST_SCENE.id).toBe('m10-harvest-basin-spike');
    expect(M10_HYBRID_TEST_SCENE.dimensions).toEqual({ width: 2200, depth: 2200 });
    expect(M10_HYBRID_TEST_SCENE.props.some((prop) => prop.kind === 'pillar')).toBe(true);
    expect(M10_HYBRID_TEST_SCENE.props.some((prop) => prop.kind === 'arch')).toBe(true);
    expect(M10_HYBRID_TEST_SCENE.props.some((prop) => prop.kind === 'rock')).toBe(true);
    expect(M10_HYBRID_TEST_SCENE.lootSpawns.length).toBeGreaterThan(0);
  });

  it('moves the Hero on planar simulation axes that map to world X/Z', () => {
    const player = createLocalPlayer('hero', 'guest');
    player.position = { x: 0, y: 0 };
    const movement = new PlayerMovementController();
    movement.update(player, { x: 1, y: -1 }, 250, (point) => point);
    const world = simulationToWorld3D(player.position);
    expect(world.x).toBeGreaterThan(0);
    expect(world.z).toBeLessThan(0);
    expect(world.y).toBe(0);
  });

  it('keeps camera pan and zoom local and leaves Hero coordinates untouched', () => {
    const camera = new THREE.PerspectiveCamera();
    const controller = new HybridCameraController(camera);
    const hero = { x: 140, y: 510 };
    const before = { ...hero };
    controller.pan(180, -220);
    controller.zoom(.45);
    controller.update(16, hero, { x: 0, y: 0 }, M10_HYBRID_TEST_SCENE.bossSpawn);
    expect(hero).toEqual(before);
    expect(controller.snapshot().mode).toBe('look');
    expect(controller.snapshot().offsetX).not.toBe(0);
    expect(controller.snapshot().offsetZ).not.toBe(0);
  });

  it('smoothly resets LOOK to FOLLOW without mutating simulation', () => {
    const controller = new HybridCameraController(new THREE.PerspectiveCamera());
    const hero = { x: 0, y: 720 };
    controller.pan(300, 100);
    controller.update(100, hero, { x: 0, y: 0 }, M10_HYBRID_TEST_SCENE.bossSpawn);
    const offsetBefore = Math.hypot(controller.snapshot().offsetX, controller.snapshot().offsetZ);
    controller.resetFollow();
    controller.update(100, hero, { x: 0, y: 0 }, M10_HYBRID_TEST_SCENE.bossSpawn);
    expect(controller.snapshot().mode).toBe('follow');
    expect(Math.hypot(controller.snapshot().offsetX, controller.snapshot().offsetZ)).toBeLessThan(offsetBefore);
    expect(hero).toEqual({ x: 0, y: 720 });
  });

  it('resolves arena, pillar and rock collision with broad navigable lanes', () => {
    const scene = M10_HYBRID_TEST_SCENE;
    const collisions = new HybridCollisionSystem(scene.dimensions.width, scene.dimensions.depth, scene.colliders);
    expect(collisions.resolve({ x: 5000, y: 5000 }).x).toBeLessThanOrEqual(1062);
    const pillar = collisions.resolve({ x: -520, y: 280 });
    expect(Math.hypot(pillar.x + 520, pillar.y - 280)).toBeGreaterThan(92);
    expect(collisions.resolve({ x: 0, y: 720 })).toEqual({ x: 0, y: 720 });
  });

  it('represents front, flank and rear as actual positions around the Boss proxy', () => {
    const boss = new BossWorldEntity({ x: 0, y: 0 });
    boss.orientation = 0;
    expect(boss.relativeTo({ x: 700, y: 0 }).sector).toBe('front');
    expect(boss.relativeTo({ x: 0, y: 700 }).sector).toBe('right-flank');
    expect(boss.relativeTo({ x: -700, y: 0 }).sector).toBe('rear');
    expect(boss.relativeTo({ x: 0, y: -700 }).sector).toBe('left-flank');
  });

  it('keeps telegraph and loot coordinates stable in world space', () => {
    const attacks = new BossAttackSystem(91);
    const telegraph = attacks.force('ground-slam', { x: 260, y: 270 }, 1, { position: { x: 0, y: -380 }, orientation: Math.PI / 2 });
    const worldBefore = simulationToWorld3D(telegraph.position);
    const loot = new LootSystem(91);
    const drop = loot.spawn('relic', 'epic', { x: 0, y: -380 }, 10, { x: 320, y: -30 });
    expect(drop).toBeDefined();
    expect(simulationToWorld3D(telegraph.position)).toEqual(worldBefore);
    expect(simulationToWorld3D(drop!.target)).toEqual({ x: 3.2, y: 0, z: -.3 });
  });
});

describe('M10.1 visual proof convergence', () => {
  it('adds spatial identity anchors without turning the arena into a prop field', () => {
    const kinds = new Set(M10_HYBRID_TEST_SCENE.props.map((prop) => prop.kind));
    expect(kinds.has('crystal')).toBe(true);
    expect(kinds.has('corruption')).toBe(true);
    expect(kinds.has('wall')).toBe(true);
    expect(M10_HYBRID_TEST_SCENE.props.length).toBeLessThanOrEqual(16);
  });

  it('supports deterministic portrait proof framing as local camera state', () => {
    const hero = { x: 0, y: 720 };
    const camera = new THREE.PerspectiveCamera();
    const controller = new HybridCameraController(camera);
    controller.setVisualProofView({ mode: 'follow', distance: 16.2, yaw: 0, pitchDeg: 55 });
    controller.update(1000, hero, { x: 0, y: 0 }, M10_HYBRID_TEST_SCENE.bossSpawn);
    expect(controller.snapshot().mode).toBe('follow');
    expect(controller.snapshot().distance).toBeCloseTo(16.2, 3);
    expect(hero).toEqual({ x: 0, y: 720 });
  });

  it('retains blocking geometry for occlusion proof landmarks', () => {
    const ids = new Set(M10_HYBRID_TEST_SCENE.colliders.map((collider) => collider.id));
    expect(ids.has('pillar-west')).toBe(true);
    expect(ids.has('wall-northeast')).toBe(true);
    expect(ids.has('crystal-west')).toBe(true);
  });
});
