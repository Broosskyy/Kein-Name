import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ASSET_MANIFEST } from '../assets';
import { BossDirectionalState, bossViewAsset, bossViewFromAngle, bossViewSector, type BossDirectionalView } from './BossDirectionalView';
import { HeroGroundingController, HERO_FOOT_CLEARANCE } from './HeroGrounding';
import { heroFootAnchor } from './HeroFootAnchors';
import { HeroVisualState } from './HeroVisualState';
import { HybridCameraController } from './HybridCameraController';
import { HybridCameraObstruction } from './HybridCameraObstruction';
import { sampleGroundHeight } from './HybridGroundSampler';

const root = fileURLToPath(new URL('../../', import.meta.url));

describe('M10.3 camera obstruction and visibility', () => {
  it('retracts for an obstruction, then restores without mutating simulation coordinates', () => {
    const obstruction = new HybridCameraObstruction();
    const rock = new THREE.Group();
    rock.position.set(0, 0, 5);
    rock.add(new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshBasicMaterial()));
    obstruction.register('rock', rock, 1.2, 3);
    const target = new THREE.Vector3(0, .8, 0), desired = new THREE.Vector3(0, 7, 10);
    expect(obstruction.resolve(target, desired, 12)).toBeLessThan(12);
    rock.position.x = 20;
    expect(obstruction.resolve(target, desired, 12)).toBe(12);

    const camera = new THREE.PerspectiveCamera();
    const controller = new HybridCameraController(camera, 10.5, obstruction);
    const hero = { x: 0, y: 400 };
    const before = { ...hero };
    controller.gesture(110, -90);
    controller.update(16, hero, { x: 0, y: 0 }, { x: 0, y: -380 });
    expect(hero).toEqual(before);
  });

  it('fades only a near occluder and restores its material smoothly', () => {
    const obstruction = new HybridCameraObstruction();
    const rootObject = new THREE.Group();
    rootObject.position.set(0, 0, 5);
    const material = new THREE.MeshBasicMaterial({ opacity: 1 });
    rootObject.add(new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), material));
    obstruction.register('near-rock', rootObject, 1.4, 4);
    for (let i = 0; i < 30; i += 1) obstruction.updateFades(16, new THREE.Vector3(0, 3, 10), new THREE.Vector3(0, 1, 0));
    expect(obstruction.snapshot().fadedOccluders).toBe(1);
    rootObject.position.x = 10;
    for (let i = 0; i < 90; i += 1) obstruction.updateFades(16, new THREE.Vector3(0, 3, 10), new THREE.Vector3(0, 1, 0));
    expect(obstruction.snapshot().fadedOccluders).toBe(0);
  });
});

describe('M10.3 Hero grounding and stable authored frames', () => {
  it('never interpolates below a newly encountered walkable surface', () => {
    const grounding = new HeroGroundingController();
    grounding.update(0, 9, 16);
    const renderY = grounding.update(0, 3, 16);
    expect(renderY).toBeGreaterThanOrEqual(sampleGroundHeight(0, 3) + HERO_FOOT_CLEARANCE);
  });

  it('holds attack facing and avoids repeated state swaps', () => {
    const state = new HeroVisualState();
    state.update(16, { x: 80, y: 0 }, false, false);
    state.update(16, { x: 80, y: 0 }, false, true, { x: 0, y: -200 });
    const locked = state.snapshot().direction;
    for (let i = 0; i < 10; i += 1) state.update(16, { x: 80, y: 0 }, false, true, { x: i % 2 ? 200 : -200, y: 0 });
    expect(state.snapshot().direction).toBe(locked);
    expect(state.snapshot().textureSwapsPerSecond).toBe(0);
  });

  it('keeps all 32 normalized frames on one calibrated footline', () => {
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
    const poses = ['idle', 'run', 'dash', 'attack'] as const;
    const anchors = directions.flatMap((direction) => poses.map((pose) => heroFootAnchor(direction, pose)));
    expect(new Set(anchors)).toEqual(new Set([.1042]));
    const audit = JSON.parse(readFileSync(`${root}production-assets/audit/hero-directional-audit.json`, 'utf8')) as { assets: unknown[] };
    expect(audit.assets).toHaveLength(32);
  });
});

describe('M10.3 single directional Boss presentation', () => {
  const views: readonly BossDirectionalView[] = ['front', 'front-left', 'left', 'rear-left', 'rear', 'rear-right', 'right', 'front-right'];

  it('maps a complete 360 degree camera orbit to eight stable views', () => {
    const mapped = new Set(views.map((_, index) => bossViewFromAngle(index * Math.PI / 4, 0)));
    expect(mapped.size).toBe(8);
    const state = new BossDirectionalState();
    const initial = state.update(16, 0, 0);
    for (let index = 0; index < 5; index += 1) state.update(16, Math.PI / 8 + (index % 2 ? .01 : -.01), 0);
    expect(state.view).toBe(initial);
  });

  it('registers all directional assets and keeps one normal render path', () => {
    for (const view of views) {
      const key = bossViewAsset(view);
      expect(ASSET_MANIFEST[key].src).toContain(`/boss/directional/harvest-colossus-${view}.webp`);
      expect(statSync(`${root}public${ASSET_MANIFEST[key].src}`).size).toBeGreaterThan(0);
    }
    expect(bossViewSector('front')).toBe('front');
    expect(bossViewSector('left')).toBe('flank');
    expect(bossViewSector('rear')).toBe('rear');
    const source = readFileSync(`${root}src/world3d/HybridWorldRenderer.ts`, 'utf8');
    expect(source).not.toContain('addBossBody');
    expect(source.match(/this\.scene\.add\(this\.bossVisual\)/g)).toHaveLength(1);
  });
});
