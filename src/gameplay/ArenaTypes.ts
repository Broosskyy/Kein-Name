import type { EvolutionId, Mutation } from '../types';
import { GAME_CONFIG } from '../config';

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

export const ARENA_BOUNDS = { minX: 160, maxX: 3040, minY: 180, maxY: 1620 } as const;

export function clampToArena(position: Vec2): Vec2 {
  return {
    x: Math.max(ARENA_BOUNDS.minX, Math.min(ARENA_BOUNDS.maxX, position.x)),
    y: Math.max(ARENA_BOUNDS.minY, Math.min(ARENA_BOUNDS.maxY, position.y)),
  };
}

export function createLocalPlayer(entityId: string, guestId: string): CombatEntityState {
  const stats: CombatStats = {
    maxHp: GAME_CONFIG.arena.playerMaxHp, moveSpeed: GAME_CONFIG.arena.playerSpeed, damageMultiplier: 1, attackRateMultiplier: 1,
    projectileCount: 1, projectileScale: 1, pickupRadius: GAME_CONFIG.arena.pickupRadius, mitigation: 0, xpMultiplier: 1,
  };
  return {
    entityId, kind: 'local-player', playerId: guestId, displayName: 'YOU',
    position: { x: 1600, y: 1220 }, velocity: { x: 0, y: 0 }, facing: 'right',
    hp: stats.maxHp, maxHp: stats.maxHp, invulnerableMs: 0, mutationIds: [],
    equippedRunItemIds: [], cosmeticIds: [], buffIds: [], stats, isOnlinePlayer: false,
  };
}

export function createDummyAlly(index: number): CombatEntityState {
  const entity = createLocalPlayer(`dummy-${index}`, `dev-dummy-${index}`);
  entity.kind = 'dummy-ally';
  entity.displayName = `DEV ALLY ${index}`;
  const angle = (index - 1) / 7 * Math.PI * 2;
  entity.position = { x: 1600 + Math.cos(angle) * 620, y: 1050 + Math.sin(angle) * 360 };
  return entity;
}
