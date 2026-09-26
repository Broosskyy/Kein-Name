import type { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { ASSET_MANIFEST, AssetRegistry, type AssetKey, type AssetManifest } from '../assets';
import { GAME_CONFIG } from '../config';
import { announcementLifecycle } from '../ui/GameUI';
import { assetAuditStatus } from '../ui/VisualCatalog';
import { PRODUCTION_GROUND_DETAILS, PRODUCTION_PROPS, productionCompositionSignature } from './ArenaProductionArt';

function selectedManifest(keys: readonly AssetKey[]): AssetManifest {
  const selected = { ...ASSET_MANIFEST };
  for (const key of Object.keys(selected) as AssetKey[]) {
    if (!keys.includes(key)) selected[key] = { ...selected[key], src: undefined };
  }
  return selected;
}

describe('M09.2 production art convergence', () => {
  it('registers active production masters for creature, environment, loot and pet', () => {
    expect(ASSET_MANIFEST['creature.base'].src).toMatch(/creature-base\.webp$/);
    expect(ASSET_MANIFEST['arena.landmark.arch'].src).toMatch(/arena-ruined-arch-01\.webp$/);
    expect(ASSET_MANIFEST['ground.impactCrack'].src).toMatch(/ground-impact-crack-01\.webp$/);
    expect(ASSET_MANIFEST['loot.epic'].src).toMatch(/loot-epic-a\.webp$/);
    expect(ASSET_MANIFEST['pet.emberWisp'].src).toMatch(/ember-wisp\.webp$/);
  });

  it.each(['creature.base', 'arena.landmark.arch', 'loot.rare'] as const)('falls back safely when %s fails', async (key) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const assets = new AssetRegistry(selectedManifest([key]), async () => { throw new Error('decode failed'); });
    await assets.preload();
    expect(assets.resolve(key)).toEqual({ key, mode:'procedural', failed:true });
    expect(assetAuditStatus(assets, key)).toBe('FAILED');
    warning.mockRestore();
  });

  it('maps aligned production art to all Harvest Colossus states', () => {
    expect(ASSET_MANIFEST['boss.halloween.base'].src).toContain('/boss/harvest-colossus-base.webp');
    expect(ASSET_MANIFEST['boss.halloween.damage1'].src).toContain('/boss/harvest-colossus-break1.webp');
    expect(ASSET_MANIFEST['boss.halloween.damage2'].src).toContain('/boss/harvest-colossus-break2.webp');
    expect(ASSET_MANIFEST['boss.core.unstable'].src).toContain('/boss/harvest-colossus-core.webp');
  });

  it('keeps authored world composition deterministic, unique and lane-conscious', () => {
    const first = productionCompositionSignature();
    expect(productionCompositionSignature()).toBe(first);
    expect(PRODUCTION_PROPS).toHaveLength(22);
    expect(PRODUCTION_GROUND_DETAILS).toHaveLength(16);
    expect(new Set(PRODUCTION_PROPS.map((item) => item.id)).size).toBe(PRODUCTION_PROPS.length);
    expect(PRODUCTION_PROPS.every((item) => item.x >= 0 && item.x <= GAME_CONFIG.arena.width && item.y >= 0 && item.y <= GAME_CONFIG.arena.height)).toBe(true);
  });

  it('loads production availability without changing combat or quality math', async () => {
    const before = JSON.stringify({ combat:GAME_CONFIG.combat, quality:GAME_CONFIG.quality });
    const texture = { width:512, height:512 } as Texture;
    const assets = new AssetRegistry(selectedManifest(['creature.base','loot.epic']), async () => texture);
    await assets.preload();
    expect(assets.resolve('creature.base').mode).toBe('production');
    expect(JSON.stringify({ combat:GAME_CONFIG.combat, quality:GAME_CONFIG.quality })).toBe(before);
  });

  it('caps compact announcement lifecycle around a one-second readable beat', () => {
    expect(announcementLifecycle(1050)).toEqual({ totalMs:1050, enterMs:168, exitMs:294 });
    expect(announcementLifecycle(10).totalMs).toBe(650);
    expect(announcementLifecycle(9999).totalMs).toBe(1500);
  });
});
