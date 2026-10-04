import type { WorldCollider3D } from '../world3d/World3DTypes';
import type { HybridPropDefinition } from '../world3d/Hybrid3DTestScene';
import type { HarvestWorldMapDefinition } from './WorldMapDefinition';

const props: HybridPropDefinition[] = [
  { id: 'haven-hall', kind: 'guild-hall', position: { x: 0, y: -520 }, rotation: 0, scale: 1.18, collider: { id: 'haven-hall', center: { x: 0, y: -520 }, halfWidth: 245, halfDepth: 175 } },
  { id: 'haven-inn', kind: 'inn', position: { x: -620, y: -260 }, rotation: .18, scale: .92, collider: { id: 'haven-inn', center: { x: -620, y: -260 }, halfWidth: 190, halfDepth: 145 } },
  { id: 'haven-forge', kind: 'forge', position: { x: 620, y: -220 }, rotation: -.16, scale: .9, collider: { id: 'haven-forge', center: { x: 620, y: -220 }, halfWidth: 185, halfDepth: 145 } },
  { id: 'haven-house-west', kind: 'house', position: { x: -720, y: 300 }, rotation: .08, scale: .86, collider: { id: 'haven-house-west', center: { x: -720, y: 300 }, halfWidth: 165, halfDepth: 135 } },
  { id: 'haven-house-east', kind: 'house', position: { x: 740, y: 320 }, rotation: -.1, scale: .84, collider: { id: 'haven-house-east', center: { x: 740, y: 320 }, halfWidth: 165, halfDepth: 135 } },
  { id: 'haven-shrine', kind: 'shrine', position: { x: -340, y: 120 }, rotation: 0, scale: .72, collider: { id: 'haven-shrine', center: { x: -340, y: 120 }, radius: 82 } },
  { id: 'market-a', kind: 'market-stall', position: { x: 330, y: 130 }, rotation: .12, scale: .7, collider: { id: 'market-a', center: { x: 330, y: 130 }, halfWidth: 100, halfDepth: 70 } },
  { id: 'market-b', kind: 'market-stall', position: { x: 510, y: 90 }, rotation: -.08, scale: .66, collider: { id: 'market-b', center: { x: 510, y: 90 }, halfWidth: 95, halfDepth: 68 } },
  { id: 'west-gate', kind: 'arch', position: { x: -1010, y: 650 }, rotation: Math.PI / 2, scale: .82 },
  { id: 'farm-arch', kind: 'arch', position: { x: 0, y: 690 }, rotation: 0, scale: .88 },
  { id: 'farm-rock-a', kind: 'rock', position: { x: -680, y: 940 }, rotation: .6, scale: .58, collider: { id: 'farm-rock-a', center: { x: -680, y: 940 }, radius: 65 } },
  { id: 'farm-rock-b', kind: 'rock', position: { x: 760, y: 1020 }, rotation: 1.2, scale: .52, collider: { id: 'farm-rock-b', center: { x: 760, y: 1020 }, radius: 58 } },
  { id: 'farm-crystal', kind: 'crystal', position: { x: 1020, y: 760 }, rotation: .4, scale: .28, collider: { id: 'farm-crystal', center: { x: 1020, y: 760 }, radius: 45 } },
  ...[-1150, -820, 890, 1180].flatMap((x, index) => [
    { id: `tree-${index}-a`, kind: 'tree' as const, position: { x, y: -100 + index * 300 }, rotation: index * .7, scale: .78 },
    { id: `tree-${index}-b`, kind: 'tree' as const, position: { x: x + (index % 2 ? -110 : 120), y: 700 + index * 120 }, rotation: index * .9, scale: .7 },
  ]),
];

const bounds: WorldCollider3D[] = [
  { id: 'haven-north', center: { x: 0, y: -1370 }, halfWidth: 1600, halfDepth: 55 },
  { id: 'haven-south', center: { x: 0, y: 1370 }, halfWidth: 1600, halfDepth: 55 },
  { id: 'haven-west', center: { x: -1570, y: 0 }, halfWidth: 55, halfDepth: 1400 },
  { id: 'haven-east', center: { x: 1570, y: 0 }, halfWidth: 55, halfDepth: 1400 },
];

