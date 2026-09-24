import { RunRandom } from '../core/RunRandom';
import type { Vec2 } from './ArenaTypes';

export type BossAttackKind = 'ground-slam' | 'core-beam' | 'falling-debris';
export type TelegraphPhase = 'telegraph' | 'impact' | 'recovery' | 'done';

export interface BossAttackDefinition {
  kind: BossAttackKind;
  telegraphMs: number;
  impactMs: number;
  recoveryMs: number;
  baseDamage: number;
  radius: number;
}

export interface BossTelegraph {
  id: string;
  kind: BossAttackKind;
  phase: TelegraphPhase;
  position: Vec2;
  radius: number;
  elapsedMs: number;
  damage: number;
  hitApplied: boolean;
}

export const BOSS_ATTACKS: Readonly<Record<BossAttackKind, BossAttackDefinition>> = {
  'ground-slam': { kind: 'ground-slam', telegraphMs: 1050, impactMs: 180, recoveryMs: 620, baseDamage: 26, radius: 165 },
  'core-beam': { kind: 'core-beam', telegraphMs: 900, impactMs: 360, recoveryMs: 520, baseDamage: 20, radius: 80 },
  'falling-debris': { kind: 'falling-debris', telegraphMs: 1250, impactMs: 160, recoveryMs: 400, baseDamage: 18, radius: 92 },
};

export interface BossAttackImpact { id: string; kind: BossAttackKind; damage: number; hit: boolean; position: Vec2; radius: number }

export class BossAttackSystem {
  readonly active: BossTelegraph[] = [];
  private random: RunRandom;
  private cooldownMs = 2600;
  private sequence = 0;

  constructor(seed: number) { this.random = new RunRandom(seed ^ 0xb055a77a); }

  reset(seed: number): void { this.active.length = 0; this.random = new RunRandom(seed ^ 0xb055a77a); this.cooldownMs = 2200; this.sequence = 0; }

  force(kind: BossAttackKind, target: Vec2, cycle = 1): BossTelegraph {
    const definition = BOSS_ATTACKS[kind];
    const telegraph: BossTelegraph = {
      id: `boss-attack-${++this.sequence}`, kind, phase: 'telegraph', position: { ...target },
      radius: definition.radius, elapsedMs: 0, damage: Math.round(definition.baseDamage * (1 + (cycle - 1) * 0.22)), hitApplied: false,
    };
    this.active.push(telegraph);
    return telegraph;
  }

  update(deltaMs: number, player: Vec2, cycle: number, enabled = true): BossAttackImpact[] {
    const impacts: BossAttackImpact[] = [];
    if (!enabled) return impacts;
    if (enabled) {
      this.cooldownMs -= deltaMs;
      if (this.cooldownMs <= 0 && this.active.length < 4) {
        const kinds: BossAttackKind[] = cycle >= 2 ? ['ground-slam', 'core-beam', 'falling-debris'] : ['ground-slam', 'falling-debris'];
        const kind = kinds[Math.floor(this.random.next() * kinds.length)];
        const jitter = () => (this.random.next() - 0.5) * 260;
        this.force(kind, { x: Math.max(90, Math.min(910, player.x + jitter())), y: Math.max(90, Math.min(420, player.y + jitter() * 0.35)) }, cycle);
        this.cooldownMs = Math.max(1150, (3300 - cycle * 240) * (0.86 + this.random.next() * 0.24));
      }
    }
    for (const attack of this.active) {
      attack.elapsedMs += deltaMs;
      const definition = BOSS_ATTACKS[attack.kind];
      if (attack.phase === 'telegraph' && attack.elapsedMs >= definition.telegraphMs) {
        attack.phase = 'impact'; attack.elapsedMs = 0;
        const hit = attack.kind === 'core-beam'
          ? Math.abs(player.x - attack.position.x) <= attack.radius
          : Math.hypot(player.x - attack.position.x, player.y - attack.position.y) <= attack.radius;
        impacts.push({ id: attack.id, kind: attack.kind, damage: attack.damage, hit, position: { ...attack.position }, radius: attack.radius });
        attack.hitApplied = true;
      } else if (attack.phase === 'impact' && attack.elapsedMs >= definition.impactMs) {
        attack.phase = 'recovery'; attack.elapsedMs = 0;
      } else if (attack.phase === 'recovery' && attack.elapsedMs >= definition.recoveryMs) attack.phase = 'done';
    }
    for (let index = this.active.length - 1; index >= 0; index -= 1) if (this.active[index].phase === 'done') this.active.splice(index, 1);
    return impacts;
  }
}
