import type { Vec2 } from '../gameplay/ArenaTypes';

export interface GroundDecal {
  position: Vec2;
  kind: string;
  ageMs: number;
  durationMs: number;
  radius: number;
  rotation: number;
  variant: number;
}

/** Bounded, renderer-independent history of impacts left on the arena floor. */
export class GroundDecalSystem {
  readonly items: GroundDecal[] = [];
  constructor(readonly capacity = 24) {}

  add(position: Vec2, radius: number, kind: string, durationMs = 10000): GroundDecal {
    const seed = Math.abs(Math.round(position.x * 13 + position.y * 7 + this.items.length * 31));
    const decal: GroundDecal = {
      position: { ...position }, kind, ageMs: 0, durationMs,
      radius: Math.min(280, Math.max(80, radius)),
      rotation: (seed % 628) / 100,
      variant: seed % 3,
    };
    this.items.push(decal);
    if (this.items.length > this.capacity) this.items.splice(0, this.items.length - this.capacity);
    return decal;
  }

  update(deltaMs: number): void {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      this.items[index].ageMs += deltaMs;
      if (this.items[index].ageMs >= this.items[index].durationMs) this.items.splice(index, 1);
    }
  }

  clear(): void { this.items.length = 0; }
}
