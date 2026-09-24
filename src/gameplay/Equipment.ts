export type EquipmentSlot = 'core' | 'relic' | 'charm' | 'attachment' | 'artifact';

export interface EquipmentDefinition {
  id: string; name: string; slot: EquipmentSlot; rarity: 'common' | 'rare' | 'epic';
  statEffects: Record<string, number>; attackModifier?: string; visualModifier?: string;
}

export const EQUIPMENT: readonly EquipmentDefinition[] = [
  { id: 'fractured-core', name: 'FRACTURED CORE', slot: 'core', rarity: 'common', statEffects: { damageMultiplier: 0.1 }, visualModifier: 'core-ring' },
  { id: 'magnet-charm', name: 'MAGNET CHARM', slot: 'charm', rarity: 'rare', statEffects: { pickupRadius: 40 }, visualModifier: 'magnet-ring' },
  { id: 'echo-relic', name: 'ECHO RELIC', slot: 'relic', rarity: 'epic', statEffects: { damageMultiplier: 0.12 }, attackModifier: 'echo-plus', visualModifier: 'void-orbit' },
] as const;

export interface PetDefinition {
  petId: string; name: string; visualKey: string; rarity: string; passive?: string;
  activeBehavior?: string; pickupBehavior?: { radius: number; allowedRarities: readonly string[] };
  attackBehavior?: string; cosmeticVariants: readonly string[];
}

export const PROTOTYPE_PET: PetDefinition = {
  petId: 'ember-wisp', name: 'EMBER WISP', visualKey: 'pet.ember-wisp', rarity: 'rare',
  passive: 'pickup-helper', pickupBehavior: { radius: 105, allowedRarities: ['common'] }, cosmeticVariants: [],
};

export interface CosmeticLoadout {
  baseSkinId?: string; evolutionSkinId?: string; auraId?: string; trailId?: string;
  projectileCosmeticId?: string; spawnEffectId?: string; bossKillEffectId?: string;
  petCosmeticId?: string; nameplateId?: string; emoteIds: string[];
}
