import type { Vec2 } from '../gameplay/ArenaTypes';
import type { WorldCollider3D } from './World3DTypes';
import { WORLD3D_UNITS_PER_METER } from './World3DTypes';
import { HybridCollisionSystem } from './HybridCollisionSystem';
import { sampleWalkableSurfaceAtSimulation, type WalkableSurfaceSample } from './HybridGroundSampler';

export interface MovementSurfaceResult {
  position: Vec2;
  surface: WalkableSurfaceSample;
  collisionState: 'clear' | 'blocked';
}

/** Shared movement-side gateway to the same authored surfaces consumed by the
 * renderer. It keeps planar simulation authoritative while exposing elevation
 * and collision diagnostics without putting gameplay truth in Three.js. */
export class HybridWalkableSurfaceSystem {
  private readonly collisions: HybridCollisionSystem;

  constructor(width: number, depth: number, colliders: readonly WorldCollider3D[], actorRadius = 38) {
    this.collisions = new HybridCollisionSystem(width, depth, colliders, actorRadius);
  }

  resolve(position: Vec2): MovementSurfaceResult {
    const resolved = this.collisions.resolve(position);
    const blocked = Math.hypot(resolved.x - position.x, resolved.y - position.y) > .01;
    return {
      position: resolved,
      surface: sampleWalkableSurfaceAtSimulation(resolved),
      collisionState: blocked ? 'blocked' : 'clear',
    };
  }

  sample(position: Vec2): WalkableSurfaceSample { return sampleWalkableSurfaceAtSimulation(position); }
  worldHeight(position: Vec2): number { return this.sample(position).height; }
  simulationHeight(position: Vec2): number { return this.worldHeight(position) * WORLD3D_UNITS_PER_METER; }
}
