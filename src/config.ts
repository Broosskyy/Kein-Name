export type QualityName = 'low' | 'medium' | 'high';

export interface QualityProfile {
  dpr: number;
  particles: number;
  maxParticles: number;
  maxProjectiles: number;
  maxFloatingTexts: number;
  maxShockwaves: number;
  maxDebris: number;
  ambientMotes: number;
  trailIntervalMs: number;
  glowLayers: number;
}

export const GAME_CONFIG = {
  schemaVersion: 2,
  clientVersion: '0.5.0',
  combat: {
    normalDamage: 42,
    attackIntervalMs: 950,
    powerDamage: 160,
    powerCooldownMs: 3200,
    voidEchoMultiplier: 0.34,
    voidPowerEchoMultiplier: 0.44,
    voidEchoDelayMs: 150,
    nightwingEchoDelayMs: 90,
    nightwingEchoMultiplier: 0.26,
    wingAttackIntervalMultiplier: 0.68,
    wingPowerVolleyMultiplier: 0.42,
    pumpkinBurstMultiplier: 0.3,
    pumpkinPowerBurstMultiplier: 0.52,
    pumpkinBurstDelayMs: 115,
  },
  timing: {
    breakpointIntroMs: 850,
    mutationDurationMs: 1750,
    finalDurationMs: 2400,
    normalProjectileMs: 310,
    powerProjectileMs: 430,
    normalHitStopMs: 22,
    powerHitStopMs: 68,
    finalHitStopMs: 125,
  },
  quality: {
    active: 'medium' as QualityName,
    low: { dpr: 1, particles: 0.48, maxParticles: 68, maxProjectiles: 10, maxFloatingTexts: 10, maxShockwaves: 3, maxDebris: 10, ambientMotes: 8, trailIntervalMs: 70, glowLayers: 1 },
    medium: { dpr: 1.25, particles: 1, maxParticles: 130, maxProjectiles: 14, maxFloatingTexts: 16, maxShockwaves: 6, maxDebris: 18, ambientMotes: 16, trailIntervalMs: 42, glowLayers: 2 },
    high: { dpr: 1.5, particles: 1.28, maxParticles: 180, maxProjectiles: 18, maxFloatingTexts: 22, maxShockwaves: 8, maxDebris: 26, ambientMotes: 24, trailIntervalMs: 28, glowLayers: 3 },
  },
} as const;

export const ACTIVE_QUALITY: QualityProfile = GAME_CONFIG.quality[GAME_CONFIG.quality.active];

export function qualityProfile(name: QualityName): QualityProfile {
  return GAME_CONFIG.quality[name];
}
