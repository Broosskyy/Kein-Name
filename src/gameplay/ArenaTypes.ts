import type { EvolutionId, Mutation } from '../types';

export interface Vec2 { x: number; y: number }
export type Facing = 'left' | 'right';
export type EntityKind = 'local-player' | 'dummy-ally' | 'pet';

export interface CombatStats {
  maxHp: number;
  moveSpeed: number;
  damageMultiplier: number;
  attackRateMultiplier: number;
  projectileCount: number;
  projectileScale: number;
  pickupRadius: number;
  mitigation: number;
  xpMultiplier: number;
}

export interface CombatEntityState {
  entityId: string;
  kind: EntityKind;
  playerId?: string;
  displayName: string;
  position: Vec2;
  velocity: Vec2;
  facing: Facing;
  hp: number;
  maxHp: number;
  invulnerableMs: number;
  mutationIds: Mutation[];
  evolutionId?: EvolutionId;
  equippedRunItemIds: string[];
  petId?: string;
  cosmeticIds: string[];
  buffIds: string[];
  stats: CombatStats;
  isOnlinePlayer: false;
}

export interface MovementInput { x: number; y: number }

export const ARENA_BOUNDS = { minX: 70, maxX: 930, minY: 65, maxY: 430 } as const;

export function clampToArena(position: Vec2): Vec2 {
  return {
    x: Math.max(ARENA_BOUNDS.minX, Math.min(ARENA_BOUNDS.maxX, position.x)),
    y: Math.max(ARENA_BOUNDS.minY, Math.min(ARENA_BOUNDS.maxY, position.y)),
  };
}

export function createLocalPlayer(entityId: string, guestId: string): CombatEntityState {
  const stats: CombatStats = {
    maxHp: 100, moveSpeed: 310, damageMultiplier: 1, attackRateMultiplier: 1,
    projectileCount: 1, projectileScale: 1, pickupRadius: 58, mitigation: 0, xpMultiplier: 1,
  };
  return {
    entityId, kind: 'local-player', playerId: guestId, displayName: 'YOU',
    position: { x: 500, y: 340 }, velocity: { x: 0, y: 0 }, facing: 'right',
    hp: stats.maxHp, maxHp: stats.maxHp, invulnerableMs: 0, mutationIds: [],
    equippedRunItemIds: [], cosmeticIds: [], buffIds: [], stats, isOnlinePlayer: false,
  };
}

export function createDummyAlly(index: number): CombatEntityState {
  const entity = createLocalPlayer(`dummy-${index}`, `dev-dummy-${index}`);
  entity.kind = 'dummy-ally';
  entity.displayName = `DEV ALLY ${index}`;
  entity.position = { x: 280 + (index % 4) * 150, y: 250 + Math.floor(index / 4) * 90 };
  return entity;
}
