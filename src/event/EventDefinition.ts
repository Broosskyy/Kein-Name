import type { Mutation } from '../types';

export interface EventDefinition {
  id: string;
  displayName: string;
  themeId: 'halloween';
  enabled: boolean;
  startsAt: string;
  endsAt: string;
  mutationPool: readonly Mutation[];
  bossVariantId: string;
  challengeSetId: string;
  rewardTrackId: string;
  eventConfigVersion: number;
  progressName: string;
}

export const HALLOWEEN_2026: EventDefinition = {
  id: 'halloween_2026',
  displayName: 'HALLOWEEN 2026',
  themeId: 'halloween',
  enabled: true,
  startsAt: '2026-10-01T00:00:00.000Z',
  endsAt: '2026-11-03T23:59:59.999Z',
  mutationPool: ['crystal', 'void', 'wings', 'pumpkin'],
  bossVariantId: 'harvest-colossus-2026',
  challengeSetId: 'halloween-2026-core',
  rewardTrackId: 'halloween-2026-milestones',
  eventConfigVersion: 1,
  progressName: 'HARVEST ENERGY',
};

// Prototype activation is explicit. Production eligibility and event time must
// eventually come from a server-authoritative configuration, never device time.
export const EVENT_CONFIG = { halloweenEnabled: HALLOWEEN_2026.enabled } as const;
