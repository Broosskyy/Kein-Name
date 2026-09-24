import type { AssetKey } from './assets';
import type { BreakpointId, EvolutionId, Mutation } from './types';

export interface BreakpointDefinition {
  id: BreakpointId;
  threshold: number;
}

export interface BossDefinition {
  id: string;
  name: string;
  maxHp: number;
  breakpoints: readonly BreakpointDefinition[];
  weakpoint: { x: number; y: number };
  visualKey: AssetKey;
}

export interface MutationDefinition {
  id: Mutation;
  name: string;
  shortDescription: string;
  damageModifier: number;
  attackBehaviorKey: 'crystal-shot' | 'void-echo' | 'wing-speed' | 'pumpkin-burst';
  visualKey: AssetKey;
}

export const ACTIVE_BOSS: BossDefinition = {
  id: 'fractured-colossus-m01',
  name: 'Fractured Colossus',
  maxHp: 3200,
  breakpoints: [
    { id: 'break-1', threshold: 0.7 },
    { id: 'break-2', threshold: 0.4 },
  ],
  weakpoint: { x: 0, y: 8 },
  visualKey: 'boss.standard.base',
};

export const HALLOWEEN_BOSS: BossDefinition = {
  ...ACTIVE_BOSS,
  id: 'harvest-colossus-2026',
  name: 'Harvest Colossus',
  visualKey: 'boss.halloween.base',
};

export const MUTATIONS: readonly MutationDefinition[] = [
  {
    id: 'crystal',
    name: 'Crystal',
    shortDescription: 'Heavy Shot',
    damageModifier: 1.22,
    attackBehaviorKey: 'crystal-shot',
    visualKey: 'creature.mutation.crystal',
  },
  {
    id: 'void',
    name: 'Void',
    shortDescription: 'Echo Hit',
    damageModifier: 1,
    attackBehaviorKey: 'void-echo',
    visualKey: 'creature.mutation.void',
  },
  {
    id: 'wings',
    name: 'Wings',
    shortDescription: 'Faster Attack',
    damageModifier: 1,
    attackBehaviorKey: 'wing-speed',
    visualKey: 'creature.mutation.wings',
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    shortDescription: 'Burst Impact',
    damageModifier: 1,
    attackBehaviorKey: 'pumpkin-burst',
    visualKey: 'creature.mutation.pumpkin',
  },
] as const;

export const MUTATION_BY_ID: Readonly<Record<Mutation, MutationDefinition>> = Object.fromEntries(
  MUTATIONS.map((mutation) => [mutation.id, mutation]),
) as Record<Mutation, MutationDefinition>;

export interface EvolutionDefinition {
  id: EvolutionId;
  name: string;
  buildId: string;
  mutations: readonly [Mutation, Mutation];
}

export const EVOLUTIONS: readonly EvolutionDefinition[] = [
  { id: 'voidshard', name: 'VOIDSHARD', buildId: 'crystal+void', mutations: ['crystal', 'void'] },
  { id: 'skyshard', name: 'SKYSHARD', buildId: 'crystal+wings', mutations: ['crystal', 'wings'] },
  { id: 'nightwing', name: 'NIGHTWING', buildId: 'void+wings', mutations: ['void', 'wings'] },
  { id: 'jack-o-void', name: "JACK O'VOID", buildId: 'pumpkin+void', mutations: ['pumpkin', 'void'] },
  { id: 'harvestshard', name: 'HARVESTSHARD', buildId: 'crystal+pumpkin', mutations: ['crystal', 'pumpkin'] },
  { id: 'hollowwing', name: 'HOLLOWWING', buildId: 'pumpkin+wings', mutations: ['pumpkin', 'wings'] },
] as const;

export const STANDARD_MUTATION_IDS: readonly Mutation[] = ['crystal', 'void', 'wings'];
export const HALLOWEEN_MUTATION_IDS: readonly Mutation[] = ['crystal', 'void', 'wings', 'pumpkin'];

export function mutationPoolForEvent(eventEnabled: boolean): readonly Mutation[] {
  return eventEnabled ? HALLOWEEN_MUTATION_IDS : STANDARD_MUTATION_IDS;
}

export function bossForEvent(eventEnabled: boolean): BossDefinition {
  return eventEnabled ? HALLOWEEN_BOSS : ACTIVE_BOSS;
}

export function evolutionFor(mutations: Iterable<Mutation>): EvolutionDefinition {
  const selected = new Set(mutations);
  const evolution = EVOLUTIONS.find((candidate) => candidate.mutations.every((mutation) => selected.has(mutation)));
  if (!evolution) throw new Error('A completed run requires exactly one valid two-mutation evolution.');
  return evolution;
}
