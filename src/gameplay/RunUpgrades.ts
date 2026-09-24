import type { Mutation } from '../types';
import type { CombatStats } from './ArenaTypes';

export type UpgradeCategory = 'attack' | 'defense' | 'movement' | 'utility' | 'synergy';
export type UpgradeRarity = 'common' | 'rare' | 'epic';
export type StatKey = keyof Pick<CombatStats, 'maxHp' | 'moveSpeed' | 'damageMultiplier' | 'attackRateMultiplier' | 'projectileCount' | 'projectileScale' | 'pickupRadius' | 'mitigation' | 'xpMultiplier'>;

export interface RunUpgradeDefinition {
  id: string;
  name: string;
  shortDescription: string;
  category: UpgradeCategory;
  rarity: UpgradeRarity;
  maxStacks: number;
  prerequisites?: readonly Mutation[];
  exclusions?: readonly string[];
  effects: Partial<Record<StatKey, number>>;
  effectMode?: 'add' | 'multiply';
  visualModifier?: 'large-shot' | 'split-shot' | 'orbitals' | 'shield' | 'magnet' | 'crystal-growth' | 'void-orbit' | 'wing-feathers' | 'ember-vines';
  attackModifier?: 'split' | 'pierce' | 'splash' | 'echo-plus' | 'volley-plus';
}

export const RUN_UPGRADES: readonly RunUpgradeDefinition[] = [
  { id: 'heavy-core', name: 'HEAVY CORE', shortDescription: 'Larger, harder shots', category: 'attack', rarity: 'common', maxStacks: 3, effects: { damageMultiplier: 0.18, projectileScale: 0.16 }, visualModifier: 'large-shot' },
  { id: 'twin-cast', name: 'TWIN CAST', shortDescription: 'Adds a second shot', category: 'attack', rarity: 'rare', maxStacks: 2, effects: { projectileCount: 1 }, effectMode: 'add', visualModifier: 'split-shot', attackModifier: 'split' },
  { id: 'rapid-pulse', name: 'RAPID PULSE', shortDescription: 'Attack faster', category: 'attack', rarity: 'common', maxStacks: 3, effects: { attackRateMultiplier: -0.1 }, effectMode: 'add' },
  { id: 'stoneguard', name: 'STONEGUARD', shortDescription: 'More health and armor', category: 'defense', rarity: 'common', maxStacks: 3, effects: { maxHp: 22, mitigation: 0.06 }, effectMode: 'add', visualModifier: 'shield' },
  { id: 'swift-step', name: 'SWIFT STEP', shortDescription: 'Move faster', category: 'movement', rarity: 'common', maxStacks: 3, effects: { moveSpeed: 38 }, effectMode: 'add' },
  { id: 'essence-magnet', name: 'ESSENCE MAGNET', shortDescription: 'Collect from farther away', category: 'utility', rarity: 'common', maxStacks: 3, effects: { pickupRadius: 34 }, effectMode: 'add', visualModifier: 'magnet' },
  { id: 'scholar-spark', name: 'SCHOLAR SPARK', shortDescription: 'Gain more Run XP', category: 'utility', rarity: 'rare', maxStacks: 2, effects: { xpMultiplier: 0.2 }, effectMode: 'add' },
  { id: 'crystal-crown', name: 'CRYSTAL CROWN', shortDescription: 'Crystal shots pierce', category: 'synergy', rarity: 'epic', maxStacks: 1, prerequisites: ['crystal'], effects: { projectileScale: 0.25 }, effectMode: 'add', visualModifier: 'crystal-growth', attackModifier: 'pierce' },
  { id: 'void-orbit', name: 'VOID ORBIT', shortDescription: 'Stronger echo field', category: 'synergy', rarity: 'epic', maxStacks: 1, prerequisites: ['void'], effects: { damageMultiplier: 0.16 }, effectMode: 'add', visualModifier: 'void-orbit', attackModifier: 'echo-plus' },
  { id: 'storm-feathers', name: 'STORM FEATHERS', shortDescription: 'Additional wing volley', category: 'synergy', rarity: 'epic', maxStacks: 1, prerequisites: ['wings'], effects: { attackRateMultiplier: -0.12 }, effectMode: 'add', visualModifier: 'wing-feathers', attackModifier: 'volley-plus' },
  { id: 'harvest-burst', name: 'HARVEST BURST', shortDescription: 'Pumpkin impacts splash', category: 'synergy', rarity: 'epic', maxStacks: 1, prerequisites: ['pumpkin'], effects: { damageMultiplier: 0.14, projectileScale: 0.18 }, effectMode: 'add', visualModifier: 'ember-vines', attackModifier: 'splash' },
] as const;

export interface SelectedUpgrade { id: string; stacks: number }

export function eligibleUpgrades(selected: readonly SelectedUpgrade[], mutations: ReadonlySet<Mutation>): RunUpgradeDefinition[] {
  return RUN_UPGRADES.filter((upgrade) => {
    const stacks = selected.find((item) => item.id === upgrade.id)?.stacks ?? 0;
    if (stacks >= upgrade.maxStacks) return false;
    if (upgrade.prerequisites?.some((mutation) => !mutations.has(mutation))) return false;
    return !upgrade.exclusions?.some((id) => selected.some((item) => item.id === id));
  });
}

export function applyUpgrades(base: CombatStats, selected: readonly SelectedUpgrade[]): CombatStats {
  const result = { ...base };
  for (const item of selected) {
    const definition = RUN_UPGRADES.find((upgrade) => upgrade.id === item.id);
    if (!definition) continue;
    for (let stack = 0; stack < item.stacks; stack += 1) {
      for (const [key, value] of Object.entries(definition.effects) as [StatKey, number][]) {
        if (definition.effectMode === 'multiply') result[key] *= value;
        else result[key] += value;
      }
    }
  }
  result.attackRateMultiplier = Math.max(0.45, result.attackRateMultiplier);
  result.mitigation = Math.min(0.65, result.mitigation);
  result.projectileCount = Math.min(5, Math.round(result.projectileCount));
  return result;
}
