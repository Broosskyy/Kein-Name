import type { Vec2 } from '../gameplay/ArenaTypes';
import { sampleGroundHeight, sampleGroundHeightAtSimulation } from './HybridGroundSampler';

export const HERO_FOOT_CLEARANCE = .035;

export function heroRenderY(worldX: number, worldZ: number, locomotionOffset = 0): number {
  return sampleGroundHeight(worldX, worldZ) + HERO_FOOT_CLEARANCE + Math.max(0, locomotionOffset);
}

export function heroRenderYAtSimulation(point: Vec2, locomotionOffset = 0): number {
  return sampleGroundHeightAtSimulation(point) + HERO_FOOT_CLEARANCE + Math.max(0, locomotionOffset);
}
