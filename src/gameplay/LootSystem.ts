import { RunRandom } from '../core/RunRandom';
import type { Vec2 } from './ArenaTypes';

export type LootKind = 'run-xp' | 'crystal-essence' | 'void-essence' | 'wing-essence' | 'pumpkin-essence' | 'combat-orb' | 'relic' | 'harvest-energy';
export type LootRarity = 'common' | 'rare' | 'epic';
export type LootPhase = 'airborne' | 'grounded' | 'collected';

export interface LootDrop {
  id: string; kind: LootKind; rarity: LootRarity; phase: LootPhase; position: Vec2;
  start: Vec2; target: Vec2; ageMs: number; flightMs: number; value: number;
}

export interface LootPickup { id: string; kind: LootKind; rarity: LootRarity; value: number }

export class LootSystem {
  readonly drops: LootDrop[] = [];
  private random: RunRandom;
  private sequence = 0;
  constructor(seed: number, private readonly maxDrops = 28) { this.random = new RunRandom(seed ^ 0x1007f00d); }
  reset(seed: number): void { this.drops.length = 0; this.random = new RunRandom(seed ^ 0x1007f00d); this.sequence = 0; }

  spawn(kind: LootKind, rarity: LootRarity, start: Vec2, value = 1, target?: Vec2): LootDrop | undefined {
    if (this.drops.filter((drop) => drop.phase !== 'collected').length >= this.maxDrops) return undefined;
    const destination = target ?? { x: 110 + this.random.next() * 780, y: 130 + this.random.next() * 260 };
    const drop: LootDrop = { id: `loot-${++this.sequence}`, kind, rarity, phase: 'airborne', position: { ...start }, start: { ...start }, target: destination, ageMs: 0, flightMs: 520 + this.random.next() * 380, value };
    this.drops.push(drop); return drop;
  }

  update(deltaMs: number, player: Vec2, pickupRadius: number): LootPickup[] {
    const pickups: LootPickup[] = [];
    for (const drop of this.drops) {
      if (drop.phase === 'collected') continue;
      drop.ageMs += deltaMs;
      if (drop.phase === 'airborne') {
        const t = Math.min(1, drop.ageMs / drop.flightMs);
        drop.position.x = drop.start.x + (drop.target.x - drop.start.x) * t;
        drop.position.y = drop.start.y + (drop.target.y - drop.start.y) * t - Math.sin(t * Math.PI) * 150;
        if (t >= 1) { drop.phase = 'grounded'; drop.ageMs = 0; drop.position = { ...drop.target }; }
      } else if (Math.hypot(player.x - drop.position.x, player.y - drop.position.y) <= pickupRadius) {
        drop.phase = 'collected'; pickups.push({ id: drop.id, kind: drop.kind, rarity: drop.rarity, value: drop.value });
      }
    }
    if (this.drops.length > this.maxDrops * 1.5) this.drops.splice(0, this.drops.findIndex((drop) => drop.phase !== 'collected'));
    return pickups;
  }
}
