import type { EvolutionId, Mutation } from '../types';

export interface EventState {
  schemaVersion: 1;
  eventId: string;
  eventConfigVersion: number;
  eventProgress: number;
  completedRuns: number;
  bossKills: number;
  discoveredMutationIds: Mutation[];
  discoveredEvolutionIds: EvolutionId[];
  bestDamageByEvolution: Partial<Record<EvolutionId, number>>;
  challengeProgress: Record<string, number>;
  completedChallenges: string[];
  unlockedRewards: string[];
  milestones: string[];
  eventCompleted: boolean;
}

export function createInitialEventState(eventId: string, eventConfigVersion: number): EventState {
  return {
    schemaVersion: 1,
    eventId,
    eventConfigVersion,
    eventProgress: 0,
    completedRuns: 0,
    bossKills: 0,
    discoveredMutationIds: [],
    discoveredEvolutionIds: [],
    bestDamageByEvolution: {},
    challengeProgress: {},
    completedChallenges: [],
    unlockedRewards: [],
    milestones: [],
    eventCompleted: false,
  };
}

export function isEventState(value: unknown, eventId: string, version: number): value is EventState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EventState>;
  return candidate.schemaVersion === 1 && candidate.eventId === eventId && candidate.eventConfigVersion === version
    && typeof candidate.eventProgress === 'number' && Number.isFinite(candidate.eventProgress)
    && typeof candidate.completedRuns === 'number' && typeof candidate.bossKills === 'number'
    && Array.isArray(candidate.discoveredMutationIds) && Array.isArray(candidate.discoveredEvolutionIds)
    && candidate.bestDamageByEvolution !== null && typeof candidate.bestDamageByEvolution === 'object'
    && candidate.challengeProgress !== null && typeof candidate.challengeProgress === 'object'
    && Array.isArray(candidate.completedChallenges) && Array.isArray(candidate.unlockedRewards)
    && Array.isArray(candidate.milestones) && typeof candidate.eventCompleted === 'boolean';
}
