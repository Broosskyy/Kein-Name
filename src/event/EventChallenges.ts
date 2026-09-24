import type { EvolutionId, Mutation, RunResult } from '../types';

export type ChallengeMetric = 'runs' | 'powerHits' | 'mutation' | 'evolution' | 'uniqueEvolutions';

export interface EventChallengeDefinition {
  id: string;
  title: string;
  metric: ChallengeMetric;
  target: number;
  mutationId?: Mutation;
  evolutionId?: EvolutionId;
  rewardEnergy: number;
}

export const HALLOWEEN_CHALLENGES: readonly EventChallengeDefinition[] = [
  { id: 'power-five', title: 'LAND 5 POWER HITS', metric: 'powerHits', target: 5, rewardEnergy: 40 },
  { id: 'defeat-harvest', title: 'DEFEAT HARVEST COLOSSUS', metric: 'runs', target: 1, rewardEnergy: 60 },
  { id: 'use-pumpkin', title: 'AWAKEN PUMPKIN', metric: 'mutation', mutationId: 'pumpkin', target: 1, rewardEnergy: 45 },
  { id: 'discover-jack', title: "DISCOVER JACK O'VOID", metric: 'evolution', evolutionId: 'jack-o-void', target: 1, rewardEnergy: 75 },
  { id: 'discover-harvest', title: 'DISCOVER HARVESTSHARD', metric: 'evolution', evolutionId: 'harvestshard', target: 1, rewardEnergy: 75 },
  { id: 'discover-hollow', title: 'DISCOVER HOLLOWWING', metric: 'evolution', evolutionId: 'hollowwing', target: 1, rewardEnergy: 75 },
  { id: 'all-six', title: 'DISCOVER ALL 6 EVOLUTIONS', metric: 'uniqueEvolutions', target: 6, rewardEnergy: 160 },
] as const;

export function challengeRunDelta(challenge: EventChallengeDefinition, run: RunResult, uniqueEvolutionCount: number): number {
  if (challenge.metric === 'runs') return run.bossDefeated ? 1 : 0;
  if (challenge.metric === 'powerHits') return run.powerHits;
  if (challenge.metric === 'mutation') return challenge.mutationId && run.mutationIds.includes(challenge.mutationId) ? 1 : 0;
  if (challenge.metric === 'evolution') return run.evolutionId === challenge.evolutionId ? 1 : 0;
  return uniqueEvolutionCount;
}
