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
  schemaVersion: 4,
  clientVersion: '0.8.0',
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
  arena: {
    width: 3200,
    height: 1800,
    playerSpeed: 590,
    playerMaxHp: 100,
    pickupRadius: 105,
    maxLoot: 36,
    maxDummyAllies: 7,
    autosaveIntervalMs: 5000,
    dashDistance: 430,
    dashCooldownMs: 2400,
    dashInvulnerabilityMs: 340,
    movementDeadZone: 0.12,
    cameraMinZoom: 0.68,
    cameraMaxZoom: 1.3,
    cameraDefaultZoom: 0.88,
  },
  cycles: {
    max: 3,
    hpMultiplier: 1.55,
    damageMultiplier: 1.22,
    cadenceMultiplier: 0.88,
    lootMultiplier: 1.2,
    xpMultiplier: 1.15,
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