export const HARVEST_HAVEN_MAP: HarvestWorldMapDefinition = {
  id: 'harvest-haven',
  name: 'Harvest Haven',
  subtitle: 'Sanctuary of the First Bloom',
  scene: {
    id: 'harvest-haven-world-01', sceneKind: 'haven', seed: 0x48415645,
    dimensions: { width: 3200, depth: 2800 }, playerSpawn: { x: 0, y: 360 },
    bossSpawn: { x: 0, y: -1180 }, bossOrientation: Math.PI / 2,
    bossFootprint: { radiusX: 0, radiusY: 0 }, props,
    colliders: [...bounds, ...props.flatMap((prop) => prop.collider ? [prop.collider] : [])],
    lootSpawns: [], telegraphSpawn: { x: 0, y: 0 },
  },
  npcs: [
    { id: 'npc-warden-lyra', kind: 'npc', name: 'Warden Lyra', role: 'mayor', position: { x: 0, y: -235 }, facing: Math.PI },
    { id: 'npc-mentor-kael', kind: 'npc', name: 'Mentor Kael', role: 'class-mentor', position: { x: -235, y: -20 }, facing: -.4 },
    { id: 'npc-smith-boros', kind: 'npc', name: 'Boros', role: 'blacksmith', position: { x: 495, y: -55 }, facing: 2.4 },
    { id: 'npc-merchant-mira', kind: 'npc', name: 'Mira', role: 'merchant', position: { x: 360, y: 255 }, facing: -2.5 },
    { id: 'npc-rift-keeper', kind: 'npc', name: 'Rift Keeper', role: 'rift-keeper', position: { x: 120, y: -1080 }, facing: Math.PI },
  ],
  monsters: [
    { id: 'mossling-1', kind: 'monster', species: 'mossling', name: 'Mossling', position: { x: -450, y: 900 }, level: 2, maxHp: 70, heroXp: 28, jobXp: 22, respawnMs: 5000 },
    { id: 'mossling-2', kind: 'monster', species: 'mossling', name: 'Mossling', position: { x: -120, y: 1050 }, level: 2, maxHp: 70, heroXp: 28, jobXp: 22, respawnMs: 5000 },
    { id: 'mossling-3', kind: 'monster', species: 'mossling', name: 'Mossling', position: { x: 250, y: 930 }, level: 3, maxHp: 82, heroXp: 34, jobXp: 25, respawnMs: 5200 },
    { id: 'stonebeak-1', kind: 'monster', species: 'stonebeak', name: 'Stonebeak', position: { x: 650, y: 1110 }, level: 4, maxHp: 105, heroXp: 42, jobXp: 31, respawnMs: 6500 },
    { id: 'stonebeak-2', kind: 'monster', species: 'stonebeak', name: 'Stonebeak', position: { x: 980, y: 900 }, level: 4, maxHp: 105, heroXp: 42, jobXp: 31, respawnMs: 6500 },
    { id: 'corrupted-sprout-1', kind: 'monster', species: 'corrupted-sprout', name: 'Corrupted Sprout', position: { x: -980, y: 1030 }, level: 5, maxHp: 135, heroXp: 55, jobXp: 38, respawnMs: 7500 },
  ],
  portals: [
    { id: 'portal-harvest-raid', kind: 'portal', name: 'Harvest Basin Raid', position: { x: 0, y: -1190 }, radius: 135, targetMapId: 'harvest-basin-raid', query: '?map=raid', requiredHeroLevel: 1 },
  ],
  quests: [
    { id: 'quest-first-harvest', title: 'Moss in the Road', description: 'Defeat 5 Mosslings beyond the south gate.', targetSpecies: 'mossling', targetCount: 5, rewardHeroXp: 120, rewardJobXp: 90 },
    { id: 'quest-stonebeak', title: 'Stonebeak Trouble', description: 'Defeat 3 Stonebeaks near the crystal outcrop.', targetSpecies: 'stonebeak', targetCount: 3, rewardHeroXp: 180, rewardJobXp: 125 },
  ],
};
