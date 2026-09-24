import type { AssetKey } from '../assets';
import type { EvolutionId, Mutation } from '../types';
import type { BossDamageStage } from './VisualState';

export interface VisualAnchor { x: number; y: number }
export interface CreatureAnchors {
  head: VisualAnchor;
  body: VisualAnchor;
  back: VisualAnchor;
  leftWing: VisualAnchor;
  rightWing: VisualAnchor;
  attack: VisualAnchor;
  ground: VisualAnchor;
}

export const CREATURE_ANCHORS: CreatureAnchors = {
  head: { x: 0, y: -55 }, body: { x: 0, y: -7 }, back: { x: 0, y: -58 },
  leftWing: { x: -45, y: -37 }, rightWing: { x: 45, y: -37 },
  attack: { x: 63, y: -24 }, ground: { x: 0, y: 70 },
};

export interface MutationVisualDefinition {
  id: Mutation;
  assetKey: AssetKey;
  iconKey: AssetKey;
  accent: number;
  highlight: number;
  renderScale: number;
  silhouette: 'heavy' | 'corrupted' | 'aerial' | 'harvest';
}

export const MUTATION_VISUALS: Readonly<Record<Mutation, MutationVisualDefinition>> = {
  crystal: { id: 'crystal', assetKey: 'creature.mutation.crystal', iconKey: 'icon.mutation.crystal', accent: 0x55dff4, highlight: 0xeaffff, renderScale: 1.08, silhouette: 'heavy' },
  void: { id: 'void', assetKey: 'creature.mutation.void', iconKey: 'icon.mutation.void', accent: 0xa84cff, highlight: 0xf0c7ff, renderScale: 1.05, silhouette: 'corrupted' },
  wings: { id: 'wings', assetKey: 'creature.mutation.wings', iconKey: 'icon.mutation.wings', accent: 0xc55dff, highlight: 0xffdb82, renderScale: 1.06, silhouette: 'aerial' },
  pumpkin: { id: 'pumpkin', assetKey: 'creature.mutation.pumpkin', iconKey: 'icon.mutation.pumpkin', accent: 0xff762f, highlight: 0xffd06b, renderScale: 1.1, silhouette: 'harvest' },
};

export interface EvolutionVisualDefinition {
  id: EvolutionId;
  assetKey: AssetKey;
  accent: number;
  secondary: number;
  renderScale: number;
  profile: 'heavy' | 'aerial' | 'predator' | 'abomination' | 'mineral-harvest' | 'ember-aerial';
}

export const EVOLUTION_VISUALS: Readonly<Record<EvolutionId, EvolutionVisualDefinition>> = {
  voidshard: { id: 'voidshard', assetKey: 'evolution.voidshard', accent: 0x74eaff, secondary: 0xb64dff, renderScale: 1.18, profile: 'heavy' },
  skyshard: { id: 'skyshard', assetKey: 'evolution.skyshard', accent: 0xa1efff, secondary: 0xffd46a, renderScale: 1.12, profile: 'aerial' },
  nightwing: { id: 'nightwing', assetKey: 'evolution.nightwing', accent: 0xc059ff, secondary: 0x311044, renderScale: 1.12, profile: 'predator' },
  'jack-o-void': { id: 'jack-o-void', assetKey: 'evolution.jack-o-void', accent: 0xff7a32, secondary: 0xa53eff, renderScale: 1.2, profile: 'abomination' },
  harvestshard: { id: 'harvestshard', assetKey: 'evolution.harvestshard', accent: 0x79eaff, secondary: 0xff7b30, renderScale: 1.17, profile: 'mineral-harvest' },
  hollowwing: { id: 'hollowwing', assetKey: 'evolution.hollowwing', accent: 0xff8a37, secondary: 0x6b2a92, renderScale: 1.14, profile: 'ember-aerial' },
};

export function bossVisualKey(halloween: boolean, stage: BossDamageStage): AssetKey {
  const theme = halloween ? 'halloween' : 'standard';
  if (stage === 'intact') return `boss.${theme}.base`;
  if (stage === 'fractured') return `boss.${theme}.damage1`;
  return `boss.${theme}.damage2`;
}

export function arenaVisualKeys(halloween: boolean): readonly AssetKey[] {
  return halloween ? ['arena.halloween.background', 'arena.halloween.foreground'] : ['arena.standard.background'];
}
