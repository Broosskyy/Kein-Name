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

    const facingVector = attacking && aimDirection && Math.hypot(aimDirection.x, aimDirection.y) > 1 ? aimDirection : velocity;
    const candidate = stableDirectionCandidate(facingVector, this.direction, speed, attacking);
    if (candidate !== this.direction && this.directionLockMs <= 0) {
      this.direction = candidate;
      this.directionLockMs = 90;
      this.directionChanges += 1;
    }

    const nextPose: HeroPose = dashing ? 'dash' : attacking ? 'attack' : this.running ? 'run' : 'idle';
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
  return distanceFromCurrent >= Math.PI / 8 + .13 ? candidate : current;
}

const DIRECTION_ANGLES: Readonly<Record<HeroDirection, number>> = {
  e: 0, se: Math.PI / 4, s: Math.PI / 2, sw: Math.PI * 3 / 4,
  w: Math.PI, nw: -Math.PI * 3 / 4, n: -Math.PI / 2, ne: -Math.PI / 4,
};
function shortestAngle(angle: number): number { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
