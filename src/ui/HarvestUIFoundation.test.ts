import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST } from '../assets';
import { heroAnimationClip } from '../world3d/HeroAnimationController';
import { HARVEST_UI_ASSETS, missingHarvestUIAssets } from './HarvestUIAssetCatalog';
import { HARVEST_HUB_SECTIONS, renderHarvestHub, renderHarvestUIPreview, responsiveHubColumns } from './HarvestUIComponents';

const root = fileURLToPath(new URL('../../', import.meta.url));

describe('Harvest UI production asset registry', () => {
  it('registers stable IDs and every referenced runtime asset exists', () => {
    const ids = Object.keys(HARVEST_UI_ASSETS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(missingHarvestUIAssets((assetPath) => existsSync(`${root}public${assetPath}`))).toEqual([]);
    for (const asset of Object.values(HARVEST_UI_ASSETS)) {
      if (!asset.runtimePath) continue;
      expect(statSync(`${root}public${asset.runtimePath}`).size).toBeGreaterThan(0);
    }
  });

  it('defines real nine-slice regions instead of full-image stretching', () => {
    const scalable = Object.values(HARVEST_UI_ASSETS).filter((asset) => asset.render === 'nine-slice');
    expect(scalable.length).toBeGreaterThanOrEqual(10);
    expect(scalable.every((asset) => asset.slice && Object.values(asset.slice).every((value) => value > 0))).toBe(true);
  });
});

describe('Harvest hub and preview components', () => {
  it('renders all ten required sections with functional navigation targets', () => {
    const html = renderHarvestHub();
    expect(HARVEST_HUB_SECTIONS).toHaveLength(10);
    for (const section of HARVEST_HUB_SECTIONS) {
      expect(html).toContain(`id="hub-${section.id}"`);
      expect(html).toContain(`data-hub-target="${section.id}"`);
    }
    expect(html).toContain('data-hub-enter-combat');
    expect(html).toContain('data-hub-close');
  });

  it('renders the 32-state Evo 1 audit and responsive mobile/tablet/desktop layouts', () => {
    const html = renderHarvestUIPreview();
    for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
      for (const pose of ['idle', 'run', 'dash', 'attack']) expect(html).toContain(`hero-evo1-${direction}-${pose}.webp`);
    }
    expect(responsiveHubColumns(390)).toBe(1);
    expect(responsiveHubColumns(800)).toBe(2);
    expect(responsiveHubColumns(1280)).toBe(3);
  });
});

describe('Evo 1 directional runtime integration', () => {
  it('maps every direction/state to a non-empty production asset', () => {
    for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const) {
      for (const pose of ['idle', 'run', 'dash', 'attack'] as const) {
        const key = `creature.evo1.direction.${direction}.${pose}` as const;
        expect(heroAnimationClip(pose, direction).frames.every((frame) => frame.asset === key)).toBe(true);
        const src = ASSET_MANIFEST[key].src;
        expect(src).toContain(`hero-evo1-${direction}-${pose}.webp`);
        expect(statSync(`${root}public${src}`).size).toBeGreaterThan(0);
      }
    }
  });
});
