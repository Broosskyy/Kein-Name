import type { GameDomainEvent } from '../core/DomainEvents';
import type { EvolutionId, RunResult } from '../types';
import { HALLOWEEN_CHALLENGES, challengeRunDelta } from './EventChallenges';
import type { EventDefinition } from './EventDefinition';
import { HALLOWEEN_MILESTONES } from './EventRewards';
import type { EventState } from './EventState';
import { EventStore } from './EventStore';

export interface EventRunOutcome {
  energyEarned: number;
  newEvolution?: EvolutionId;
  completedChallenges: string[];
  reachedMilestones: string[];
  unlockedRewards: string[];
  eventCompletedNow: boolean;
}

export class EventProgress {
  state: EventState;

  constructor(
    readonly definition: EventDefinition,
    private readonly store: EventStore,
    private readonly emit: (event: GameDomainEvent) => void = () => undefined,
  ) {
    this.state = store.load();
  }

  applyRun(run: RunResult): EventRunOutcome {
    const completedChallenges: string[] = [];
    const reachedMilestones: string[] = [];
    const unlockedRewards: string[] = [];
    const wasCompleted = this.state.eventCompleted;
    const isNewEvolution = !this.state.discoveredEvolutionIds.includes(run.evolutionId);

    this.state.completedRuns += 1;
    if (run.bossDefeated) this.state.bossKills += 1;
    for (const mutation of run.mutationIds) addUnique(this.state.discoveredMutationIds, mutation);
    if (isNewEvolution) {
      addUnique(this.state.discoveredEvolutionIds, run.evolutionId);
      this.emit({ type: 'EVOLUTION_DISCOVERED', eventId: this.definition.id, evolutionId: run.evolutionId });
    }
    this.state.bestDamageByEvolution[run.evolutionId] = Math.max(this.state.bestDamageByEvolution[run.evolutionId] ?? 0, run.totalDamage);

    let energyEarned = 80 + run.powerHits * 4 + (isNewEvolution ? 35 : 0);
    for (const challenge of HALLOWEEN_CHALLENGES) {
      if (this.state.completedChallenges.includes(challenge.id)) continue;
      const previous = this.state.challengeProgress[challenge.id] ?? 0;
      const delta = challenge.metric === 'uniqueEvolutions'
        ? Math.max(0, this.state.discoveredEvolutionIds.length - previous)
        : challengeRunDelta(challenge, run, this.state.discoveredEvolutionIds.length);
      const next = Math.min(challenge.target, previous + delta);
      this.state.challengeProgress[challenge.id] = next;
      if (next !== previous) this.emit({ type: 'CHALLENGE_PROGRESSED', eventId: this.definition.id, challengeId: challenge.id, progress: next, target: challenge.target });
      if (next >= challenge.target) {
        addUnique(this.state.completedChallenges, challenge.id);
        completedChallenges.push(challenge.id);
        energyEarned += challenge.rewardEnergy;
        this.emit({ type: 'CHALLENGE_COMPLETED', eventId: this.definition.id, challengeId: challenge.id });
      }
    }

    this.state.eventProgress += energyEarned;
    this.emit({ type: 'EVENT_PROGRESS_EARNED', eventId: this.definition.id, amount: energyEarned, total: this.state.eventProgress });
    for (const milestone of HALLOWEEN_MILESTONES) {
      if (this.state.eventProgress < milestone.energy || this.state.milestones.includes(milestone.id)) continue;
      addUnique(this.state.milestones, milestone.id);
      reachedMilestones.push(milestone.id);
      this.emit({ type: 'MILESTONE_REACHED', eventId: this.definition.id, milestoneId: milestone.id });
      if (!this.state.unlockedRewards.includes(milestone.rewardId)) {
        addUnique(this.state.unlockedRewards, milestone.rewardId);
        unlockedRewards.push(milestone.rewardId);
        this.emit({ type: 'EVENT_REWARD_UNLOCKED', eventId: this.definition.id, rewardId: milestone.rewardId });
      }
    }

    this.state.eventCompleted = this.state.discoveredEvolutionIds.length === 6
      && this.state.milestones.length === HALLOWEEN_MILESTONES.length;
    const eventCompletedNow = this.state.eventCompleted && !wasCompleted;
    if (eventCompletedNow) this.emit({ type: 'EVENT_COMPLETED', eventId: this.definition.id });

    run.eventProgressEarned = energyEarned;
    run.isNewEvolutionDiscovery = isNewEvolution;
    run.eventChallengeProgress = { ...this.state.challengeProgress };
    this.store.save(this.state);
    return { energyEarned, newEvolution: isNewEvolution ? run.evolutionId : undefined, completedChallenges, reachedMilestones, unlockedRewards, eventCompletedNow };
  }

  reset(): void { this.state = this.store.reset(); }

  addProgress(amount: number): void {
    this.state.eventProgress = Math.max(0, this.state.eventProgress + amount);
    this.store.save(this.state);
  }

  unlockAllEvolutions(evolutions: readonly EvolutionId[]): void {
    evolutions.forEach((id) => addUnique(this.state.discoveredEvolutionIds, id));
    this.store.save(this.state);
  }

  completeChallenge(id: string): void {
    const definition = HALLOWEEN_CHALLENGES.find((item) => item.id === id);
    if (!definition || this.state.completedChallenges.includes(id)) return;
    this.state.challengeProgress[id] = definition.target;
    addUnique(this.state.completedChallenges, id);
    this.store.save(this.state);
  }

  forceComplete(): void {
    this.unlockAllEvolutions(['voidshard', 'skyshard', 'nightwing', 'jack-o-void', 'harvestshard', 'hollowwing']);
    this.state.eventProgress = HALLOWEEN_MILESTONES.at(-1)?.energy ?? 900;
    for (const milestone of HALLOWEEN_MILESTONES) {
      addUnique(this.state.milestones, milestone.id);
      addUnique(this.state.unlockedRewards, milestone.rewardId);
    }
    this.state.eventCompleted = true;
    this.store.save(this.state);
  }
}

function addUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) values.push(value);
}
