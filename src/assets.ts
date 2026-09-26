import { Assets, Texture } from 'pixi.js';

export type AssetKey =
  | 'creature.base'
  | 'creature.mutation.crystal'
  | 'creature.mutation.void'
  | 'creature.mutation.wings'
  | 'creature.mutation.pumpkin'
  | 'evolution.voidshard'
  | 'evolution.skyshard'
  | 'evolution.nightwing'
  | 'evolution.jack-o-void'
  | 'evolution.harvestshard'
  | 'evolution.hollowwing'
  | 'boss.standard.base'
  | 'boss.standard.damage1'
  | 'boss.standard.damage2'
  | 'boss.halloween.base'
  | 'boss.halloween.damage1'
  | 'boss.halloween.damage2'
  | 'boss.core'
  | 'boss.core.unstable'
  | 'boss.armor.fragments'
  | 'arena.standard.background'
  | 'arena.halloween.background'
  | 'arena.halloween.foreground'
  | 'arena.landmark.crystal'
  | 'arena.landmark.pillar'
  | 'arena.landmark.harvestRoot'
  | 'arena.floor.detail'
  | 'arena.landmark.rock'
  | 'arena.landmark.fissure'
  | 'arena.landmark.corruption'
  | 'arena.landmark.arch'
  | 'arena.landmark.brokenArch'
  | 'arena.landmark.brokenPillar'
  | 'arena.landmark.wall'
  | 'arena.landmark.rubble'
  | 'arena.landmark.altar'
  | 'arena.crystal.small'
  | 'arena.crystal.medium'
  | 'arena.crystal.large'
  | 'arena.crystal.corrupted'
  | 'arena.corruption.stone'
  | 'arena.corruption.ruin'
  | 'arena.crystal.shards'
  | 'ground.crack'
  | 'ground.impactCrack'
  | 'ground.fissure.orange'
  | 'ground.fissure.dormant'
  | 'ground.scorch'
  | 'ground.corruption'
  | 'ground.rubble'
  | 'ground.crystalFragments'
  | 'loot.common'
  | 'loot.rare'
  | 'loot.epic'
  | 'loot.common.alt'
  | 'loot.rare.alt'
  | 'loot.epic.alt'
  | 'loot.legendaryReady'
  | 'pet.emberWisp'
  | 'icon.mutation.crystal'
  | 'icon.mutation.void'
  | 'icon.mutation.wings'
  | 'icon.mutation.pumpkin'
  | 'essence.crystal'
  | 'essence.void'
  | 'essence.wings'
  | 'essence.pumpkin'
  | 'vfx.projectile'
  | 'vfx.powerHit'
  | 'vfx.impact'
  | 'vfx.telegraphNoise'
  | 'vfx.crack'
  | 'vfx.scorch'
  | 'vfx.shockwave'
  | 'vfx.corruption'
  | 'vfx.pickup'
  | 'ui.powerHit';

export type AssetKind = 'character' | 'mutation-part' | 'boss' | 'background' | 'foreground' | 'icon' | 'effect' | 'ui';

export interface AssetEntry {
  src?: string;
  fallback: 'procedural';
  kind: AssetKind;
  recommendedSize: readonly [number, number];
  alpha: boolean;
  preload: 'essential' | 'deferred';
}

export type AssetManifest = Readonly<Record<AssetKey, AssetEntry>>;
export type AssetResolution = Readonly<{ key: AssetKey; mode: 'production' | 'procedural'; texture?: Texture; failed: boolean }>;
export type AssetTextureLoader = (src: string) => Promise<Texture>;

const entry = (kind: AssetKind, size: readonly [number, number], alpha = true, preload: AssetEntry['preload'] = 'essential'): AssetEntry => ({
  fallback: 'procedural', kind, recommendedSize: size, alpha, preload,
});

