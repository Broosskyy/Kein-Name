import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST } from '../assets';
import { EVOLUTIONS } from '../content';
import { CREATURE_ANCHORS, EVOLUTION_VISUALS, arenaVisualKeys, bossVisualKey } from './VisualDefinitions';

describe('M05 visual definitions', () => {
  it('resolves all six stable evolution IDs to valid production slots', () => {
    expect(Object.keys(EVOLUTION_VISUALS)).toEqual(EVOLUTIONS.map((item) => item.id));
    for (const definition of Object.values(EVOLUTION_VISUALS)) {
      expect(ASSET_MANIFEST[definition.assetKey].kind).toBe('character');
      expect(definition.renderScale).toBeGreaterThan(1);
    }
  });

  it('resolves aligned boss damage slots for standard and Halloween themes', () => {
    expect(bossVisualKey(false, 'intact')).toBe('boss.standard.base');
    expect(bossVisualKey(false, 'fractured')).toBe('boss.standard.damage1');
    expect(bossVisualKey(false, 'critical')).toBe('boss.standard.damage2');
    expect(bossVisualKey(true, 'intact')).toBe('boss.halloween.base');
    expect(bossVisualKey(true, 'fractured')).toBe('boss.halloween.damage1');
    expect(bossVisualKey(true, 'defeated')).toBe('boss.halloween.damage2');
  });

  it('keeps Halloween and standard arena visual resolution separate', () => {
    expect(arenaVisualKeys(false)).toEqual(['arena.standard.background']);
    expect(arenaVisualKeys(true)).toEqual(['arena.halloween.background', 'arena.halloween.foreground']);
  });

  it('defines only the anchors required by the render layer', () => {
    expect(Object.keys(CREATURE_ANCHORS)).toEqual(['head', 'body', 'back', 'leftWing', 'rightWing', 'attack', 'ground']);
    expect(CREATURE_ANCHORS.attack.x).toBeGreaterThan(0);
  });
});
