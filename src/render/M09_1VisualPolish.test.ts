import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, AssetRegistry } from '../assets';
import { BossAttackSystem } from '../gameplay/BossAttackSystem';
import { GroundDecalSystem } from './GroundDecalSystem';
import { telegraphVisualState } from './TelegraphRenderer';
import { EffectsLayer } from './EffectsLayer';
import { VisualQualityController } from './VisualQuality';
import { bossVisualKey } from './VisualDefinitions';

describe('M09.1 bounded visual polish', () => {
  it('ships the Harvest Colossus master as asset-first with procedural fallback contract', () => {
    expect(ASSET_MANIFEST['boss.halloween.base'].src).toBe('/assets/harvest-colossus-master.webp');
    expect(ASSET_MANIFEST['boss.halloween.base'].fallback).toBe('procedural');
    expect(new AssetRegistry().resolve('boss.standard.base').mode).toBe('procedural');
  });

  it('keeps ground decals bounded and expires them deterministically', () => {
    const decals = new GroundDecalSystem(3);
    for (let index = 0; index < 5; index += 1) decals.add({ x: index * 10, y: 20 }, 120, 'ground-slam', 100);
    expect(decals.items).toHaveLength(3);
    expect(decals.items[0].position.x).toBe(20);
    decals.update(99);
    expect(decals.items).toHaveLength(3);
    decals.update(1);
    expect(decals.items).toHaveLength(0);
  });

  it('raises telegraph urgency without turning warning centers opaque', () => {
    const attacks = new BossAttackSystem(18);
    const attack = attacks.force('ground-slam', { x: 2000, y: 2400 });
    attack.elapsedMs = 100;
    const warning = telegraphVisualState(attack);
    attack.elapsedMs = 950;
    const imminent = telegraphVisualState(attack);
    expect(imminent.urgency).toBeGreaterThan(warning.urgency);
    expect(warning.centerAlpha).toBeLessThan(.05);
    expect(imminent.centerAlpha).toBeLessThan(.05);
    attack.phase = 'impact';
    expect(telegraphVisualState(attack).impact).toBe(true);
  });

  it('caps pooled VFX and releases every transient lifecycle', () => {
    const quality = new VisualQualityController('low');
    const effects = new EffectsLayer(quality);
    effects.burst(10, 10, 0xffffff, 999, 1);
    for (let index = 0; index < 30; index += 1) effects.damageNumber(20, 20, index, false);
    for (let index = 0; index < 20; index += 1) effects.shockwave(20, 20, 0xffffff);
    const active = effects.activeCounts();
    expect(active.particles).toBeLessThanOrEqual(quality.profile.maxParticles);
    expect(active.texts).toBeLessThanOrEqual(quality.profile.maxFloatingTexts);
    expect(active.shockwaves).toBeLessThanOrEqual(quality.profile.maxShockwaves);
    effects.update(5000);
    expect(effects.activeCounts()).toEqual({ particles: 0, texts: 0, shockwaves: 0 });
  });

  it('keeps every boss damage state mapped to an aligned visual slot', () => {
    expect(bossVisualKey(true, 'intact')).toBe('boss.halloween.base');
    expect(bossVisualKey(true, 'fractured')).toBe('boss.halloween.damage1');
    expect(bossVisualKey(true, 'critical')).toBe('boss.halloween.damage2');
  });
});
