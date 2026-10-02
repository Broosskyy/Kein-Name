import type { Vec2 } from './ArenaTypes';

export type HeroDirection = 'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
export type HeroPose = 'idle'|'run'|'dash'|'attack';

const DIRECTIONS: readonly HeroDirection[] = ['e','se','s','sw','w','nw','n','ne'];

/** Maps simulation velocity to one of eight authored views. World Y grows south. */
export function heroDirectionFromVector(vector: Vec2, previous: HeroDirection = 's', deadzone = .12): HeroDirection {
  if (Math.hypot(vector.x, vector.y) <= deadzone) return previous;
  const octant = Math.round(Math.atan2(vector.y, vector.x) / (Math.PI / 4));
  return DIRECTIONS[(octant + 8) % 8];
}

export function heroDirectionAsset(direction: HeroDirection, pose: HeroPose): `creature.direction.${HeroDirection}.${HeroPose}` {
  return `creature.direction.${direction}.${pose}`;
}

export function evo1HeroDirectionAsset(direction: HeroDirection, pose: HeroPose): `creature.evo1.direction.${HeroDirection}.${HeroPose}` {
  return `creature.evo1.direction.${direction}.${pose}`;
}
