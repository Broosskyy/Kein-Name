export interface EventMilestoneDefinition {
  id: string;
  title: string;
  energy: number;
  rewardId: string;
}

export interface EventRewardDefinition {
  id: string;
  name: string;
  kind: 'trail' | 'badge' | 'frame' | 'title';
}

export const HALLOWEEN_REWARDS: readonly EventRewardDefinition[] = [
  { id: 'pumpkin-ember-trail', name: 'PUMPKIN EMBER TRAIL', kind: 'trail' },
  { id: 'harvest-badge', name: 'HARVEST BADGE', kind: 'badge' },
  { id: 'jack-void-frame', name: "JACK O'VOID FRAME", kind: 'frame' },
  { id: 'harvest-master', name: 'HARVEST MASTER', kind: 'title' },
] as const;

export const HALLOWEEN_MILESTONES: readonly EventMilestoneDefinition[] = [
  { id: 'first-run', title: 'FIRST HARVEST', energy: 100, rewardId: 'pumpkin-ember-trail' },
  { id: 'two-evolutions', title: 'TWO FORMS AWAKENED', energy: 260, rewardId: 'harvest-badge' },
  { id: 'three-defeats', title: 'COLOSSUS HUNTER', energy: 520, rewardId: 'jack-void-frame' },
  { id: 'pumpkin-master', title: 'DARK HARVEST MASTER', energy: 900, rewardId: 'harvest-master' },
] as const;
