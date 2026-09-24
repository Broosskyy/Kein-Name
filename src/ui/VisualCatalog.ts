import type { AssetKey, AssetRegistry } from '../assets';

export const VISUAL_CATALOG_DEV_ONLY = true;

export const VISUAL_CATALOG_GROUPS: ReadonlyArray<Readonly<{ title: string; keys: readonly AssetKey[] }>> = [
  { title: 'Creature states', keys: ['creature.base', 'creature.mutation.crystal', 'creature.mutation.void', 'creature.mutation.wings', 'creature.mutation.pumpkin'] },
  { title: 'Evolutions', keys: ['evolution.voidshard', 'evolution.skyshard', 'evolution.nightwing', 'evolution.jack-o-void', 'evolution.harvestshard', 'evolution.hollowwing'] },
  { title: 'Harvest Colossus', keys: ['boss.halloween.base', 'boss.halloween.damage1', 'boss.halloween.damage2'] },
  { title: 'Mutation icons', keys: ['icon.mutation.crystal', 'icon.mutation.void', 'icon.mutation.wings', 'icon.mutation.pumpkin'] },
];

export function renderVisualCatalog(assets: AssetRegistry): string {
  return VISUAL_CATALOG_GROUPS.map((group) => `<section><h2>${group.title}</h2><div>${group.keys.map((key) => {
    const resolved = assets.resolve(key);
    const src = assets.source(key);
    return `<article data-asset-key="${key}" data-mode="${resolved.mode}">${src ? `<img src="${src}" alt="">` : '<i aria-hidden="true"></i>'}<strong>${key.split('.').at(-1)}</strong><small>${resolved.mode}${resolved.failed ? ' · load failed' : ''}</small></article>`;
  }).join('')}</div></section>`).join('');
}
