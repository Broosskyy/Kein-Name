import type { AttackKind, BreakpointId, EvolutionId, Mutation, RunContract } from '../types';

export type GameDomainEvent =
  | { type: 'RUN_STARTED'; runId: string; bossId: string }
  | { type: 'ATTACK_LANDED'; runId: string; atMs: number; attackKind: AttackKind; damage: number; bossHp: number }
  | { type: 'BREAKPOINT_REACHED'; runId: string; atMs: number; breakpointId: BreakpointId; threshold: number; bossHp: number; choices: Mutation[] }
  | { type: 'MUTATION_ACQUIRED'; runId: string; atMs: number; mutationId: Mutation }
  | { type: 'BOSS_DEFEATED'; runId: string; atMs: number; bossId: string }
  | { type: 'RUN_COMPLETED'; runId: string; result: RunContract }
  | { type: 'EVOLUTION_DISCOVERED'; eventId: string; evolutionId: EvolutionId }
  | { type: 'EVENT_PROGRESS_EARNED'; eventId: string; amount: number; total: number }
  | { type: 'CHALLENGE_PROGRESSED'; eventId: string; challengeId: string; progress: number; target: number }
  | { type: 'CHALLENGE_COMPLETED'; eventId: string; challengeId: string }
  | { type: 'MILESTONE_REACHED'; eventId: string; milestoneId: string }
  | { type: 'EVENT_REWARD_UNLOCKED'; eventId: string; rewardId: string }
  | { type: 'EVENT_COMPLETED'; eventId: string };

export type DomainEventListener = (event: GameDomainEvent) => void;

export class DomainEventBus {
  private readonly listeners = new Set<DomainEventListener>();

  emit(event: GameDomainEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: DomainEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
