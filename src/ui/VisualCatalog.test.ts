import { describe, expect, it } from 'vitest';
import { AssetRegistry } from '../assets';
import { VISUAL_CATALOG_DEV_ONLY, VISUAL_CATALOG_GROUPS, renderVisualCatalog } from './VisualCatalog';

describe('M05 visual catalog', () => {
  it('is explicitly development-only', () => {
    expect(VISUAL_CATALOG_DEV_ONLY).toBe(true);
  });

  it('lists character, evolution, boss-stage and icon groups with fallback status', () => {
    const html = renderVisualCatalog(new AssetRegistry());
    expect(VISUAL_CATALOG_GROUPS).toHaveLength(4);
    expect(html).toContain('evolution.jack-o-void');
    expect(html).toContain('boss.halloween.damage2');
    expect(html).toContain('data-mode="procedural"');
  });
});