// Add a local WebP/PNG src to any slot. Rendering prefers it automatically and
// preserves a coherent procedural fallback when it is absent or fails to load.
export const ASSET_MANIFEST: AssetManifest = {
  'creature.base': { ...entry('character', [768, 768]), src: '/assets/creature/creature-base.webp' },
  'creature.mutation.crystal': entry('mutation-part', [768, 768]),
  'creature.mutation.void': entry('mutation-part', [768, 768]),
  'creature.mutation.wings': entry('mutation-part', [1024, 768]),
  'creature.mutation.pumpkin': entry('mutation-part', [768, 768]),
  'evolution.voidshard': entry('character', [1024, 1024]),
  'evolution.skyshard': entry('character', [1280, 1024]),
  'evolution.nightwing': entry('character', [1280, 1024]),
  'evolution.jack-o-void': entry('character', [1024, 1024]),
  'evolution.harvestshard': entry('character', [1024, 1024]),
  'evolution.hollowwing': entry('character', [1280, 1024]),
  'boss.standard.base': entry('boss', [1280, 1280]),
  'boss.standard.damage1': entry('boss', [1280, 1280]),
  'boss.standard.damage2': entry('boss', [1280, 1280]),
  'boss.halloween.base': { ...entry('boss', [1280, 1280]), src: '/assets/boss/harvest-colossus-base.webp' },
  'boss.halloween.damage1': { ...entry('boss', [1280, 1280]), src: '/assets/boss/harvest-colossus-break1.webp' },
  'boss.halloween.damage2': { ...entry('boss', [1280, 1280]), src: '/assets/boss/harvest-colossus-break2.webp' },
  'boss.core': entry('effect', [384, 384]),
  'boss.core.unstable': { ...entry('boss', [1280, 1280]), src: '/assets/boss/harvest-colossus-core.webp' },
  'boss.armor.fragments': entry('foreground', [1024, 768], true, 'deferred'),
  'arena.standard.background': entry('background', [1600, 1200], false),
  'arena.halloween.background': entry('background', [1600, 1200], false),
  'arena.halloween.foreground': entry('foreground', [1600, 1200], true, 'deferred'),
  'arena.landmark.crystal': { ...entry('foreground', [512, 768], true, 'deferred'), src: '/assets/environment/arena-crystal-large-01.webp' },
  'arena.landmark.pillar': { ...entry('foreground', [512, 1024], true, 'deferred'), src: '/assets/environment/arena-ruin-pillar-01.webp' },
  'arena.landmark.harvestRoot': { ...entry('foreground', [768, 768], true, 'deferred'), src: '/assets/environment/arena-corruption-root-01.webp' },
  'arena.floor.detail': entry('background', [1024, 1024], true, 'deferred'),
  'arena.landmark.rock': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/environment/arena-rock-formation-01.webp' },
  'arena.landmark.fissure': { ...entry('foreground', [768, 384], true, 'deferred'), src: '/assets/ground/ground-fissure-orange-01.webp' },
  'arena.landmark.corruption': { ...entry('foreground', [768, 768], true, 'deferred'), src: '/assets/environment/arena-corruption-ruin-01.webp' },
  'arena.landmark.arch': { ...entry('foreground', [1024, 1024], true, 'deferred'), src: '/assets/environment/arena-ruined-arch-01.webp' },
  'arena.landmark.brokenArch': { ...entry('foreground', [768, 768], true, 'deferred'), src: '/assets/environment/arena-broken-arch-01.webp' },
  'arena.landmark.brokenPillar': { ...entry('foreground', [512, 768], true, 'deferred'), src: '/assets/environment/arena-broken-pillar-01.webp' },
  'arena.landmark.wall': { ...entry('foreground', [768, 512], true, 'deferred'), src: '/assets/environment/arena-collapsed-wall-01.webp' },
  'arena.landmark.rubble': { ...entry('foreground', [512, 384], true, 'deferred'), src: '/assets/environment/arena-rubble-cluster-01.webp' },
  'arena.landmark.altar': { ...entry('foreground', [768, 768], true, 'deferred'), src: '/assets/environment/arena-altar-fragment-01.webp' },
  'arena.crystal.small': { ...entry('foreground', [384, 384], true, 'deferred'), src: '/assets/environment/arena-crystal-small-01.webp' },
  'arena.crystal.medium': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/environment/arena-crystal-medium-01.webp' },
  'arena.crystal.large': { ...entry('foreground', [768, 768], true, 'deferred'), src: '/assets/environment/arena-crystal-large-01.webp' },
  'arena.crystal.corrupted': { ...entry('foreground', [768, 768], true, 'deferred'), src: '/assets/environment/arena-crystal-corrupted-01.webp' },
  'arena.corruption.stone': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/environment/arena-corruption-stone-01.webp' },
  'arena.corruption.ruin': { ...entry('foreground', [768, 768], true, 'deferred'), src: '/assets/environment/arena-corruption-ruin-01.webp' },
  'arena.crystal.shards': { ...entry('foreground', [384, 384], true, 'deferred'), src: '/assets/environment/arena-crystal-shards-01.webp' },
  'ground.crack': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/ground/ground-crack-01.webp' },
  'ground.impactCrack': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/ground/ground-impact-crack-01.webp' },
  'ground.fissure.orange': { ...entry('foreground', [768, 384], true, 'deferred'), src: '/assets/ground/ground-fissure-orange-01.webp' },
  'ground.fissure.dormant': { ...entry('foreground', [768, 384], true, 'deferred'), src: '/assets/ground/ground-fissure-dormant-01.webp' },
  'ground.scorch': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/ground/ground-scorch-01.webp' },
  'ground.corruption': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/ground/ground-corruption-patch-01.webp' },
  'ground.rubble': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/ground/ground-rubble-debris-01.webp' },
  'ground.crystalFragments': { ...entry('foreground', [512, 512], true, 'deferred'), src: '/assets/ground/ground-crystal-fragments-01.webp' },
  'loot.common': { ...entry('icon', [192, 192], true, 'deferred'), src: '/assets/loot/loot-common-a.webp' },
  'loot.rare': { ...entry('icon', [256, 256], true, 'deferred'), src: '/assets/loot/loot-rare-a.webp' },
  'loot.epic': { ...entry('icon', [320, 320], true, 'deferred'), src: '/assets/loot/loot-epic-a.webp' },
  'loot.common.alt': { ...entry('icon', [192, 192], true, 'deferred'), src: '/assets/loot/loot-common-b.webp' },
  'loot.rare.alt': { ...entry('icon', [256, 256], true, 'deferred'), src: '/assets/loot/loot-rare-b.webp' },
  'loot.epic.alt': { ...entry('icon', [320, 320], true, 'deferred'), src: '/assets/loot/loot-epic-b.webp' },
  'loot.legendaryReady': entry('icon', [384, 384], true, 'deferred'),
  'pet.emberWisp': { ...entry('character', [384, 384], true, 'deferred'), src: '/assets/pet/ember-wisp.webp' },
  'icon.mutation.crystal': entry('icon', [256, 256]),
  'icon.mutation.void': entry('icon', [256, 256]),
  'icon.mutation.wings': entry('icon', [256, 256]),
  'icon.mutation.pumpkin': entry('icon', [256, 256]),
  'essence.crystal': entry('effect', [256, 256]),
  'essence.void': entry('effect', [256, 256]),
  'essence.wings': entry('effect', [256, 256]),
  'essence.pumpkin': entry('effect', [256, 256]),
  'vfx.projectile': { ...entry('effect', [256, 128], true, 'deferred'), src: '/assets/vfx/vfx-projectile-normal.webp' },
  'vfx.powerHit': { ...entry('effect', [512, 256], true, 'deferred'), src: '/assets/vfx/vfx-projectile-power.webp' },
  'vfx.impact': { ...entry('effect', [512, 512], true, 'deferred'), src: '/assets/vfx/vfx-impact-large.webp' },
  'vfx.telegraphNoise': entry('effect', [512, 512], true, 'deferred'),
  'vfx.crack': { ...entry('effect', [512, 512], true, 'deferred'), src: '/assets/vfx/vfx-crack-impact.webp' },
  'vfx.scorch': { ...entry('effect', [512, 512], true, 'deferred'), src: '/assets/ground/ground-scorch-01.webp' },
  'vfx.shockwave': { ...entry('effect', [512, 512], true, 'deferred'), src: '/assets/vfx/vfx-shockwave.webp' },
  'vfx.corruption': { ...entry('effect', [512, 512], true, 'deferred'), src: '/assets/vfx/vfx-corruption.webp' },
  'vfx.pickup': { ...entry('effect', [512, 512], true, 'deferred'), src: '/assets/vfx/vfx-pickup.webp' },
  'ui.powerHit': entry('ui', [512, 192]),
};

