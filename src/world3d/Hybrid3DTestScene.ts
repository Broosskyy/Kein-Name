import type { Vec2 } from '../gameplay/ArenaTypes';
import type { WorldCollider3D } from './World3DTypes';

export interface HybridPropDefinition {
  id: string;
  kind: 'pillar' | 'broken-pillar' | 'arch' | 'rock' | 'boundary' | 'ring' | 'crystal' | 'corruption' | 'wall';
  position: Vec2;
  rotation: number;
  scale: number;
  collider?: WorldCollider3D;
}

export interface Hybrid3DSceneDefinition {
  id: string;
  seed: number;
  dimensions: { width: number; depth: number };
  playerSpawn: Vec2;
  bossSpawn: Vec2;
  bossOrientation: number;
  bossFootprint: { radiusX: number; radiusY: number };
  props: readonly HybridPropDefinition[];
  colliders: readonly WorldCollider3D[];
  lootSpawns: readonly Vec2[];
  telegraphSpawn: Vec2;
}

const props: HybridPropDefinition[] = [
  // Boss-basin framing: open central combat lanes, solid landmarks on the flanks.
  { id: 'ring-west', kind: 'ring', position: { x: -620, y: -230 }, rotation: .1, scale: 1.15 },
  { id: 'ring-east', kind: 'ring', position: { x: 620, y: -250 }, rotation: Math.PI, scale: 1.05 },
  { id: 'pillar-west', kind: 'pillar', position: { x: -520, y: 250 }, rotation: .08, scale: 1.05, collider: { id: 'pillar-west', center: { x: -520, y: 250 }, radius: 92 } },
  { id: 'pillar-east', kind: 'broken-pillar', position: { x: 570, y: 155 }, rotation: -.16, scale: 1.15, collider: { id: 'pillar-east', center: { x: 570, y: 155 }, radius: 105 } },
  { id: 'arch-northwest', kind: 'arch', position: { x: -690, y: -610 }, rotation: .22, scale: 1.18, collider: { id: 'arch-left', center: { x: -790, y: -610 }, halfWidth: 70, halfDepth: 110 } },
  { id: 'wall-northeast', kind: 'wall', position: { x: 650, y: -630 }, rotation: -.35, scale: 1.05, collider: { id: 'wall-northeast', center: { x: 650, y: -630 }, halfWidth: 185, halfDepth: 65 } },
  { id: 'rock-southwest', kind: 'rock', position: { x: -895, y: 805 }, rotation: .5, scale: .78, collider: { id: 'rock-southwest', center: { x: -895, y: 805 }, radius: 88 } },
  { id: 'rock-northeast', kind: 'rock', position: { x: 855, y: -520 }, rotation: 1.1, scale: .8, collider: { id: 'rock-northeast', center: { x: 855, y: -520 }, radius: 90 } },
  // Visual identity anchors: true 3D geometry, no billboard world construction.
  { id: 'crystal-west', kind: 'crystal', position: { x: -760, y: -40 }, rotation: -.22, scale: .5, collider: { id: 'crystal-west', center: { x: -760, y: -40 }, radius: 70 } },
  { id: 'crystal-southeast', kind: 'crystal', position: { x: 690, y: 650 }, rotation: .55, scale: .42 },
  { id: 'corruption-east', kind: 'corruption', position: { x: 790, y: 320 }, rotation: .8, scale: .62, collider: { id: 'corruption-east', center: { x: 790, y: 320 }, radius: 75 } },
  { id: 'corruption-north', kind: 'corruption', position: { x: 380, y: -820 }, rotation: -.5, scale: .55 },
];

const boundaries: WorldCollider3D[] = [
  { id: 'north-boundary', center: { x: 0, y: -1080 }, halfWidth: 1100, halfDepth: 70 },
  { id: 'south-boundary', center: { x: 0, y: 1080 }, halfWidth: 1100, halfDepth: 70 },
  { id: 'west-boundary', center: { x: -1080, y: 0 }, halfWidth: 70, halfDepth: 1100 },
  { id: 'east-boundary', center: { x: 1080, y: 0 }, halfWidth: 70, halfDepth: 1100 },
];

export const M10_HYBRID_TEST_SCENE: Hybrid3DSceneDefinition = {
  id: 'm10-harvest-basin-spike',
  seed: 0x10a3d,
  dimensions: { width: 2200, depth: 2200 },
  playerSpawn: { x: 0, y: 720 },
  bossSpawn: { x: 0, y: -380 },
  bossOrientation: Math.PI / 2,
  bossFootprint: { radiusX: 280, radiusY: 210 },
  props,
  colliders: [...boundaries, ...props.flatMap((prop) => prop.collider ? [prop.collider] : [])],
  lootSpawns: [{ x: -250, y: 80 }, { x: 320, y: -30 }, { x: 520, y: 520 }],
  telegraphSpawn: { x: 260, y: 270 },
};
