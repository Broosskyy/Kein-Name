import { describe, expect, it } from 'vitest';
import { AssetRegistry } from '../assets';
import { VISUAL_CATALOG_DEV_ONLY, VISUAL_CATALOG_GROUPS, assetAuditStatus, renderVisualCatalog } from './VisualCatalog';

describe('M05 visual catalog', () => {
  it('is explicitly development-only', () => {
    expect(VISUAL_CATALOG_DEV_ONLY).toBe(true);
  });

  it('lists character, evolution, boss-stage and icon groups with fallback status', () => {
    const html = renderVisualCatalog(new AssetRegistry());
    expect(VISUAL_CATALOG_GROUPS.length).toBeGreaterThanOrEqual(7);
    expect(html).toContain('evolution.jack-o-void');
    expect(html).toContain('boss.halloween.damage2');
    expect(html).toContain('data-mode="procedural"');
    expect(html).toContain('data-audit-status="MISSING"');
    expect(assetAuditStatus(new AssetRegistry(), 'evolution.skyshard')).toBe('FALLBACK');
  });
});
