import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../ui/GameUI.ts', import.meta.url), 'utf8');
const rendererSource = readFileSync(new URL('./HybridWorldRenderer.ts', import.meta.url), 'utf8');

describe('M11 mobile startup stability', () => {
  it('does not gate hybrid first frame on the complete legacy Pixi catalog', () => {
    const hybridBootstrap = mainSource.slice(mainSource.indexOf('async function bootstrapHybrid'), mainSource.indexOf('const useLegacyRenderer'));
    expect(hybridBootstrap).not.toContain('await assets.preload()');
  });

  it('creates asset-heavy hub and preview markup only when requested', () => {
    const constructor = uiSource.slice(uiSource.indexOf('constructor(private readonly assets'), uiSource.indexOf('bindPower('));
    expect(constructor).not.toContain('renderHarvestHub()');
    expect(constructor).not.toContain('renderHarvestUIPreview()');
    expect(uiSource).toContain('if (visible) this.ensureHarvestHub()');
    expect(uiSource).toContain('if (visible) this.ensureUIPreview()');
  });

  it('keeps raid-only boss construction outside the Haven startup path', () => {
    expect(rendererSource).toContain('if (!haven) {');
    expect(rendererSource).not.toContain('preloadHeroTextures()');
    expect(rendererSource).not.toContain('preloadBossTextures()');
  });
});
