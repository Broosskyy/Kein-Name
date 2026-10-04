import type { Vec2 } from './ArenaTypes';
import type { WorldMonsterSpawnDefinition } from './WorldMapDefinition';

export interface FieldMonsterState extends WorldMonsterSpawnDefinition {
  hp: number;
  alive: boolean;
  respawnRemainingMs: number;
  hitFlashMs: number;
}

export interface FieldMonsterDefeat {
  id: string;
  species: WorldMonsterSpawnDefinition['species'];
  position: Vec2;
  heroXp: number;
  jobXp: number;
}

export class FieldMonsterSystem {
  readonly monsters: FieldMonsterState[];

  constructor(definitions: readonly WorldMonsterSpawnDefinition[]) {
    this.monsters = definitions.map((definition) => ({ ...definition, position: { ...definition.position }, hp: definition.maxHp, alive: true, respawnRemainingMs: 0, hitFlashMs: 0 }));
  }

  update(deltaMs: number): void {
    for (const monster of this.monsters) {
      monster.hitFlashMs = Math.max(0, monster.hitFlashMs - deltaMs);
      if (monster.alive) continue;
      monster.respawnRemainingMs = Math.max(0, monster.respawnRemainingMs - deltaMs);
      if (monster.respawnRemainingMs === 0) { monster.alive = true; monster.hp = monster.maxHp; }
    }
  }

  nearest(position: Vec2, maxDistance = Number.POSITIVE_INFINITY): FieldMonsterState | undefined {
    let best: FieldMonsterState | undefined, bestDistance = maxDistance;
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      const distance = Math.hypot(monster.position.x - position.x, monster.position.y - position.y);
      if (distance < bestDistance) { best = monster; bestDistance = distance; }
    }
    return best;
  }

  damage(id: string, amount: number): FieldMonsterDefeat | undefined {
    const monster = this.monsters.find((candidate) => candidate.id === id && candidate.alive);
    if (!monster) return undefined;
    monster.hp = Math.max(0, monster.hp - Math.max(0, Math.round(amount)));
    monster.hitFlashMs = 180;
    if (monster.hp > 0) return undefined;
    monster.alive = false;
    monster.respawnRemainingMs = monster.respawnMs;
    return { id: monster.id, species: monster.species, position: { ...monster.position }, heroXp: monster.heroXp, jobXp: monster.jobXp };
  }
}

