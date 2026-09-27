import * as THREE from 'three';
import type { Vec2 } from '../gameplay/ArenaTypes';
import { simulationToWorld3D } from './World3DTypes';

export type HybridCameraMode = 'follow' | 'look' | 'boss-focus' | 'tactical';

export class HybridCameraController {
  readonly target = new THREE.Vector3();
  readonly manualOffset = new THREE.Vector3();
  mode: HybridCameraMode = 'follow';
  distance = 14.5;
  yaw = 0;
  pitch = THREE.MathUtils.degToRad(54);
  private readonly portraitBossBias = .14;
  private desiredDistance = this.distance;
  private desiredOffset = new THREE.Vector3();
  private lastPlayer = new THREE.Vector3();

  constructor(readonly camera: THREE.PerspectiveCamera, private readonly worldHalfExtent = 10.6) {}

  pan(screenDx: number, screenDy: number): void {
    this.mode = 'look';
    const scale = this.distance * .0028;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.desiredOffset.addScaledVector(right, -screenDx * scale).addScaledVector(forward, -screenDy * scale);
    this.clampOffset(this.desiredOffset);
  }

  orbit(screenDx: number): void { this.yaw += screenDx * .004; }

  zoom(delta: number): void {
    this.desiredDistance = THREE.MathUtils.clamp(this.desiredDistance - delta * 12, 8.5, 21);
  }

  resetFollow(): void { this.mode = 'follow'; this.desiredOffset.set(0, 0, 0); }
  setMode(mode: HybridCameraMode): void {
    this.mode = mode;
    if (mode === 'follow') this.desiredOffset.set(0, 0, 0);
    if (mode === 'tactical') this.desiredDistance = 20;
  }

  update(deltaMs: number, player: Vec2, velocity: Vec2, boss: Vec2): void {
    const dt = Math.min(.05, deltaMs / 1000);
    const player3 = toGround(player);
    const boss3 = toGround(boss);
    const speed = Math.hypot(velocity.x, velocity.y);
    const lookAhead = speed > 10 ? new THREE.Vector3(velocity.x, 0, velocity.y).multiplyScalar(.0009) : new THREE.Vector3();
    let anchor = player3.clone().add(lookAhead);
    // In normal combat the camera looks slightly into the arena so the hero naturally
    // sits lower in portrait framing while the boss/world remain visible above.
    if (this.mode === 'follow') anchor.lerp(boss3, this.portraitBossBias);
    if (this.mode === 'boss-focus') anchor.lerp(boss3, .44);
    if (this.mode === 'tactical') anchor.lerp(boss3, .28);
    anchor.add(this.manualOffset);
    this.clampOffset(this.desiredOffset);
    const offsetLerp = 1 - Math.exp(-dt * (this.mode === 'follow' ? 5 : 8));
    this.manualOffset.lerp(this.desiredOffset, offsetLerp);
    this.distance = THREE.MathUtils.lerp(this.distance, this.desiredDistance, 1 - Math.exp(-dt * 7));
    this.target.lerp(anchor, 1 - Math.exp(-dt * 8));

    const horizontal = this.distance * Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * horizontal,
      this.distance * Math.sin(this.pitch),
      this.target.z + Math.cos(this.yaw) * horizontal,
    );
    this.camera.lookAt(this.target.x, .45, this.target.z);
    this.lastPlayer.copy(player3);
  }

  setVisualProofView(options: { mode?: HybridCameraMode; distance?: number; yaw?: number; pitchDeg?: number; offsetX?: number; offsetZ?: number }): void {
    if (options.mode) this.mode = options.mode;
    if (typeof options.distance === 'number') this.desiredDistance = this.distance = THREE.MathUtils.clamp(options.distance, 8.5, 21);
    if (typeof options.yaw === 'number') this.yaw = options.yaw;
    if (typeof options.pitchDeg === 'number') this.pitch = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(options.pitchDeg, 42, 66));
    this.desiredOffset.set(options.offsetX ?? 0, 0, options.offsetZ ?? 0);
    this.manualOffset.copy(this.desiredOffset);
    this.clampOffset(this.desiredOffset);
    this.clampOffset(this.manualOffset);
  }

  snapshot(): Readonly<{ mode: HybridCameraMode; distance: number; offsetX: number; offsetZ: number }> {
    return { mode: this.mode, distance: this.distance, offsetX: this.manualOffset.x, offsetZ: this.manualOffset.z };
  }

  private clampOffset(offset: THREE.Vector3): void {
    offset.x = THREE.MathUtils.clamp(offset.x, -this.worldHalfExtent, this.worldHalfExtent);
    offset.z = THREE.MathUtils.clamp(offset.z, -this.worldHalfExtent, this.worldHalfExtent);
  }
}

function toGround(point: Vec2): THREE.Vector3 {
  const world = simulationToWorld3D(point);
  return new THREE.Vector3(world.x, world.y, world.z);
}
