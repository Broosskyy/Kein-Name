export type Mutation = 'crystal' | 'void' | 'wings' | 'pumpkin';
export type BreakpointId = 'break-1' | 'break-2';
export type EvolutionId = 'voidshard' | 'skyshard' | 'nightwing' | 'jack-o-void' | 'harvestshard' | 'hollowwing';
export type RunPhase = 'playing' | 'choice' | 'upgrade' | 'cycle' | 'finalizing' | 'result' | 'failed';
export type AttackKind = 'normal' | 'power' | 'voidEcho' | 'wingVolley' | 'pumpkinBurst';

export interface AttackResult {
  accepted: boolean;
  kind: AttackKind;
  damage: number;
  hpBefore: number;
  hpAfter: number;
  triggeredBreakpointId?: BreakpointId;
  bossDefeated?: boolean;
}

export interface RunBreakpointRecord {
  breakpointId: BreakpointId;
  threshold: number;
  bossHp: number;
  elapsedMs: number;
  choices: Mutation[];
  selectedMutationId?: Mutation;
}

export interface RunContract {
  schemaVersion: number;
  clientVersion: string;
  runId: string;
  bossId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  totalDamage: number;
  buildDamage: number;
  powerHits: number;
  seed: number;
  mutationIds: Mutation[];
  evolutionId: EvolutionId;
  evolutionName: string;
  buildId: string;
  breakpointEvents: RunBreakpointRecord[];
  bossDefeated: boolean;
  qualityProfile: string;
  eventId?: string;
  eventConfigVersion?: number;
  eventThemeId?: string;
  eventProgressEarned?: number;
  eventChallengeProgress?: Record<string, number>;
  isNewEvolutionDiscovery?: boolean;
  runMode?: string;
  bossCyclesCleared?: number;
  runLevel?: number;
  upgradeIds?: string[];
  pickupCount?: number;
  lootSummary?: Record<string, number>;
  playerDefeated?: boolean;
}

export type RunResult = RunContract;
