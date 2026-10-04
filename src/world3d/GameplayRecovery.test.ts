import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ArenaCamera } from '../gameplay/ArenaCamera';
import { cameraRelativeMovement } from './Hybrid3DVerticalSlice';
import { HybridCameraController } from './HybridCameraController';
import type { CameraObstructionResolver } from './HybridCameraObstruction';
import { HeroVisualState } from './HeroVisualState';

class SevereObstruction implements CameraObstructionResolver {
  resolve(): number { return 3.8; }
}

function settle(controller: HybridCameraController, frames = 180): void {
  for (let index = 0; index < frames; index += 1) {
    controller.update(16, { x: 0, y: 700 }, { x: 0, y: 0 }, { x: 0, y: -700 });
  }
}

describe('real-device gameplay recovery', () => {
  it('never turns obstruction into visual auto zoom', () => {
    const controller = new HybridCameraController(new THREE.PerspectiveCamera(), 11, new SevereObstruction());
    controller.setUserZoomDistance(18);
    settle(controller);
    expect(controller.collisionLimitedDistance).toBeCloseTo(3.8, 2);
    expect(controller.userZoomDistance).toBe(18);
    expect(controller.actualCameraDistance).toBeCloseTo(18, 2);
  });

  it('keeps legacy presentation events from changing manual zoom', () => {
    const camera = new ArenaCamera(5600, 4000, .62, 1.38);
    camera.zoom = camera.targetZoom = 1.08;
    for (const event of ['breakpoint', 'mutation', 'kill', 'cycle'] as const) camera.emphasize(event);
    expect(camera.zoom).toBe(1.08);
    expect(camera.targetZoom).toBe(1.08);
  });

  it('maps the full joystick compass through camera yaw without changing magnitude', () => {
    const inputs = [
      { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
    ];
    for (const input of inputs) {
      const normalized = Math.hypot(input.x, input.y);
      const source = { x: input.x / normalized, y: input.y / normalized };
      const result = cameraRelativeMovement(source, 1.17);
      expect(Math.hypot(result.x, result.y)).toBeCloseTo(1, 6);
    }
  });

  it('keeps movement facing during automatic attacks instead of popping towards the Boss', () => {
    const visual = new HeroVisualState();
    visual.update(200, { x: 100, y: 0 }, false, false);
    const movingDirection = visual.snapshot().direction;
    visual.update(16, { x: 100, y: 0 }, false, true, { x: 0, y: -500 });
    expect(visual.snapshot().direction).toBe(movingDirection);
    expect(visual.snapshot().pose).toBe('run');
  });

  it('still uses the authored attack pose when firing from a standstill', () => {
    const visual = new HeroVisualState();
    visual.update(100, { x: 0, y: 0 }, false, true, { x: 0, y: -500 });
    expect(visual.snapshot().pose).toBe('attack');
  });
});
