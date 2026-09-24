import type { CosmeticLoadout } from '../gameplay/Equipment';
import type { EvolutionId, Mutation } from '../types';

export const PLAYER_PROGRESS_VERSION = 1;

export interface PlayerProgress {
  schemaVersion: number; guestId: string; playerLevel: number; playerXp: number;
  unlockedCreatureIds: string[]; unlockedMutationIds: Mutation[]; unlockedEvolutionIds: EvolutionId[];
  permanentEquipmentIds: string[]; petIds: string[]; cosmeticIds: string[]; mastery: Record<string, number>;
  achievementIds: string[]; currencies: Record<string, number>; settings: Record<string, string | number | boolean>;
  statistics: { runsStarted: number; runsCompleted: number; bossCyclesCleared: number; totalDamage: number; pickups: number };
  cosmeticLoadout: CosmeticLoadout; updatedAt: string;
}

export function createGuestId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return `guest-${cryptoApi.randomUUID()}`;
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createPlayerProgress(guestId = createGuestId()): PlayerProgress {
  return {
    schemaVersion: PLAYER_PROGRESS_VERSION, guestId, playerLevel: 1, playerXp: 0,
    unlockedCreatureIds: ['base'], unlockedMutationIds: [], unlockedEvolutionIds: [], permanentEquipmentIds: [],
    petIds: [], cosmeticIds: [], mastery: {}, achievementIds: [], currencies: {}, settings: {},
    statistics: { runsStarted: 0, runsCompleted: 0, bossCyclesCleared: 0, totalDamage: 0, pickups: 0 },
    cosmeticLoadout: { emoteIds: [] }, updatedAt: new Date(0).toISOString(),
  };
}

export function awardPersistentProgress(progress: PlayerProgress, cycles: number, damage: number, pickups: number): void {
  progress.playerXp += cycles * 80 + Math.floor(damage / 250);
  progress.statistics.runsCompleted += 1; progress.statistics.bossCyclesCleared += cycles;
  progress.statistics.totalDamage += Math.max(0, damage); progress.statistics.pickups += pickups;
  while (progress.playerXp >= progress.playerLevel * 250) { progress.playerXp -= progress.playerLevel * 250; progress.playerLevel += 1; }
  progress.updatedAt = new Date().toISOString();
}
