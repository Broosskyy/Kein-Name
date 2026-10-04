/**
 * Local input state for field combat. Merely entering an enemy's range never
 * starts combat: a target must be selected and the player must explicitly
 * start the attack chain.
 */
export class FieldCombatTargeting {
  selectedTargetId?: string;
  autoAttackActive = false;

  select(targetId?: string): void {
    if (targetId === this.selectedTargetId) return;
    this.selectedTargetId = targetId;
    this.autoAttackActive = false;
  }

  start(): boolean {
    if (!this.selectedTargetId) return false;
    this.autoAttackActive = true;
    return true;
  }

  stop(clearSelection = false): void {
    this.autoAttackActive = false;
    if (clearSelection) this.selectedTargetId = undefined;
  }

  toggle(): 'started' | 'stopped' | 'no-target' {
    if (!this.selectedTargetId) return 'no-target';
    if (this.autoAttackActive) { this.stop(); return 'stopped'; }
    this.start(); return 'started';
  }

  removeTarget(targetId: string): void {
    if (this.selectedTargetId === targetId) this.stop(true);
  }
}
