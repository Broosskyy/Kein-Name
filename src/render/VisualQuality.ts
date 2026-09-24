import { GAME_CONFIG, qualityProfile, type QualityName, type QualityProfile } from '../config';

export class VisualQualityController {
  private currentName: QualityName;
  private reduced = false;

  constructor(name: QualityName = GAME_CONFIG.quality.active) {
    this.currentName = name;
  }

  get name(): QualityName { return this.currentName; }
  get reducedEffects(): boolean { return this.reduced; }

  get profile(): QualityProfile {
    const base = qualityProfile(this.currentName);
    if (!this.reduced) return base;
    return {
      ...base,
      particles: base.particles * 0.55,
      maxParticles: Math.max(36, Math.floor(base.maxParticles * 0.6)),
      maxDebris: Math.max(6, Math.floor(base.maxDebris * 0.55)),
      ambientMotes: Math.max(5, Math.floor(base.ambientMotes * 0.55)),
      trailIntervalMs: Math.round(base.trailIntervalMs * 1.65),
      glowLayers: 1,
    };
  }

  set(name: QualityName): void { this.currentName = name; }
  toggleReduced(): boolean { this.reduced = !this.reduced; return this.reduced; }
  reset(): void { this.reduced = false; }
}
