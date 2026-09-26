import type { AssetKey } from '../assets';

export interface ProductionProp {
  readonly id: string;
  readonly key: AssetKey;
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly mirror?: boolean;
  readonly occludes?: boolean;
}

export interface ProductionGroundDetail {
  readonly id: string;
  readonly key: AssetKey;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly rotation: number;
  readonly alpha: number;
}

/** Authored world composition: large silhouettes define sectors; grouped small
 * details support them without filling open combat lanes. */
export const PRODUCTION_PROPS: readonly ProductionProp[] = [
  { id:'ruin-gate-west', key:'arena.landmark.arch', x:520, y:760, height:760, occludes:true },
  { id:'ruin-pillar-west', key:'arena.landmark.pillar', x:1040, y:1260, height:560, occludes:true },
  { id:'ruin-wall-southwest', key:'arena.landmark.wall', x:820, y:3200, height:330, occludes:true },
  { id:'ruin-altar-south', key:'arena.landmark.altar', x:1780, y:3460, height:430, occludes:true },
  { id:'ruin-gate-east', key:'arena.landmark.brokenArch', x:4920, y:1050, height:650, mirror:true, occludes:true },
  { id:'ruin-pillar-east', key:'arena.landmark.brokenPillar', x:4580, y:1800, height:470, occludes:true },
  { id:'ruin-wall-east', key:'arena.landmark.wall', x:5050, y:3020, height:350, mirror:true, occludes:true },
  { id:'ruin-rubble-north', key:'arena.landmark.rubble', x:2730, y:520, height:270 },

  { id:'crystal-large-west', key:'arena.crystal.large', x:760, y:2300, height:540, occludes:true },
  { id:'crystal-medium-west-a', key:'arena.crystal.medium', x:1180, y:2520, height:330 },
  { id:'crystal-small-west-b', key:'arena.crystal.small', x:520, y:2700, height:240 },
  { id:'crystal-large-east', key:'arena.crystal.corrupted', x:4920, y:2650, height:560, mirror:true, occludes:true },
  { id:'crystal-medium-east-a', key:'arena.crystal.medium', x:4510, y:2960, height:330, mirror:true },
  { id:'crystal-shards-east-b', key:'arena.crystal.shards', x:5220, y:2250, height:230 },

  { id:'corruption-root-northwest', key:'arena.landmark.harvestRoot', x:1700, y:620, height:470, occludes:true },
  { id:'corruption-root-northeast', key:'arena.landmark.harvestRoot', x:4100, y:650, height:520, mirror:true, occludes:true },
  { id:'corruption-stone-south', key:'arena.corruption.stone', x:3300, y:3540, height:350 },
  { id:'corruption-ruin-southeast', key:'arena.corruption.ruin', x:4080, y:3410, height:470, occludes:true },

  { id:'rock-west-edge', key:'arena.landmark.rock', x:320, y:1680, height:310 },
  { id:'rock-east-edge', key:'arena.landmark.rock', x:5320, y:1580, height:340, mirror:true },
  { id:'rock-north', key:'arena.landmark.rock', x:2250, y:360, height:300 },
  { id:'rock-south', key:'arena.landmark.rock', x:2650, y:3770, height:320, mirror:true },
] as const;

export const PRODUCTION_GROUND_DETAILS: readonly ProductionGroundDetail[] = [
  { id:'boss-impact', key:'ground.impactCrack', x:2800, y:1840, width:1040, rotation:0, alpha:.54 },
  { id:'boss-fissure-left', key:'ground.fissure.orange', x:2110, y:1880, width:720, rotation:-.28, alpha:.48 },
  { id:'boss-fissure-right', key:'ground.fissure.orange', x:3530, y:1950, width:760, rotation:.22, alpha:.48 },
  { id:'west-cracks', key:'ground.crack', x:980, y:1960, width:560, rotation:.48, alpha:.36 },
  { id:'east-cracks', key:'ground.crack', x:4620, y:2060, width:590, rotation:-.52, alpha:.36 },
  { id:'ruin-rubble-west', key:'ground.rubble', x:860, y:980, width:420, rotation:.12, alpha:.56 },
  { id:'ruin-rubble-east', key:'ground.rubble', x:4740, y:1320, width:430, rotation:-.18, alpha:.56 },
  { id:'crystal-fragments-west', key:'ground.crystalFragments', x:840, y:2510, width:430, rotation:.36, alpha:.62 },
  { id:'crystal-fragments-east', key:'ground.crystalFragments', x:4740, y:2860, width:460, rotation:-.3, alpha:.62 },
  { id:'corruption-northwest', key:'ground.corruption', x:1700, y:840, width:520, rotation:.2, alpha:.38 },
  { id:'corruption-northeast', key:'ground.corruption', x:4070, y:900, width:560, rotation:-.18, alpha:.4 },
  { id:'corruption-south', key:'ground.corruption', x:3650, y:3380, width:620, rotation:.42, alpha:.36 },
  { id:'scorch-west', key:'ground.scorch', x:1480, y:2750, width:420, rotation:-.2, alpha:.32 },
  { id:'scorch-east', key:'ground.scorch', x:4200, y:2470, width:400, rotation:.34, alpha:.32 },
  { id:'dormant-southwest', key:'ground.fissure.dormant', x:1800, y:3420, width:680, rotation:.08, alpha:.35 },
  { id:'dormant-southeast', key:'ground.fissure.dormant', x:3900, y:3520, width:650, rotation:-.18, alpha:.35 },
] as const;

export function productionCompositionSignature(): string {
  return [...PRODUCTION_PROPS, ...PRODUCTION_GROUND_DETAILS]
    .map((item) => `${item.id}:${item.key}:${item.x}:${item.y}`).join('|');
}
