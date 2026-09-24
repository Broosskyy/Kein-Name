import type { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { ASSET_MANIFEST, AssetRegistry, type AssetManifest } from './assets';
import { GAME_CONFIG } from './config';

function manifestWithBase(src: string): AssetManifest {
  return { ...ASSET_MANIFEST, 'creature.base': { ...ASSET_MANIFEST['creature.base'], src } };
}

describe('M05 production asset boundary', () => {
  it('uses a procedural fallback when a production slot is empty', () => {
    const assets = new AssetRegistry();
    expect(assets.resolve('creature.base')).toEqual({ key: 'creature.base', mode: 'procedural', failed: false });
  });

  it('uses a procedural fallback after an asset load failure', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const assets = new AssetRegistry(manifestWithBase('/missing.webp'), async () => { throw new Error('decode failed'); });
    await expect(assets.preload()).resolves.toBeUndefined();
    expect(assets.resolve('creature.base')).toEqual({ key: 'creature.base', mode: 'procedural', failed: true });
    warning.mockRestore();
  });

  it('prefers a loaded production texture without mutating gameplay config', async () => {
    const combatBefore = JSON.stringify(GAME_CONFIG.combat);
    const texture = { width: 768, height: 768 } as Texture;
    const assets = new AssetRegistry(manifestWithBase('/base.webp'), async () => texture);
    await assets.preload();
    expect(assets.resolve('creature.base')).toEqual({ key: 'creature.base', mode: 'production', texture, failed: false });
    expect(JSON.stringify(GAME_CONFIG.combat)).toBe(combatBefore);
  });

  it('catalog exposes every manifest slot exactly once', () => {
    const assets = new AssetRegistry();
    expect(assets.catalog().map((item) => item.key)).toEqual(Object.keys(ASSET_MANIFEST));
  });
});
