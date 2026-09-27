import type { Vec2 } from '../gameplay/ArenaTypes';
import { isCircleCollider, type WorldCollider3D } from './World3DTypes';

export class HybridCollisionSystem {
  constructor(
    private readonly width: number,
    private readonly depth: number,
    private readonly colliders: readonly WorldCollider3D[],
    private readonly actorRadius = 38,
  ) {}

  resolve(position: Vec2): Vec2 {
    let resolved = {
      x: clamp(position.x, -this.width / 2 + this.actorRadius, this.width / 2 - this.actorRadius),
      y: clamp(position.y, -this.depth / 2 + this.actorRadius, this.depth / 2 - this.actorRadius),
    };
    for (const collider of this.colliders) resolved = isCircleCollider(collider)
      ? resolveCircle(resolved, collider.center, collider.radius + this.actorRadius)
      : resolveBox(resolved, collider.center, collider.halfWidth + this.actorRadius, collider.halfDepth + this.actorRadius);
    return {
      x: clamp(resolved.x, -this.width / 2 + this.actorRadius, this.width / 2 - this.actorRadius),
      y: clamp(resolved.y, -this.depth / 2 + this.actorRadius, this.depth / 2 - this.actorRadius),
    };
  }
}

function resolveCircle(point: Vec2, center: Vec2, radius: number): Vec2 {
  const dx = point.x - center.x, dy = point.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return point;
  if (distance < .001) return { x: center.x + radius, y: center.y };
  return { x: center.x + dx / distance * radius, y: center.y + dy / distance * radius };
}

function resolveBox(point: Vec2, center: Vec2, halfWidth: number, halfDepth: number): Vec2 {
  const dx = point.x - center.x, dy = point.y - center.y;
  if (Math.abs(dx) >= halfWidth || Math.abs(dy) >= halfDepth) return point;
  const xPenetration = halfWidth - Math.abs(dx), yPenetration = halfDepth - Math.abs(dy);
  return xPenetration < yPenetration
    ? { x: center.x + Math.sign(dx || 1) * halfWidth, y: point.y }
    : { x: point.x, y: center.y + Math.sign(dy || 1) * halfDepth };
}

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
