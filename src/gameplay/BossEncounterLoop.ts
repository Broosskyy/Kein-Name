export type BossEncounterState = 'alive' | 'defeated' | 'death-sequence' | 'loot-phase' | 'clear-delay' | 'respawn';
export type BossEncounterEvent = 'death-started' | 'loot' | 'clear' | 'respawn';

export interface BossEncounterSnapshot {
  state: BossEncounterState;
  bossRoundIndex: number;
  bossLevel: number;
  elapsedMs: number;
  collisionEnabled: boolean;
  deathProgress: number;
}

const DEATH_SEQUENCE_MS = 1100;
const LOOT_PHASE_END_MS = 2200;
const RESPAWN_AT_MS = 4000;

/** Presentation-independent single-boss round lifecycle. It emits one-shot
 * events; the owning gameplay slice decides how CombatModel, loot and visuals
 * consume them. */
export class BossEncounterLoop {
  state: BossEncounterState = 'alive';
  bossRoundIndex = 1;
  bossLevel = 1;
  elapsedMs = 0;
  private lootEmitted = false;
  private clearEmitted = false;

  get collisionEnabled(): boolean { return this.state === 'alive'; }
  get attackEnabled(): boolean { return this.state === 'alive'; }
  get deathProgress(): number { return this.state === 'alive' ? 0 : Math.min(1, this.elapsedMs / DEATH_SEQUENCE_MS); }

  defeat(): BossEncounterEvent[] {
    if (this.state !== 'alive') return [];
    this.state = 'defeated';
    this.elapsedMs = 0;
    this.lootEmitted = false;
    this.clearEmitted = false;
    return ['death-started'];
  }

  update(deltaMs: number): BossEncounterEvent[] {
    if (this.state === 'alive') return [];
    const events: BossEncounterEvent[] = [];
    this.elapsedMs += Math.max(0, deltaMs);
    if (this.state === 'defeated') this.state = 'death-sequence';
    if (!this.lootEmitted && this.elapsedMs >= DEATH_SEQUENCE_MS) {
      this.lootEmitted = true;
      this.state = 'loot-phase';
      events.push('loot');
    }
    if (!this.clearEmitted && this.elapsedMs >= LOOT_PHASE_END_MS) {
      this.clearEmitted = true;
      this.state = 'clear-delay';
      events.push('clear');
    }
    if (this.elapsedMs >= RESPAWN_AT_MS) {
      this.state = 'respawn';
      this.bossRoundIndex += 1;
      this.bossLevel += 1;
      events.push('respawn');
      this.state = 'alive';
      this.elapsedMs = 0;
      this.lootEmitted = false;
      this.clearEmitted = false;
    }
    return events;
  }

  maxHp(baseHp: number): number { return Math.round(baseHp * (1 + (this.bossLevel - 1) * .32)); }
  snapshot(): BossEncounterSnapshot {
    return { state: this.state, bossRoundIndex: this.bossRoundIndex, bossLevel: this.bossLevel, elapsedMs: this.elapsedMs, collisionEnabled: this.collisionEnabled, deathProgress: this.deathProgress };
  }
}
