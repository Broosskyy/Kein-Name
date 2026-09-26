import type { AssetKey, AssetRegistry } from '../assets';

export const VISUAL_CATALOG_DEV_ONLY = true;

export const VISUAL_CATALOG_GROUPS: ReadonlyArray<Readonly<{ title: string; keys: readonly AssetKey[] }>> = [
  { title: 'Creature states', keys: ['creature.base', 'creature.mutation.crystal', 'creature.mutation.void', 'creature.mutation.wings', 'creature.mutation.pumpkin'] },
  { title: 'Evolutions', keys: ['evolution.voidshard', 'evolution.skyshard', 'evolution.nightwing', 'evolution.jack-o-void', 'evolution.harvestshard', 'evolution.hollowwing'] },
  { title: 'Harvest Colossus', keys: ['boss.halloween.base', 'boss.halloween.damage1', 'boss.halloween.damage2'] },
  { title: 'Arena production kits', keys: ['arena.landmark.arch', 'arena.landmark.pillar', 'arena.landmark.wall', 'arena.landmark.rock', 'arena.crystal.large', 'arena.landmark.harvestRoot', 'ground.impactCrack', 'ground.fissure.orange'] },
  { title: 'Loot and companion', keys: ['loot.common', 'loot.rare', 'loot.epic', 'pet.emberWisp'] },
  { title: 'Combat VFX', keys: ['vfx.projectile', 'vfx.powerHit', 'vfx.impact', 'vfx.shockwave', 'vfx.corruption', 'vfx.pickup'] },
  { title: 'Mutation icons', keys: ['icon.mutation.crystal', 'icon.mutation.void', 'icon.mutation.wings', 'icon.mutation.pumpkin'] },
];

export type AssetAuditStatus = 'PRODUCTION' | 'FALLBACK' | 'MISSING' | 'FAILED';

export function assetAuditStatus(assets: AssetRegistry, key: AssetKey): AssetAuditStatus {
  const resolved = assets.resolve(key);
  if (resolved.mode === 'production') return 'PRODUCTION';
  if (resolved.failed) return 'FAILED';
  return assets.definition(key).src ? 'MISSING' : 'FALLBACK';
}

export function renderVisualCatalog(assets: AssetRegistry): string {
  return VISUAL_CATALOG_GROUPS.map((group) => `<section><h2>${group.title}</h2><div>${group.keys.map((key) => {
    const resolved = assets.resolve(key);
    const status = assetAuditStatus(assets, key);
    const src = assets.source(key);
    return `<article data-asset-key="${key}" data-mode="${resolved.mode}" data-audit-status="${status}">${src ? `<img src="${src}" alt="">` : '<i aria-hidden="true"></i>'}<strong>${key.split('.').at(-1)}</strong><small>${status}</small></article>`;
  }).join('')}</div></section>`).join('');
}
