import * as THREE from 'three';
import type { Vec2 } from '../gameplay/ArenaTypes';
import { simulationToWorld3D } from './World3DTypes';
import { sampleGroundHeightAtSimulation } from './HybridGroundSampler';
import type { CameraObstructionResolver } from './HybridCameraObstruction';

export type HybridCameraMode = 'follow' | 'look' | 'boss-focus' | 'tactical';
export type HybridCameraGesture = 'orbit' | 'pan';

// The previous 28°–68° window was visibly too narrow on a portrait phone:
// vertical drags reached a hard stop after only a short swipe. Keep safe
// limits (no camera inversion), but allow a genuinely low and high view.
export const MIN_CAMERA_PITCH_DEG = 16;
export const MAX_CAMERA_PITCH_DEG = 78;
const MIN_PITCH = THREE.MathUtils.degToRad(MIN_CAMERA_PITCH_DEG);
const MAX_PITCH = THREE.MathUtils.degToRad(MAX_CAMERA_PITCH_DEG);
export const MIN_USER_ZOOM_DISTANCE = 9.5;
export const MAX_USER_ZOOM_DISTANCE = 22;

export class HybridCameraController {
  readonly target = new THREE.Vector3();
  readonly manualTargetOffset = new THREE.Vector3();
  mode: HybridCameraMode = 'follow';
  userZoomDistance = 16.8;
  actualCameraDistance = 16.8;
  yaw = 0;
  pitch = THREE.MathUtils.degToRad(52);
  collisionLimitedDistance = MAX_USER_ZOOM_DISTANCE;
  temporaryManualControlTimer = 0;
  private smoothedUserDistance = this.userZoomDistance;
  private desiredYaw = this.yaw;
  private desiredPitch = this.pitch;
  private readonly desiredTargetOffset = new THREE.Vector3();
  private bossBiasBlend = 1;
  private readonly anchor = new THREE.Vector3();
  private readonly player3 = new THREE.Vector3();
  private readonly boss3 = new THREE.Vector3();
  private readonly lookAhead = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly desiredCamera = new THREE.Vector3();
  private impulseStrength = 0;
  private impulsePhase = 0;

  /** Compatibility alias for existing presentation/debug callers. */
  get distance(): number { return this.actualCameraDistance; }
  get obstructionDistance(): number { return this.collisionLimitedDistance; }

  constructor(readonly camera: THREE.PerspectiveCamera, private readonly worldHalfExtent = 10.6, private readonly obstruction?: CameraObstructionResolver) {}

  gesture(screenDx: number, screenDy: number, gesture: HybridCameraGesture = 'orbit'): void {
    this.mode = 'look';
    this.temporaryManualControlTimer = 2600;
    this.bossBiasBlend = 0;
    if (gesture === 'pan') { this.pan(screenDx, screenDy); return; }
    // Bound single-event deltas so a browser pointer jump cannot throw the
    // camera across its whole range, while preserving continuous swipes.
    const dx = THREE.MathUtils.clamp(screenDx, -96, 96);
    const dy = THREE.MathUtils.clamp(screenDy, -96, 96);
    this.desiredYaw = normalizeAngle(this.desiredYaw - dx * .0042);
    this.desiredPitch = THREE.MathUtils.clamp(this.desiredPitch + dy * .0028, MIN_PITCH, MAX_PITCH);
  }

  pan(screenDx: number, screenDy: number): void {
    this.mode = 'look';
    this.temporaryManualControlTimer = 2600;
    this.bossBiasBlend = 0;
    const scale = this.userZoomDistance * .0025;
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.desiredTargetOffset.addScaledVector(this.right, -screenDx * scale).addScaledVector(this.forward, -screenDy * scale);
    this.clampOffset(this.desiredTargetOffset);
  }

  orbit(screenDx: number): void { this.gesture(screenDx, 0, 'orbit'); }

  addImpulse(strength: number): void { this.impulseStrength = Math.max(this.impulseStrength, THREE.MathUtils.clamp(strength, 0, .28)); }

  zoom(delta: number): void {
    this.setUserZoomDistance(this.userZoomDistance - delta * 12);
  }