export class AssetRegistry {
  private readonly textures = new Map<AssetKey, Texture>();
  private readonly failures = new Set<AssetKey>();

  constructor(
    private readonly manifest: AssetManifest = ASSET_MANIFEST,
    private readonly loadTexture: AssetTextureLoader = (src) => Assets.load<Texture>(src),
  ) {}

  async preload(): Promise<void> {
    const configured = Object.entries(this.manifest).filter((item): item is [AssetKey, AssetEntry & { src: string }] => Boolean(item[1].src));
    await Promise.all(configured.map(async ([key, definition]) => {
      try {
        const texture = await this.loadTexture(definition.src);
        if (!texture) throw new Error('Texture loader returned no texture.');
        this.textures.set(key, texture);
        this.failures.delete(key);
      } catch (error) {
        this.textures.delete(key);
        this.failures.add(key);
        console.warn(`Asset ${key} could not be loaded; using procedural fallback.`, error);
      }
    }));
  }

  texture(key: AssetKey): Texture | undefined { return this.textures.get(key); }
  has(key: AssetKey): boolean { return this.textures.has(key); }
  failed(key: AssetKey): boolean { return this.failures.has(key); }
  definition(key: AssetKey): AssetEntry { return this.manifest[key]; }
  source(key: AssetKey): string | undefined { return this.has(key) ? this.manifest[key].src : undefined; }
  resolve(key: AssetKey): AssetResolution {
    const texture = this.texture(key);
    return texture ? { key, mode: 'production', texture, failed: false } : { key, mode: 'procedural', failed: this.failed(key) };
  }
  catalog(): readonly AssetResolution[] { return (Object.keys(this.manifest) as AssetKey[]).map((key) => this.resolve(key)); }
}
