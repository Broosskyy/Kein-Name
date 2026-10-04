import type { Vec2 } from './ArenaTypes';

export type HeroDirection = 'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
export type HeroPose = 'idle'|'run'|'dash'|'attack';

const DIRECTIONS: readonly HeroDirection[] = ['e','se','s','sw','w','nw','n','ne'];
const DIRECTION_ANGLES: Readonly<Record<HeroDirection, number>> = {
  e: 0, se: Math.PI / 4, s: Math.PI / 2, sw: Math.PI * 3 / 4,
  w: Math.PI, nw: -Math.PI * 3 / 4, n: -Math.PI / 2, ne: -Math.PI / 4,
};

/** Maps simulation velocity to one of eight authored views. World Y grows south. */
export function heroDirectionFromVector(vector: Vec2, previous: HeroDirection = 's', deadzone = .12): HeroDirection {
  if (Math.hypot(vector.x, vector.y) <= deadzone) return previous;
  const octant = Math.round(Math.atan2(vector.y, vector.x) / (Math.PI / 4));
  return DIRECTIONS[(octant + 8) % 8];
}

/**
 * Selects the authored billboard view for a world-facing Hero and a local
 * camera orbit. Gameplay facing remains world-authoritative; only the render
 * view changes. At yaw 0 the authored/world directions are identical.
 */
export function cameraRelativeHeroDirection(worldDirection: HeroDirection, cameraYaw: number): HeroDirection {
  const angle = DIRECTION_ANGLES[worldDirection] + cameraYaw;
  return DIRECTIONS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}

/** Keeps camera-orbit view changes from flickering on authored octant edges. */
export function stableCameraRelativeHeroDirection(
  worldDirection: HeroDirection,
  cameraYaw: number,
  current: HeroDirection,
  margin = .12,
): HeroDirection {
  const relativeAngle = DIRECTION_ANGLES[worldDirection] + cameraYaw;
  const distanceFromCurrent = Math.abs(Math.atan2(
    Math.sin(relativeAngle - DIRECTION_ANGLES[current]),
    Math.cos(relativeAngle - DIRECTION_ANGLES[current]),
  ));
  if (distanceFromCurrent < Math.PI / 8 + margin) return current;
  return cameraRelativeHeroDirection(worldDirection, cameraYaw);
}

export function heroDirectionAsset(direction: HeroDirection, pose: HeroPose): `creature.direction.${HeroDirection}.${HeroPose}` {
  return `creature.direction.${direction}.${pose}`;
}

export function evo1HeroDirectionAsset(direction: HeroDirection, pose: HeroPose): `creature.evo1.direction.${HeroDirection}.${HeroPose}` {
  return `creature.evo1.direction.${direction}.${pose}`;
}