  setUserZoomDistance(distance: number): void {
    this.userZoomDistance = THREE.MathUtils.clamp(distance, MIN_USER_ZOOM_DISTANCE, MAX_USER_ZOOM_DISTANCE);
    this.temporaryManualControlTimer = 1800;
    this.bossBiasBlend = 0;
  }

  resetFollow(): void {
    this.mode = 'follow';
    this.desiredTargetOffset.set(0, 0, 0);
    this.desiredYaw = 0;
    this.desiredPitch = THREE.MathUtils.degToRad(52);
    this.temporaryManualControlTimer = 0;
  }

  setMode(mode: HybridCameraMode): void {
    this.mode = mode;
    if (mode === 'follow') this.desiredTargetOffset.set(0, 0, 0);
    if (mode === 'look') { this.temporaryManualControlTimer = 2600; this.bossBiasBlend = 0; }
  }

  update(deltaMs: number, player: Vec2, velocity: Vec2, boss: Vec2): void {
    const dt = Math.min(.05, deltaMs / 1000);
    this.impulsePhase += deltaMs;
    this.temporaryManualControlTimer = Math.max(0, this.temporaryManualControlTimer - deltaMs);
    const playerWorld = simulationToWorld3D(player), bossWorld = simulationToWorld3D(boss);
    this.player3.set(playerWorld.x, sampleGroundHeightAtSimulation(player) + .72, playerWorld.z);
    this.boss3.set(bossWorld.x, sampleGroundHeightAtSimulation(boss) + 2.35, bossWorld.z);
    const speed = Math.hypot(velocity.x, velocity.y);
    this.lookAhead.set(0, 0, 0);
    if (speed > 10) this.lookAhead.set(velocity.x * .00072, 0, velocity.y * .00072);
    this.anchor.copy(this.player3).add(this.lookAhead);

    // FOLLOW belongs to the player, not to the encounter. The previous 8%
    // Colossus bias kept moving the composition back towards the Boss after
    // manual input and made the camera feel as if it was fighting the player.
    const automaticBias = this.mode === 'boss-focus' ? .32 : this.mode === 'tactical' ? .12 : 0;
    const desiredBiasBlend = this.temporaryManualControlTimer > 0 ? 0 : 1;
    this.bossBiasBlend = THREE.MathUtils.lerp(this.bossBiasBlend, desiredBiasBlend, 1 - Math.exp(-dt * 1.15));
    if (automaticBias > 0) this.anchor.lerp(this.boss3, automaticBias * this.bossBiasBlend);
    this.clampOffset(this.desiredTargetOffset);
    this.manualTargetOffset.lerp(this.desiredTargetOffset, 1 - Math.exp(-dt * 7));
    this.anchor.add(this.manualTargetOffset);
    // FOLLOW, boss focus, movement and pitch never author zoom. Only the user
    // changes userZoomDistance; smoothing is presentation-only.
    this.smoothedUserDistance = THREE.MathUtils.lerp(this.smoothedUserDistance, this.userZoomDistance, 1 - Math.exp(-dt * 7));
    if (Math.abs(this.smoothedUserDistance - this.userZoomDistance) < .001) this.smoothedUserDistance = this.userZoomDistance;
    this.yaw = dampAngle(this.yaw, this.desiredYaw, 1 - Math.exp(-dt * 8));
    this.pitch = THREE.MathUtils.lerp(this.pitch, this.desiredPitch, 1 - Math.exp(-dt * 8));
    this.target.lerp(this.anchor, 1 - Math.exp(-dt * 7.5));

    const horizontal = this.smoothedUserDistance * Math.cos(this.pitch);
    this.desiredCamera.set(
      this.target.x + Math.sin(this.yaw) * horizontal,
      this.target.y + this.smoothedUserDistance * Math.sin(this.pitch),
      this.target.z + Math.cos(this.yaw) * horizontal,
    );
    const allowedDistance = this.obstruction?.resolve(this.target, this.desiredCamera, this.smoothedUserDistance) ?? this.smoothedUserDistance;
    const obstructionRate = allowedDistance < this.collisionLimitedDistance ? 18 : 5.5;
    this.collisionLimitedDistance = THREE.MathUtils.lerp(this.collisionLimitedDistance, allowedDistance, 1 - Math.exp(-dt * obstructionRate));
    if (Math.abs(this.collisionLimitedDistance - allowedDistance) < .001) this.collisionLimitedDistance = allowedDistance;
    // Real-device QA showed that retracting as far as 3.8m turned a normal
    // portrait view into an unplayable full-screen Hero close-up. Occluders
    // are already handled by material fading, so collision remains diagnostic
    // only and is never allowed to author the visible zoom distance.
    this.actualCameraDistance = this.smoothedUserDistance;
    const cameraDistance = this.actualCameraDistance;
    const cameraHorizontal = cameraDistance * Math.cos(this.pitch);
    this.impulseStrength = THREE.MathUtils.lerp(this.impulseStrength, 0, 1 - Math.exp(-dt * 12));
    const impulseX = Math.sin(this.impulsePhase * .041) * this.impulseStrength;
    const impulseY = Math.cos(this.impulsePhase * .037) * this.impulseStrength * .55;
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * cameraHorizontal + impulseX,
      this.target.y + cameraDistance * Math.sin(this.pitch) + impulseY,
      this.target.z + Math.cos(this.yaw) * cameraHorizontal,
    );
    this.camera.lookAt(this.target);
  }

  setVisualProofView(options: { mode?: HybridCameraMode; distance?: number; yaw?: number; pitchDeg?: number; offsetX?: number; offsetZ?: number }): void {
    if (options.mode) this.mode = options.mode;
    if (typeof options.distance === 'number') {
      this.userZoomDistance = this.smoothedUserDistance = this.actualCameraDistance = THREE.MathUtils.clamp(options.distance, MIN_USER_ZOOM_DISTANCE, MAX_USER_ZOOM_DISTANCE);
      this.collisionLimitedDistance = MAX_USER_ZOOM_DISTANCE;
    }
    if (typeof options.yaw === 'number') this.desiredYaw = this.yaw = normalizeAngle(options.yaw);
    if (typeof options.pitchDeg === 'number') this.desiredPitch = this.pitch = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(options.pitchDeg, MIN_CAMERA_PITCH_DEG, MAX_CAMERA_PITCH_DEG));
    this.desiredTargetOffset.set(options.offsetX ?? 0, 0, options.offsetZ ?? 0);
    this.manualTargetOffset.copy(this.desiredTargetOffset);
    this.clampOffset(this.desiredTargetOffset); this.clampOffset(this.manualTargetOffset);
  }

  snapshot(): Readonly<{ mode: HybridCameraMode; distance: number; userZoomDistance: number; collisionLimitedDistance: number; actualCameraDistance: number; obstructionDistance: number; obstructed: boolean; yaw: number; pitchDeg: number; offsetX: number; offsetZ: number; bossBias: number; manualControlMs: number }> {
    return {
      mode: this.mode, distance: this.actualCameraDistance,
      userZoomDistance: this.userZoomDistance,
      collisionLimitedDistance: this.collisionLimitedDistance,
      actualCameraDistance: this.actualCameraDistance,
      obstructionDistance: this.collisionLimitedDistance,
      obstructed: this.actualCameraDistance < this.smoothedUserDistance - .08,
      yaw: this.yaw, pitchDeg: THREE.MathUtils.radToDeg(this.pitch),
      offsetX: this.manualTargetOffset.x, offsetZ: this.manualTargetOffset.z,
      bossBias: this.bossBiasBlend, manualControlMs: this.temporaryManualControlTimer,
    };
  }

  private clampOffset(offset: THREE.Vector3): void {
    offset.x = THREE.MathUtils.clamp(offset.x, -this.worldHalfExtent, this.worldHalfExtent);
    offset.z = THREE.MathUtils.clamp(offset.z, -this.worldHalfExtent, this.worldHalfExtent);
  }
}

function normalizeAngle(angle: number): number { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
function dampAngle(current: number, target: number, factor: number): number { return current + normalizeAngle(target - current) * factor; }
