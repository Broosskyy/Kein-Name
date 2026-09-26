import type { MovementFrame } from '../gameplay/PlayerMovementController';

export interface LocomotionPose {
  offsetY: number; rotation: number; scaleX: number; scaleY: number;
  shadowScaleX: number; shadowScaleY: number; shadowAlpha: number; dust: boolean;
}

export class CreatureLocomotion {
  private phase = 0;
  private landing = 0;

  update(deltaMs: number, frame: MovementFrame | undefined, velocityX: number, maxSpeed: number): LocomotionPose {
    const speed = Math.min(1, frame?.speedRatio ?? 0);
    this.phase += deltaMs * (.005 + speed * .012);
    if (frame?.dashing && frame.dashProgress > .72) this.landing = 1;
    this.landing = Math.max(0, this.landing - deltaMs / 170);
    const stride = Math.sin(this.phase * Math.PI * 2);
    const lean = Math.max(-.12, Math.min(.12, velocityX / Math.max(1, maxSpeed) * .1));
    const accelerationStretch = (frame?.accelerationRatio ?? 0) * .045;
    const brakingSquash = frame?.braking ? Math.min(.06, speed * .06) : 0;
    const dashStretch = frame?.dashing ? .16 * Math.sin(Math.min(1, frame.dashProgress) * Math.PI) : 0;
    const compression = this.landing * .08;
    return {
      offsetY: -Math.abs(stride) * speed * 5 + this.landing * 5,
      rotation: lean + stride * speed * .012,
      scaleX: 1 + dashStretch + accelerationStretch - brakingSquash + compression,
      scaleY: 1 - dashStretch * .55 - accelerationStretch * .35 + brakingSquash - compression * .55,
      shadowScaleX: 1 + speed * .18 + dashStretch * .8,
      shadowScaleY: 1 - speed * .12,
      shadowAlpha: .48 - speed * .08,
      dust: speed > .42 && Math.abs(stride) > .82,
    };
  }

  reset(): void { this.phase = 0; this.landing = 0; }
}
