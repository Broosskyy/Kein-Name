import * as THREE from 'three';

export interface CameraObstructionResolver {
  resolve(target: THREE.Vector3, desiredCamera: THREE.Vector3, requestedDistance: number): number;
}

interface MaterialFadeState {
  material: THREE.Material & { opacity: number; transparent: boolean; depthWrite: boolean };
  originalOpacity: number;
  originalTransparent: boolean;
  originalDepthWrite: boolean;
}

interface OccluderVolume {
  id: string;
  root: THREE.Object3D;
  radius: number;
  height: number;
  fade: number;
  targetFade: number;
  materials: MaterialFadeState[];
}

export interface ObstructionSnapshot {
  hit: boolean;
  nearestDistance: number;
  fadedOccluders: number;
}

export class HybridCameraObstruction implements CameraObstructionResolver {
  private readonly volumes: OccluderVolume[] = [];
  private snapshotState: ObstructionSnapshot = { hit: false, nearestDistance: Number.POSITIVE_INFINITY, fadedOccluders: 0 };

  register(id: string, root: THREE.Object3D, radius: number, height: number, fade = true): void {
    const materials: MaterialFadeState[] = [];
    if (fade) root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const source = Array.isArray(object.material) ? object.material : [object.material];
      const cloned = source.map((material) => material.clone());
      object.material = Array.isArray(object.material) ? cloned : cloned[0];
      for (const material of cloned) {
        if (!('opacity' in material)) continue;
        const fadeMaterial = material as MaterialFadeState['material'];
        materials.push({ material: fadeMaterial, originalOpacity: fadeMaterial.opacity, originalTransparent: fadeMaterial.transparent, originalDepthWrite: fadeMaterial.depthWrite });
      }
    });
    this.volumes.push({ id, root, radius, height, fade: 1, targetFade: 1, materials });
  }

  resolve(target: THREE.Vector3, desiredCamera: THREE.Vector3, requestedDistance: number): number {
    const dx = desiredCamera.x - target.x, dz = desiredCamera.z - target.z;
    const horizontalLengthSq = dx * dx + dz * dz;
    if (horizontalLengthSq < .0001) return requestedDistance;
    let allowed = requestedDistance;
    let hit = false;
    for (const volume of this.volumes) {
      const center = volume.root.position;
      const radius = volume.radius + .52;
      const fx = target.x - center.x, fz = target.z - center.z;
      const a = horizontalLengthSq;
      const b = 2 * (fx * dx + fz * dz);
      const c = fx * fx + fz * fz - radius * radius;
      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) continue;
      const t = (-b - Math.sqrt(discriminant)) / (2 * a);
      if (t <= .055 || t >= .985) continue;
      const rayY = target.y + (desiredCamera.y - target.y) * t;
      const bottom = center.y - .08;
      if (rayY < bottom || rayY > bottom + volume.height + .65) continue;
      const candidate = Math.max(3.8, requestedDistance * t - .55);
      if (candidate < allowed) { allowed = candidate; hit = true; }
    }
    this.snapshotState = { ...this.snapshotState, hit, nearestDistance: allowed };
    return allowed;
  }

  updateFades(deltaMs: number, camera: THREE.Vector3, hero: THREE.Vector3): void {
    let faded = 0;
    const segmentX = camera.x - hero.x, segmentZ = camera.z - hero.z;
    const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
    for (const volume of this.volumes) {
      const center = volume.root.position;
      const t = segmentLengthSq > .0001
        ? THREE.MathUtils.clamp(((center.x - hero.x) * segmentX + (center.z - hero.z) * segmentZ) / segmentLengthSq, 0, 1)
        : 0;
      const closestX = hero.x + segmentX * t, closestZ = hero.z + segmentZ * t;
      const lineY = hero.y + (camera.y - hero.y) * t;
      const blocksHero = t > .03 && t < .97
        && Math.hypot(center.x - closestX, center.z - closestZ) < volume.radius + .72
        && lineY <= center.y + volume.height + .8;
      volume.targetFade = blocksHero ? .16 : 1;
      const rate = blocksHero ? 16 : 5.5;
      volume.fade = THREE.MathUtils.lerp(volume.fade, volume.targetFade, 1 - Math.exp(-Math.min(.05, deltaMs / 1000) * rate));
      if (volume.fade < .97) faded += 1;
      for (const state of volume.materials) {
        state.material.transparent = volume.fade < .995 || state.originalTransparent;
        state.material.opacity = state.originalOpacity * volume.fade;
        state.material.depthWrite = volume.fade >= .97 ? state.originalDepthWrite : false;
        state.material.needsUpdate = true;
      }
    }
    this.snapshotState = { ...this.snapshotState, fadedOccluders: faded };
  }

  snapshot(): ObstructionSnapshot { return { ...this.snapshotState }; }

  restoreMaterials(): void {
    for (const volume of this.volumes) for (const state of volume.materials) {
      state.material.opacity = state.originalOpacity;
      state.material.transparent = state.originalTransparent;
      state.material.depthWrite = state.originalDepthWrite;
    }
  }
}
