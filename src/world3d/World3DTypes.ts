import type { Vec2 } from '../gameplay/ArenaTypes';

export const WORLD3D_UNITS_PER_METER = 100;

export interface SpatialPoint { x: number; y: number; z: number }
export interface CircleCollider3D { id: string; center: Vec2; radius: number }
export interface BoxCollider3D { id: string; center: Vec2; halfWidth: number; halfDepth: number }
export type WorldCollider3D = CircleCollider3D | BoxCollider3D;

export function simulationToWorld3D(point: Vec2, elevation = 0): SpatialPoint {
  return { x: point.x / WORLD3D_UNITS_PER_METER, y: elevation / WORLD3D_UNITS_PER_METER, z: point.y / WORLD3D_UNITS_PER_METER };
}

export function world3DToSimulation(point: SpatialPoint): Vec2 {
  return { x: point.x * WORLD3D_UNITS_PER_METER, y: point.z * WORLD3D_UNITS_PER_METER };
}

export function isCircleCollider(collider: WorldCollider3D): collider is CircleCollider3D {
  return 'radius' in collider;
}
