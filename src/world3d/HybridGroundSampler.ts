import type { Vec2 } from '../gameplay/ArenaTypes';
import { WORLD3D_UNITS_PER_METER } from './World3DTypes';

export type WalkableSurfaceId = 'base-ground' | 'lower-approach' | 'approach-ramp' | 'approach-platform' | 'paving-slabs' | 'boss-basin' | 'inner-basin' | 'west-shelf' | 'east-shelf' | 'southwest-shelf' | 'southeast-shelf';
export interface WalkableSurfaceSample { surfaceId: WalkableSurfaceId; height: number }

/** Mirrors the authored walkable surfaces in HybridWorldRenderer. Rendering
 * consumes this height model; gameplay X/Z remains independent. */
export function sampleGroundHeight(worldX: number, worldZ: number): number {
  return sampleWalkableSurface(worldX, worldZ).height;
}

/** Single authored truth for movement, collision decisions, rendering and
 * shadows. All heights are the actual top faces of HybridWorldRenderer meshes. */
export function sampleWalkableSurface(worldX: number, worldZ: number): WalkableSurfaceSample {
  let sample: WalkableSurfaceSample = { surfaceId: 'base-ground', height: sampleBaseTerrainHeight(worldX, worldZ) };
  const use = (surfaceId: WalkableSurfaceId, height: number): void => {
    if (height >= sample.height) sample = { surfaceId, height };
  };

  // Lower approach and inset path.
  if (insideBox(worldX, worldZ, 0, 3.05, 3.1, 5.25)) use('lower-approach', .10);
  if (insideBox(worldX, worldZ, 0, 4.55, 2.55, 1.1)) {
    const progress = clamp01((5.65 - worldZ) / 2.2);
    use('approach-ramp', .10 + progress * .125);
  }
  if (insideBox(worldX, worldZ, 0, 3.0, 2.25, 5.1)) use('approach-platform', .16);

  // Broken paving corridor. Individual visual slabs share one predictable
  // walkable surface so the Hero does not pop between tiny seams.
  if (insideBox(worldX, worldZ, 0, 3.2, 2.55, 4.55)) use('paving-slabs', .225);

  // Colossus basin and its inner fighting platform.
  const basinDistance = Math.hypot(worldX, worldZ + 3.8);
  if (basinDistance <= 5.15) use('boss-basin', .16);
  if (basinDistance <= 3.7) use('inner-basin', .24);

  // Authored side shelves. Rotational differences are intentionally absorbed
  // into broad deterministic surfaces for stable mobile locomotion.
  for (const shelf of WALKABLE_SHELVES) {
    if (insideBox(worldX, worldZ, shelf.x, shelf.z, shelf.halfWidth, shelf.halfDepth)) {
      use(shelf.id, shelf.top);
    }
  }
  return sample;
}

export function sampleGroundHeightAtSimulation(point: Vec2): number {
  return sampleGroundHeight(point.x / WORLD3D_UNITS_PER_METER, point.y / WORLD3D_UNITS_PER_METER);
}

export function sampleWalkableSurfaceAtSimulation(point: Vec2): WalkableSurfaceSample {
  return sampleWalkableSurface(point.x / WORLD3D_UNITS_PER_METER, point.y / WORLD3D_UNITS_PER_METER);
}

export function sampleBaseTerrainHeight(worldX: number, worldZ: number): number {
  const halfExtent = 11;
  const edge = Math.max(Math.abs(worldX) / halfExtent, Math.abs(worldZ) / halfExtent);
  const basinFalloff = Math.max(0, 1 - Math.hypot(worldX, worldZ + 3.8) / 6.5);
  return Math.sin(worldX * 1.25) * .035
    + Math.cos(worldZ * 1.08) * .03
    - basinFalloff * .12
    - Math.max(0, edge - .78) * .7;
}

const WALKABLE_SHELVES = [
  { id: 'west-shelf', x: -7.8, z: -5.7, halfWidth: 1.9, halfDepth: 2.25, top: .33 },
  { id: 'east-shelf', x: 7.7, z: -5.4, halfWidth: 1.95, halfDepth: 2.1, top: .41 },
  { id: 'southwest-shelf', x: -8.0, z: 5.7, halfWidth: 1.65, halfDepth: 2.4, top: .21 },
  { id: 'southeast-shelf', x: 8.1, z: 5.5, halfWidth: 1.75, halfDepth: 2.3, top: .27 },
] as const;

function insideBox(x: number, z: number, centerX: number, centerZ: number, halfWidth: number, halfDepth: number): boolean {
  return Math.abs(x - centerX) <= halfWidth && Math.abs(z - centerZ) <= halfDepth;
}
function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
