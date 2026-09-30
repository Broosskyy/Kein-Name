import type { Vec2 } from '../gameplay/ArenaTypes';
import { sampleGroundHeight, sampleGroundHeightAtSimulation, sampleWalkableSurface, type WalkableSurfaceId } from './HybridGroundSampler';

export const HERO_FOOT_CLEARANCE = .035;

export function heroRenderY(worldX: number, worldZ: number, locomotionOffset = 0): number {
  return sampleGroundHeight(worldX, worldZ) + HERO_FOOT_CLEARANCE + Math.max(0, locomotionOffset);
}

export function heroRenderYAtSimulation(point: Vec2, locomotionOffset = 0): number {
  return sampleGroundHeightAtSimulation(point) + HERO_FOOT_CLEARANCE + Math.max(0, locomotionOffset);
}

export class HeroGroundingController {
  groundHeight = 0;
  renderY = HERO_FOOT_CLEARANCE;
  surfaceId: WalkableSurfaceId = 'base-ground';
  private initialized = false;

  update(worldX: number, worldZ: number, deltaMs: number, locomotionOffset = 0): number {
    const surface = sampleWalkableSurface(worldX, worldZ);
    const sampled = surface.height;
    this.surfaceId = surface.surfaceId;
    if (!this.initialized || sampled >= this.groundHeight) {
      this.groundHeight = sampled;
      this.initialized = true;
    } else {
      const dt = Math.min(.05, Math.max(0, deltaMs) / 1000);
      this.groundHeight += (sampled - this.groundHeight) * (1 - Math.exp(-dt * 10));
    }
    this.renderY = this.groundHeight + HERO_FOOT_CLEARANCE + Math.max(0, locomotionOffset);
    return this.renderY;
  }

  reset(worldX: number, worldZ: number): void {
    const surface = sampleWalkableSurface(worldX, worldZ);
    this.groundHeight = surface.height;
    this.surfaceId = surface.surfaceId;
    this.renderY = this.groundHeight + HERO_FOOT_CLEARANCE;
    this.initialized = true;
  }
}
