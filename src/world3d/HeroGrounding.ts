import type { Vec2 } from '../gameplay/ArenaTypes';
import { sampleGroundHeight, sampleGroundHeightAtSimulation } from './HybridGroundSampler';

export const HERO_FOOT_CLEARANCE = .035;

export function heroRenderY(worldX: number, worldZ: number, locomotionOffset = 0): number {
  return sampleGroundHeight(worldX, worldZ) + HERO_FOOT_CLEARANCE + Math.max(0, locomotionOffset);
}

export function heroRenderYAtSimulation(point: Vec2, locomotionOffset = 0): number {
  return sampleGroundHeightAtSimulation(point) + HERO_FOOT_CLEARANCE + Math.max(0, locomotionOffset);
}

export class HeroGroundingController {
  groundHeight = 0;
  private initialized = false;

  update(worldX: number, worldZ: number, deltaMs: number, locomotionOffset = 0): number {
    const sampled = sampleGroundHeight(worldX, worldZ);
    if (!this.initialized || sampled >= this.groundHeight) {
      this.groundHeight = sampled;
      this.initialized = true;
    } else {
      const dt = Math.min(.05, Math.max(0, deltaMs) / 1000);
      this.groundHeight += (sampled - this.groundHeight) * (1 - Math.exp(-dt * 10));
    }
    return this.groundHeight + HERO_FOOT_CLEARANCE + Math.max(0, locomotionOffset);
  }

  reset(worldX: number, worldZ: number): void {
    this.groundHeight = sampleGroundHeight(worldX, worldZ);
    this.initialized = true;
  }
}
