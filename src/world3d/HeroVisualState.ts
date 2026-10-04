import type { Vec2 } from '../gameplay/ArenaTypes';
import { heroDirectionFromVector, type HeroDirection, type HeroPose } from '../gameplay/HeroDirection';

export interface HeroVisualSnapshot {
  direction: HeroDirection;
  pose: HeroPose;
  directionChangesPerSecond: number;
  poseChangesPerSecond: number;
  textureSwapsPerSecond: number;
}

export class HeroVisualState {
  direction: HeroDirection = 'n';
  pose: HeroPose = 'idle';
  private running = false;
  private directionLockMs = 0;
  private wasAttacking = false;
  private attackDirection: HeroDirection = 'n';
  private pendingDirection?: HeroDirection;
  private pendingDirectionMs = 0;
  private metricWindowMs = 0;
  private directionChanges = 0;
  private poseChanges = 0;
  private textureSwaps = 0;
  private rates = { direction: 0, pose: 0, texture: 0 };

  update(deltaMs: number, velocity: Vec2, dashing: boolean, attacking: boolean, aimDirection?: Vec2): HeroVisualSnapshot {
    this.directionLockMs = Math.max(0, this.directionLockMs - deltaMs);
    const speed = Math.hypot(velocity.x, velocity.y);
    if (!this.running && speed >= 34) this.running = true;
    else if (this.running && speed <= 18) this.running = false;

    if (attacking && !this.wasAttacking) {
      // While moving, preserve locomotion facing. Auto attack projectiles can
      // still target the Boss independently without turning the authored Hero
      // cutout away from the player's current movement every few frames.
      const attackVector = speed > 45 ? velocity : aimDirection && Math.hypot(aimDirection.x, aimDirection.y) > 1 ? aimDirection : velocity;
      this.attackDirection = stableDirectionCandidate(attackVector, this.direction, Math.max(speed, 23), true);
      if (this.attackDirection !== this.direction) {
        this.direction = this.attackDirection;
        this.directionChanges += 1;
      }
      this.directionLockMs = Math.max(this.directionLockMs, 180);
    } else if (!attacking && this.wasAttacking) {
      this.directionLockMs = Math.max(this.directionLockMs, 160);
    }
    this.wasAttacking = attacking;
    const facingVector = attacking ? DIRECTION_VECTORS[this.attackDirection] : velocity;
    const candidate = attacking ? this.attackDirection : stableDirectionCandidate(facingVector, this.direction, speed, false);
    if (!attacking && candidate !== this.direction && this.directionLockMs <= 0) {
      if (candidate !== this.pendingDirection) { this.pendingDirection = candidate; this.pendingDirectionMs = 0; }
      this.pendingDirectionMs += Math.max(0, deltaMs);
      if (this.pendingDirectionMs >= 85) {
        this.direction = candidate;
        this.directionLockMs = 190;
        this.pendingDirection = undefined;
        this.pendingDirectionMs = 0;
        this.directionChanges += 1;
      }
    } else if (candidate === this.direction || attacking) {
      this.pendingDirection = undefined;
      this.pendingDirectionMs = 0;
    }

    // Keep locomotion visually continuous while an auto-attack launches. The
    // world-space muzzle flash and projectile communicate the moving shot;
    // swapping the entire cutout to a planted attack pose every 760 ms caused
    // the severe run/attack popping seen in real-device QA.
    const nextPose: HeroPose = dashing ? 'dash' : attacking && !this.running ? 'attack' : this.running ? 'run' : 'idle';
    if (nextPose !== this.pose) { this.pose = nextPose; this.poseChanges += 1; }
    this.metricWindowMs += deltaMs;
    if (this.metricWindowMs >= 1000) {
      const seconds = this.metricWindowMs / 1000;
      this.rates = { direction: this.directionChanges / seconds, pose: this.poseChanges / seconds, texture: this.textureSwaps / seconds };
      this.metricWindowMs = 0; this.directionChanges = 0; this.poseChanges = 0; this.textureSwaps = 0;
    }
    return this.snapshot();
  }

  recordTextureSwap(): void { this.textureSwaps += 1; }
  snapshot(): HeroVisualSnapshot {
    return {
      direction: this.direction,
      pose: this.pose,
      directionChangesPerSecond: this.rates.direction,
      poseChangesPerSecond: this.rates.pose,
      textureSwapsPerSecond: this.rates.texture,
    };
  }
}

function stableDirectionCandidate(vector: Vec2, current: HeroDirection, speed: number, attacking: boolean): HeroDirection {
  if (!attacking && speed < 22) return current;
  const candidate = heroDirectionFromVector(vector, current, .12);
  if (candidate === current) return current;
  const currentAngle = DIRECTION_ANGLES[current];
  const inputAngle = Math.atan2(vector.y, vector.x);
  const distanceFromCurrent = Math.abs(shortestAngle(inputAngle - currentAngle));
  // An octant normally changes at 22.5°. Extra hysteresis prevents velocity
  // noise from oscillating between adjacent authored sprites.
  return distanceFromCurrent >= Math.PI / 8 + .2 ? candidate : current;
}

const DIRECTION_ANGLES: Readonly<Record<HeroDirection, number>> = {
  e: 0, se: Math.PI / 4, s: Math.PI / 2, sw: Math.PI * 3 / 4,
  w: Math.PI, nw: -Math.PI * 3 / 4, n: -Math.PI / 2, ne: -Math.PI / 4,
};
const DIRECTION_VECTORS: Readonly<Record<HeroDirection, Vec2>> = {
  e: { x: 1, y: 0 }, se: { x: 1, y: 1 }, s: { x: 0, y: 1 }, sw: { x: -1, y: 1 },
  w: { x: -1, y: 0 }, nw: { x: -1, y: -1 }, n: { x: 0, y: -1 }, ne: { x: 1, y: -1 },
};
function shortestAngle(angle: number): number { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
