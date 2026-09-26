import type { Vec2 } from './ArenaTypes';

export interface BossPlayerDepth {
  boss: number;
  player: number;
}

/** Stable depth keys for independently rendered world entities. */
export class ArenaDepthSystem {
  worldKey(position: Vec2, bias = 0): number { return Math.round(position.y * 10) + bias; }

  bossAndPlayer(boss: Vec2, player: Vec2): BossPlayerDepth {
    const bossKey = this.worldKey(boss);
    const playerKey = this.worldKey(player);
    if (playerKey < bossKey) return { boss: 15, player: 12 };
    return { boss: 11, player: 15 };
  }
}
