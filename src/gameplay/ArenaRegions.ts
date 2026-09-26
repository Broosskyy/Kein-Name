import type { Vec2 } from './ArenaTypes';

export type ArenaRegionId = 'core-approach' | 'shattered-ground' | 'crystal-field' | 'ruined-pillars' | 'corrupted-edge' | 'ember-zone';

export interface ArenaRegionDefinition {
  id: ArenaRegionId;
  center: Vec2;
  radius: Vec2;
  ground: number;
  accent: number;
  fog: number;
}

export const ARENA_REGIONS: readonly ArenaRegionDefinition[] = [
  { id: 'core-approach', center: { x: 1600, y: 470 }, radius: { x: 720, y: 420 }, ground: 0x231a24, accent: 0xff7a35, fog: 0x7b3541 },
  { id: 'shattered-ground', center: { x: 1550, y: 1120 }, radius: { x: 840, y: 520 }, ground: 0x171724, accent: 0x8d6c75, fog: 0x35354d },
  { id: 'crystal-field', center: { x: 530, y: 930 }, radius: { x: 650, y: 690 }, ground: 0x15192b, accent: 0x56d9ff, fog: 0x334c72 },
  { id: 'ruined-pillars', center: { x: 2600, y: 900 }, radius: { x: 610, y: 670 }, ground: 0x1e1924, accent: 0xb18b6c, fog: 0x51404e },
  { id: 'corrupted-edge', center: { x: 760, y: 1540 }, radius: { x: 760, y: 470 }, ground: 0x17121f, accent: 0x9e48e8, fog: 0x432857 },
  { id: 'ember-zone', center: { x: 2550, y: 1510 }, radius: { x: 760, y: 470 }, ground: 0x21151a, accent: 0xff7b35, fog: 0x663128 },
] as const;

export function arenaRegionAt(position: Vec2): ArenaRegionDefinition {
  let best = ARENA_REGIONS[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const region of ARENA_REGIONS) {
    const dx = (position.x - region.center.x) / region.radius.x;
    const dy = (position.y - region.center.y) / region.radius.y;
    const score = dx * dx + dy * dy;
    if (score < bestScore) { best = region; bestScore = score; }
  }
  return best;
}

export const BOSS_WORLD_ANCHOR: Readonly<Vec2> = { x: 1600, y: 170 };
export const BOSS_ZONE_RADIUS = 390;

export function constrainOutsideBossZone(position: Vec2): Vec2 {
  const dx = position.x - BOSS_WORLD_ANCHOR.x;
  const dy = position.y - BOSS_WORLD_ANCHOR.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: BOSS_WORLD_ANCHOR.x, y: BOSS_WORLD_ANCHOR.y + BOSS_ZONE_RADIUS };
  if (distance >= BOSS_ZONE_RADIUS) return position;
  const factor = BOSS_ZONE_RADIUS / distance;
  return { x: BOSS_WORLD_ANCHOR.x + dx * factor, y: BOSS_WORLD_ANCHOR.y + dy * factor };
}
