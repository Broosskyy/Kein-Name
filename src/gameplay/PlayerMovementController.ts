import type { CombatEntityState, MovementInput, Vec2 } from './ArenaTypes';

export interface MovementTuning {
  acceleration: number;
  deceleration: number;
  turnAcceleration: number;
  dashSpeed: number;
  dashDurationMs: number;
  deadZone: number;
}

export interface MovementFrame {
  inputMagnitude: number;
  speedRatio: number;
  accelerationRatio: number;
  braking: boolean;
  turning: number;
  dashing: boolean;
  dashProgress: number;
}

const DEFAULT_TUNING: MovementTuning = {
  acceleration: 4200, deceleration: 6100, turnAcceleration: 7600,
  dashSpeed: 2500, dashDurationMs: 210, deadZone: .12,
};

export class PlayerMovementController {
  readonly tuning: MovementTuning;
  lastDirection: Vec2 = { x: 0, y: -1 };
  private dashRemainingMs = 0;
  private dashDirection: Vec2 = { x: 0, y: -1 };

  constructor(tuning: Partial<MovementTuning> = {}) { this.tuning = { ...DEFAULT_TUNING, ...tuning }; }
  get isDashing(): boolean { return this.dashRemainingMs > 0; }

  startDash(input: MovementInput): boolean {
    if (this.isDashing) return false;
    const normalized = normalizeInput(input, this.tuning.deadZone);
    this.dashDirection = normalized.magnitude > 0 ? normalized.direction : { ...this.lastDirection };
    this.dashRemainingMs = this.tuning.dashDurationMs;
    return true;
  }

  update(entity: CombatEntityState, input: MovementInput, deltaMs: number, constrain: (position: Vec2) => Vec2): MovementFrame {
    const dt = Math.max(0, deltaMs) / 1000;
    const previousVelocity = { ...entity.velocity };
    if (this.isDashing) {
      const elapsed = this.tuning.dashDurationMs - this.dashRemainingMs;
      const progress = Math.min(1, elapsed / this.tuning.dashDurationMs);
      const speed = this.tuning.dashSpeed * (1 - progress * .28);
      entity.velocity = { x: this.dashDirection.x * speed, y: this.dashDirection.y * speed };
      entity.position = constrain({ x: entity.position.x + entity.velocity.x * dt, y: entity.position.y + entity.velocity.y * dt });
      this.dashRemainingMs = Math.max(0, this.dashRemainingMs - deltaMs);
      if (!this.isDashing) entity.velocity = { x: this.dashDirection.x * entity.stats.moveSpeed * .58, y: this.dashDirection.y * entity.stats.moveSpeed * .58 };
      return { inputMagnitude: 1, speedRatio: speed / entity.stats.moveSpeed, accelerationRatio: 1, braking: false, turning: 0, dashing: true, dashProgress: progress };
    }

    const normalized = normalizeInput(input, this.tuning.deadZone);
    const target = { x: normalized.direction.x * entity.stats.moveSpeed * normalized.magnitude, y: normalized.direction.y * entity.stats.moveSpeed * normalized.magnitude };
    const currentSpeed = Math.hypot(entity.velocity.x, entity.velocity.y);
    const targetSpeed = Math.hypot(target.x, target.y);
    const dot = currentSpeed > 1 && targetSpeed > 1 ? (entity.velocity.x * target.x + entity.velocity.y * target.y) / (currentSpeed * targetSpeed) : 1;
    const braking = normalized.magnitude === 0 || targetSpeed < currentSpeed * .55;
    const rate = braking ? this.tuning.deceleration : dot < .25 ? this.tuning.turnAcceleration : this.tuning.acceleration;
    entity.velocity.x = approach(entity.velocity.x, target.x, rate * dt);
    entity.velocity.y = approach(entity.velocity.y, target.y, rate * dt);
    if (normalized.magnitude === 0 && Math.hypot(entity.velocity.x, entity.velocity.y) < 5) entity.velocity = { x: 0, y: 0 };
    entity.position = constrain({ x: entity.position.x + entity.velocity.x * dt, y: entity.position.y + entity.velocity.y * dt });
    if (normalized.magnitude > 0) this.lastDirection = { ...normalized.direction };
    if (Math.abs(entity.velocity.x) > 12) entity.facing = entity.velocity.x < 0 ? 'left' : 'right';
    const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
    const acceleration = Math.hypot(entity.velocity.x - previousVelocity.x, entity.velocity.y - previousVelocity.y) / Math.max(.001, deltaMs / 1000);
    return { inputMagnitude: normalized.magnitude, speedRatio: speed / entity.stats.moveSpeed, accelerationRatio: Math.min(1, acceleration / this.tuning.turnAcceleration), braking, turning: Math.max(0, -dot), dashing: false, dashProgress: 0 };
  }

  reset(): void { this.dashRemainingMs = 0; this.lastDirection = { x: 0, y: -1 }; }
}

function normalizeInput(input: MovementInput, deadZone: number): { direction: Vec2; magnitude: number } {
  const raw = Math.hypot(input.x, input.y);
  if (raw < deadZone) return { direction: { x: 0, y: 0 }, magnitude: 0 };
  const magnitude = Math.min(1, (raw - deadZone) / (1 - deadZone));
  return { direction: { x: input.x / raw, y: input.y / raw }, magnitude };
}
function approach(value: number, target: number, amount: number): number { return value < target ? Math.min(target, value + amount) : Math.max(target, value - amount); }
