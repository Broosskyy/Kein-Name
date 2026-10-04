import type { FieldMonsterDefeat } from './FieldMonsterSystem';
import type { WorldQuestDefinition } from './WorldMapDefinition';

export interface WorldQuestState { id: string; progress: number; complete: boolean; rewardClaimed: boolean }

export class WorldQuestSystem {
  readonly states: WorldQuestState[];
  constructor(readonly definitions: readonly WorldQuestDefinition[]) {
    this.states = definitions.map((quest) => ({ id: quest.id, progress: 0, complete: false, rewardClaimed: false }));
  }

  onMonsterDefeated(defeat: FieldMonsterDefeat): WorldQuestDefinition[] {
    const completed: WorldQuestDefinition[] = [];
    for (const definition of this.definitions) {
      const state = this.states.find((candidate) => candidate.id === definition.id);
      if (!state || state.complete || definition.targetSpecies !== defeat.species) continue;
      state.progress = Math.min(definition.targetCount, state.progress + 1);
      if (state.progress >= definition.targetCount) { state.complete = true; completed.push(definition); }
    }
    return completed;
  }

  state(id: string): WorldQuestState | undefined { return this.states.find((candidate) => candidate.id === id); }
}

