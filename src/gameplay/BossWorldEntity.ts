import type { Vec2 } from './ArenaTypes';

export type BossSector = 'front' | 'left-flank' | 'right-flank' | 'rear';
export type BossDistanceZone = 'near' | 'mid' | 'far';

export interface BossRelativePosition {
  angle: number;
  signedAngle: number;
  distance: number;
  sector: BossSector;
  distanceZone: BossDistanceZone;
}

export interface BossWorldSnapshot { position: Vec2; orientation: number }

export class BossWorldEntity {
  position: Vec2;
  orientation = Math.PI / 2;
  readonly footprint = { radiusX: 520, radiusY: 360 };
  readonly nearRadius = 900;
  readonly midRadius = 1800;
  private readonly turnSpeed = 0.38;

  constructor(position: Vec2) { this.position = { ...position }; }

  update(deltaMs: number, target: Vec2): void {
    const desired = Math.atan2(target.y - this.position.y, target.x - this.position.x);
    const difference = shortestAngle(desired - this.orientation);
    const maxTurn = this.turnSpeed * deltaMs / 1000;
    this.orientation += clamp(difference, -maxTurn, maxTurn);
  }

  relativeTo(point: Vec2): BossRelativePosition {
    const dx = point.x - this.position.x, dy = point.y - this.position.y;
    const angle = Math.atan2(dy, dx);
    const signedAngle = shortestAngle(angle - this.orientation);
    const absolute = Math.abs(signedAngle);
    const sector: BossSector = absolute <= Math.PI / 3 ? 'front'
      : absolute >= Math.PI * 2 / 3 ? 'rear'
        : signedAngle < 0 ? 'left-flank' : 'right-flank';
    const distance = Math.hypot(dx, dy);
    return { angle, signedAngle, distance, sector, distanceZone: distance < this.nearRadius ? 'near' : distance < this.midRadius ? 'mid' : 'far' };
  }

  constrain(position: Vec2, padding = 46): Vec2 {
    const dx = position.x - this.position.x, dy = position.y - this.position.y;
    const rx = this.footprint.radiusX + padding, ry = this.footprint.radiusY + padding;
    const normalized = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    if (normalized >= 1) return position;
    if (Math.abs(dx) + Math.abs(dy) < .001) return { x: this.position.x, y: this.position.y + ry };
    const factor = 1 / Math.sqrt(normalized);
    return { x: this.position.x + dx * factor, y: this.position.y + dy * factor };
  }

  snapshot(): BossWorldSnapshot { return { position: { ...this.position }, orientation: this.orientation }; }
  restore(snapshot?: BossWorldSnapshot): void { if (!snapshot) return; this.position = { ...snapshot.position }; this.orientation = snapshot.orientation; }
}

function shortestAngle(angle: number): number { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
