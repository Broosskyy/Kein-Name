import * as THREE from 'three';
import type { PlayerProjectile, PlayerProjectileImpact } from '../gameplay/PlayerProjectileSystem';
import { sampleGroundHeight } from './HybridGroundSampler';
import { simulationToWorld3D, WORLD3D_UNITS_PER_METER } from './World3DTypes';

interface ProjectileVisual { root: THREE.Group; kind: PlayerProjectile['kind']; active: boolean; trail: THREE.Mesh }
interface ImpactVisual { root: THREE.Group; material: THREE.MeshBasicMaterial; ageMs: number; durationMs: number; active: boolean }

export class HybridProjectileRenderer {
  private readonly projectilePool: ProjectileVisual[] = [];
  private readonly impactPool: ImpactVisual[] = [];
  private readonly activeById = new Map<string, ProjectileVisual>();
  private readonly normalGeometry = new THREE.OctahedronGeometry(.27, 0);
  private readonly powerGeometry = new THREE.IcosahedronGeometry(.46, 1);
  private readonly trailGeometry = new THREE.CylinderGeometry(.055, .19, 2.05, 6, 1, true);
  private readonly glowGeometry = new THREE.IcosahedronGeometry(.38, 1);
  private readonly impactRingGeometry = new THREE.RingGeometry(.18, .38, 24);
  private readonly impactBurstGeometry = new THREE.OctahedronGeometry(.3, 0);
  private readonly impactArcGeometry = new THREE.TorusGeometry(.28, .035, 5, 16);
  private readonly normalMaterial = new THREE.MeshStandardMaterial({ color: 0xc6f6ff, emissive: 0x32b9ff, emissiveIntensity: 4, roughness: .2 });
  private readonly powerMaterial = new THREE.MeshStandardMaterial({ color: 0xfff0bd, emissive: 0xff6a1f, emissiveIntensity: 5, roughness: .16 });
  private readonly normalTrailMaterial = new THREE.MeshBasicMaterial({ color: 0x73ddff, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly powerTrailMaterial = new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly normalGlowMaterial = new THREE.MeshBasicMaterial({ color: 0x62dfff, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly powerGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xff8a32, transparent: true, opacity: .28, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly unitScale = new THREE.Vector3(1, 1, 1);
  private readonly forwardAxis = new THREE.Vector3(0, 0, 1);
  private readonly flightDirection = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene) {}

  update(deltaMs: number, projectiles: readonly PlayerProjectile[], impacts: readonly PlayerProjectileImpact[]): void {
    const live = new Set(projectiles.map((projectile) => projectile.id));
    for (const [id, visual] of this.activeById) if (!live.has(id)) this.releaseProjectile(id, visual);
    for (const projectile of projectiles) {
      let visual = this.activeById.get(projectile.id);
      if (!visual) {
        visual = this.acquireProjectile(projectile.kind);
        this.activeById.set(projectile.id, visual);
        visual.root.scale.setScalar(.25);
        this.spawnBurst(projectile.sourcePosition, projectile.height, projectile.kind, true);
      }
      visual.root.scale.lerp(this.unitScale, .32);
      const world = simulationToWorld3D(projectile.position);
      const ground = sampleGroundHeight(world.x, world.z);
      visual.root.position.set(world.x, ground + projectile.height / WORLD3D_UNITS_PER_METER, world.z);
      this.flightDirection.set(projectile.velocity.x, 0, projectile.velocity.y).normalize();
      visual.root.quaternion.setFromUnitVectors(this.forwardAxis, this.flightDirection);
    }
    impacts.forEach((impact) => this.spawnImpact(impact));
    for (const impact of this.impactPool) {
      if (!impact.active) continue;
      impact.ageMs += deltaMs;
      const progress = Math.min(1, impact.ageMs / impact.durationMs);
      impact.root.scale.setScalar(.4 + progress * 2.05);
      impact.material.opacity = (1 - progress) * .9;
      if (progress >= 1) { impact.active = false; impact.root.visible = false; }
    }
  }

  get activeCount(): number { return this.activeById.size; }
  get poolCount(): number { return this.projectilePool.length + this.impactPool.length; }

  dispose(): void {
    this.projectilePool.forEach((visual) => this.scene.remove(visual.root));
    this.impactPool.forEach((visual) => { this.scene.remove(visual.root); visual.material.dispose(); });
    this.normalGeometry.dispose(); this.powerGeometry.dispose(); this.trailGeometry.dispose(); this.glowGeometry.dispose();
    this.impactRingGeometry.dispose(); this.impactBurstGeometry.dispose(); this.impactArcGeometry.dispose();
    this.normalMaterial.dispose(); this.powerMaterial.dispose(); this.normalTrailMaterial.dispose(); this.powerTrailMaterial.dispose();
    this.normalGlowMaterial.dispose(); this.powerGlowMaterial.dispose();
  }

  private acquireProjectile(kind: PlayerProjectile['kind']): ProjectileVisual {
    let visual = this.projectilePool.find((candidate) => !candidate.active && candidate.kind === kind);
    if (!visual) {
      const root = new THREE.Group();
      const core = new THREE.Mesh(kind === 'power' ? this.powerGeometry : this.normalGeometry, kind === 'power' ? this.powerMaterial : this.normalMaterial);
      // A map-less THREE.Sprite renders as a rectangular card. On Android it
      // was clearly visible as a white debug square, so use cheap radial 3D
      // geometry for the glow instead.
      const glow = new THREE.Mesh(this.glowGeometry, kind === 'power' ? this.powerGlowMaterial : this.normalGlowMaterial);
      glow.scale.setScalar(kind === 'power' ? 1.28 : .78);
      const trail = new THREE.Mesh(this.trailGeometry, kind === 'power' ? this.powerTrailMaterial : this.normalTrailMaterial);
      trail.rotation.x = Math.PI / 2; trail.position.z = 1.02;
      root.add(core, glow, trail); root.renderOrder = 3;
      visual = { root, kind, active: false, trail };
      this.projectilePool.push(visual); this.scene.add(root);
    }
    visual.active = true; visual.root.visible = true;
    return visual;
  }

  private releaseProjectile(id: string, visual: ProjectileVisual): void {
    visual.active = false; visual.root.visible = false; this.activeById.delete(id);
  }

  private spawnImpact(impact: PlayerProjectileImpact): void {
    this.spawnBurst(impact.position, impact.height, impact.kind, false);
  }

  private spawnBurst(position: { x: number; y: number }, height: number, kind: PlayerProjectile['kind'], launch: boolean): void {
    let visual = this.impactPool.find((candidate) => !candidate.active);
    if (!visual) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffb05a, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide });
      const root = new THREE.Group();
      const ring = new THREE.Mesh(this.impactRingGeometry, material); ring.rotation.x = -Math.PI / 2;
      const burst = new THREE.Mesh(this.impactBurstGeometry, material); burst.position.y = .12;
      const arcA = new THREE.Mesh(this.impactArcGeometry, material); arcA.position.y = .15;
      const arcB = new THREE.Mesh(this.impactArcGeometry, material); arcB.position.y = .15; arcB.rotation.y = Math.PI / 2;
      root.add(ring, burst, arcA, arcB); root.visible = false; this.scene.add(root);
      visual = { root, material, ageMs: 0, durationMs: 330, active: false }; this.impactPool.push(visual);
    }
    const world = simulationToWorld3D(position);
    visual.active = true; visual.ageMs = 0; visual.durationMs = launch ? 150 : kind === 'power' ? 480 : 300;
    visual.material.color.setHex(kind === 'power' ? 0xff8a31 : 0x75dcff);
    visual.material.opacity = .9; visual.root.visible = true;
    visual.root.position.set(world.x, sampleGroundHeight(world.x, world.z) + height / WORLD3D_UNITS_PER_METER, world.z);
    visual.root.scale.setScalar(launch ? (kind === 'power' ? .45 : .28) : kind === 'power' ? .78 : .44);
  }
}
