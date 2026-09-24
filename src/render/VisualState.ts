import type { BreakpointId, Mutation } from '../types';

export type BossDamageStage = 'intact' | 'fractured' | 'critical' | 'defeated';
export type VisualSequence = 'combat' | 'breakpoint' | 'choice' | 'mutation' | 'kill' | 'reveal';

export class VisualState {
  damageStage: BossDamageStage = 'intact';
  sequence: VisualSequence = 'combat';
  private readonly shownBreakpoints = new Set<BreakpointId>();
  private activeMutation?: Mutation;
  private killStarted = false;
  private revealStarted = false;

  updateBossHealth(hp: number, maxHp: number): BossDamageStage {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    this.damageStage = ratio <= 0 ? 'defeated' : ratio <= 0.4 ? 'critical' : ratio <= 0.7 ? 'fractured' : 'intact';
    return this.damageStage;
  }

  beginBreakpoint(id: BreakpointId): boolean {
    if (this.shownBreakpoints.has(id) || this.killStarted) return false;
    this.shownBreakpoints.add(id);
    this.sequence = 'breakpoint';
    return true;
  }

  showChoice(): boolean {
    if (this.sequence !== 'breakpoint') return false;
    this.sequence = 'choice';
    return true;
  }

  beginMutation(mutation: Mutation): boolean {
    if (this.sequence !== 'choice' || this.activeMutation) return false;
    this.activeMutation = mutation;
    this.sequence = 'mutation';
    return true;
  }

  completeMutation(mutation: Mutation): boolean {
    if (this.sequence !== 'mutation' || this.activeMutation !== mutation) return false;
    this.activeMutation = undefined;
    this.sequence = 'combat';
    return true;
  }

  beginKill(): boolean {
    if (this.killStarted) return false;
    this.killStarted = true;
    this.sequence = 'kill';
    this.damageStage = 'defeated';
    return true;
  }

  beginReveal(): boolean {
    if (!this.killStarted || this.revealStarted) return false;
    this.revealStarted = true;
    this.sequence = 'reveal';
    return true;
  }

  reset(): void {
    this.damageStage = 'intact';
    this.sequence = 'combat';
    this.shownBreakpoints.clear();
    this.activeMutation = undefined;
    this.killStarted = false;
    this.revealStarted = false;
  }

  snapshot(): { damageStage: BossDamageStage; sequence: VisualSequence; breakpoints: number; hasMutation: boolean; killStarted: boolean; revealStarted: boolean } {
    return {
      damageStage: this.damageStage,
      sequence: this.sequence,
      breakpoints: this.shownBreakpoints.size,
      hasMutation: Boolean(this.activeMutation),
      killStarted: this.killStarted,
      revealStarted: this.revealStarted,
    };
  }
}
