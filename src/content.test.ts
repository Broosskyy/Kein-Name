import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST } from './assets';
import { ACTIVE_BOSS, EVOLUTIONS, MUTATIONS, mutationPoolForEvent } from './content';

describe('M02 content and asset boundary', () => {
  it('preserves the three-mutation M03 pool while registering Pumpkin for the event', () => {
    expect(ACTIVE_BOSS.maxHp).toBeGreaterThan(0);
    expect(ACTIVE_BOSS.weakpoint).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(mutationPoolForEvent(false)).toEqual(['crystal', 'void', 'wings']);
    expect(MUTATIONS.map((mutation) => mutation.id)).toEqual(['crystal', 'void', 'wings', 'pumpkin']);
    expect(ACTIVE_BOSS.breakpoints.map((breakpoint) => breakpoint.threshold)).toEqual([0.7, 0.4]);
    expect(EVOLUTIONS.map((evolution) => evolution.id)).toEqual(['voidshard', 'skyshard', 'nightwing', 'jack-o-void', 'harvestshard', 'hollowwing']);
  });

  it('provides procedural fallback entries for every configured visual', () => {
    expect(ASSET_MANIFEST[ACTIVE_BOSS.visualKey].fallback).toBe('procedural');
    for (const mutation of MUTATIONS) {
      expect(ASSET_MANIFEST[mutation.visualKey].fallback).toBe('procedural');
      expect(ASSET_MANIFEST[`essence.${mutation.id}`].fallback).toBe('procedural');
    }
  });
});
