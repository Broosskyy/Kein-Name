import type { Vec2 } from './ArenaTypes';
import type { Hybrid3DSceneDefinition } from '../world3d/Hybrid3DTestScene';

export type WorldMapId = 'harvest-haven' | 'harvest-basin-raid';
export type WorldActorKind = 'npc' | 'monster' | 'portal';

export interface WorldNpcDefinition {
  id: string;
  kind: 'npc';
  name: string;
  role: 'mayor' | 'class-mentor' | 'blacksmith' | 'merchant' | 'innkeeper' | 'rift-keeper';
  position: Vec2;
  facing: number;
}

export interface WorldMonsterSpawnDefinition {
  id: string;
  kind: 'monster';
  species: 'mossling' | 'stonebeak' | 'corrupted-sprout';
  name: string;
  position: Vec2;
  level: number;
  maxHp: number;
  heroXp: number;
  jobXp: number;
  respawnMs: number;
}

export interface WorldPortalDefinition {
  id: string;
  kind: 'portal';
  name: string;
  position: Vec2;
  radius: number;
  targetMapId: WorldMapId;
  query: string;
  requiredHeroLevel?: number;
}

export interface WorldQuestDefinition {
  id: string;
  title: string;
  description: string;
  targetSpecies: WorldMonsterSpawnDefinition['species'];
  targetCount: number;
  rewardHeroXp: number;
  rewardJobXp: number;
}

export interface HarvestWorldMapDefinition {
  id: WorldMapId;
  name: string;
  subtitle: string;
  scene: Hybrid3DSceneDefinition;
  npcs: readonly WorldNpcDefinition[];
  monsters: readonly WorldMonsterSpawnDefinition[];
  portals: readonly WorldPortalDefinition[];
  quests: readonly WorldQuestDefinition[];
}

export type WorldActorDefinition = WorldNpcDefinition | WorldMonsterSpawnDefinition | WorldPortalDefinition;

export function validateWorldMap(map: HarvestWorldMapDefinition): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const halfWidth = map.scene.dimensions.width / 2;
  const halfDepth = map.scene.dimensions.depth / 2;
  for (const actor of [...map.npcs, ...map.monsters, ...map.portals]) {
    if (ids.has(actor.id)) errors.push(`duplicate actor id: ${actor.id}`);
    ids.add(actor.id);
    if (Math.abs(actor.position.x) > halfWidth || Math.abs(actor.position.y) > halfDepth) errors.push(`actor outside map: ${actor.id}`);
  }
  for (const quest of map.quests) if (!map.monsters.some((monster) => monster.species === quest.targetSpecies)) errors.push(`quest target missing: ${quest.id}`);
  return errors;
}
