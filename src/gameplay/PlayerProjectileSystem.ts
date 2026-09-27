import type { Vec2 } from './ArenaTypes';

export type PlayerProjectileKind = 'normal' | 'power';
export type PlayerProjectilePhase = 'flight' | 'impact';

export interface PlayerProjectile {
  id: string;
  kind: PlayerProjectileKind;
  position: Vec2;
  sourcePosition: Vec2;
  targetPosition: Vec2;
  velocity: Vec2;
  height: number;
  radius: number;
  ageMs: number;
  lifetimeMs: number;
  damage: number;
  phase: PlayerProjectilePhase;
  visualType: 'bolt' | 'power-core';
}

export interface PlayerProjectileImpact {
  id: string;
  projectileId: string;
  kind: PlayerProjectileKind;
  position: Vec2;
  height: number;
  damage: number;
}

export class PlayerProjectileSystem {
  readonly active: PlayerProjectile[] = [];
  private sequence = 0;

  get hasPendingPower(): boolean { return this.active.some((projectile) => projectile.kind === 'power' && projectile.phase === 'flight'); }

  launch(kind: PlayerProjectileKind, source: Vec2, target: Vec2, damage: number): PlayerProjectile | undefined {
    if (kind === 'power' && this.hasPendingPower) return undefined;
    const dx = target.x - source.x, dy = target.y - source.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = kind === 'power' ? 1280 : 1680;
    const projectile: PlayerProjectile = {
      id: `player-projectile-${++this.sequence}`,
      kind,
      position: { ...source },
      sourcePosition: { ...source },
      targetPosition: { ...target },
      velocity: { x: dx / distance * speed, y: dy / distance * speed },
      height: kind === 'power' ? 145 : 115,
      radius: kind === 'power' ? 46 : 24,
      ageMs: 0,
      lifetimeMs: distance / speed * 1000 + 420,
      damage: Math.max(0, Math.round(damage)),
      phase: 'flight',
      visualType: kind === 'power' ? 'power-core' : 'bolt',
    };
    this.active.push(projectile);
    return projectile;
  }

  update(deltaMs: number, bossPosition: Vec2, bossRadius = 230): PlayerProjectileImpact[] {
    const impacts: PlayerProjectileImpact[] = [];
    const dt = Math.max(0, Math.min(50, deltaMs)) / 1000;
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const projectile = this.active[index];
      if (projectile.phase !== 'flight') continue;
      projectile.ageMs += deltaMs;
      projectile.position.x += projectile.velocity.x * dt;
      projectile.position.y += projectile.velocity.y * dt;
      const progress = Math.min(1, projectile.ageMs / Math.max(1, projectile.lifetimeMs));
      projectile.height = (projectile.kind === 'power' ? 145 : 115) + Math.sin(progress * Math.PI) * (projectile.kind === 'power' ? 115 : 70);
      const hitDistance = bossRadius + projectile.radius;
      if (Math.hypot(projectile.position.x - bossPosition.x, projectile.position.y - bossPosition.y) <= hitDistance) {
        projectile.phase = 'impact';
        impacts.push({ id: `impact-${projectile.id}`, projectileId: projectile.id, kind: projectile.kind, position: { ...projectile.position }, height: projectile.height, damage: projectile.damage });
        this.active.splice(index, 1);
      } else if (projectile.ageMs >= projectile.lifetimeMs) {
        this.active.splice(index, 1);
      }
    }
    return impacts;
  }

  reset(): void { this.active.length = 0; this.sequence = 0; }
}
