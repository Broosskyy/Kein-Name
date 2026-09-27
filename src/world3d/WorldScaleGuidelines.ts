/** Shared visual scale language for the Hybrid 3D slice. One meter equals
 * WORLD3D_UNITS_PER_METER simulation units; these values never alter gameplay. */
export const WORLD_SCALE_GUIDELINES = {
  heroVisualHeightM: 2.35,
  pillarHeightM: { min: 2.6, max: 4.8 },
  archHeightM: { min: 4.1, max: 5.4 },
  bossProxyHeightM: 6.7,
  crystalHeightM: { min: .8, max: 2.7 },
  rockHeightM: { min: .55, max: 2.2 },
} as const;
