import type { EvolutionId, Mutation } from '../types';
import type { RunModeId } from '../gameplay/RunModes';

export interface PlayerEntitySnapshotContract {
  entityId: string; playerId?: string; tick: number; x: number; y: number; vx: number; vy: number;
  hp: number; mutationIds: Mutation[]; evolutionId?: EvolutionId; upgradeIds: string[];
}

export interface BossStateSnapshotContract { bossId: string; tick: number; cycle: number; hp: number; maxHp: number; attackIds: string[] }

export interface ContributionContract {
  schemaVersion: number; runId: string; playerId?: string; guestId?: string; runMode: RunModeId;
  bossId: string; eventId?: string; countryCode?: string; bossCyclesCleared: number;
  damageDealt: number; breakpoints: string[]; runDurationMs: number; buildId?: string;
  mutations: Mutation[]; upgradeSummary: Array<{ id: string; stacks: number }>;
  lootSummary: Record<string, number>; validation: { clientVersion: string; seed: number; snapshotHash?: string };
}

export interface AuthoritativeGameplayPort {
  submitContribution(result: ContributionContract): Promise<void>;
  // Future only: server snapshots, reconnect, authoritative loot/rewards and clock sync.
}

export function isJsonSafeContract(value: unknown): boolean {
  try { return JSON.parse(JSON.stringify(value)) !== undefined; } catch { return false; }
}
