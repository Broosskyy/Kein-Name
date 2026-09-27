import type { Vec2 } from '../gameplay/ArenaTypes';
import { WORLD3D_UNITS_PER_METER } from './World3DTypes';

/** Mirrors the authored walkable surfaces in HybridWorldRenderer. Rendering
 * consumes this height model; gameplay X/Z remains independent. */
export function sampleGroundHeight(worldX: number, worldZ: number): number {
  let height = sampleBaseTerrainHeight(worldX, worldZ);

  // Lower approach and inset path.
  if (insideBox(worldX, worldZ, 0, 3.05, 3.1, 5.25)) height = Math.max(height, .10);
  if (insideBox(worldX, worldZ, 0, 3.0, 2.25, 5.1)) height = Math.max(height, .16);

  // Broken paving corridor. Individual visual slabs share one predictable
  // walkable surface so the Hero does not pop between tiny seams.
  if (insideBox(worldX, worldZ, 0, 3.2, 2.55, 4.55)) height = Math.max(height, .225);

  // Colossus basin and its inner fighting platform.
  const basinDistance = Math.hypot(worldX, worldZ + 3.8);
  if (basinDistance <= 5.15) height = Math.max(height, .16);
  if (basinDistance <= 3.7) height = Math.max(height, .24);

  // Authored side shelves. Rotational differences are intentionally absorbed
  // into broad deterministic surfaces for stable mobile locomotion.
  for (const shelf of WALKABLE_SHELVES) {
    if (insideBox(worldX, worldZ, shelf.x, shelf.z, shelf.halfWidth, shelf.halfDepth)) {
      height = Math.max(height, shelf.top);
    }
  }
  return height;
}

export function sampleGroundHeightAtSimulation(point: Vec2): number {
  return sampleGroundHeight(point.x / WORLD3D_UNITS_PER_METER, point.y / WORLD3D_UNITS_PER_METER);
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
  { x: -7.8, z: -5.7, halfWidth: 1.9, halfDepth: 2.25, top: .33 },
  { x: 7.7, z: -5.4, halfWidth: 1.95, halfDepth: 2.1, top: .41 },
  { x: -8.0, z: 5.7, halfWidth: 1.65, halfDepth: 2.4, top: .21 },
  { x: 8.1, z: 5.5, halfWidth: 1.75, halfDepth: 2.3, top: .27 },
] as const;

function insideBox(x: number, z: number, centerX: number, centerZ: number, halfWidth: number, halfDepth: number): boolean {
  return Math.abs(x - centerX) <= halfWidth && Math.abs(z - centerZ) <= halfDepth;
}
