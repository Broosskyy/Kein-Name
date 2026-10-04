import { describe, expect, it } from 'vitest';
import { FieldCombatTargeting } from './FieldCombatTargeting';

describe('field combat targeting', () => {
  it('never starts combat from proximity alone', () => {
    const targeting = new FieldCombatTargeting();
    expect(targeting.autoAttackActive).toBe(false);
    expect(targeting.selectedTargetId).toBeUndefined();
  });

  it('requires selection and an explicit attack command', () => {
    const targeting = new FieldCombatTargeting();
    expect(targeting.start()).toBe(false);
    targeting.select('mossling-1');
    expect(targeting.autoAttackActive).toBe(false);
    expect(targeting.start()).toBe(true);
    expect(targeting.autoAttackActive).toBe(true);
  });

  it('continues on the selected target until stopped or removed', () => {
    const targeting = new FieldCombatTargeting();
    targeting.select('mossling-1'); targeting.start();
    targeting.select('mossling-1');
    expect(targeting.autoAttackActive).toBe(true);
    expect(targeting.toggle()).toBe('stopped');
    expect(targeting.selectedTargetId).toBe('mossling-1');
    targeting.start(); targeting.removeTarget('mossling-1');
    expect(targeting.autoAttackActive).toBe(false);
    expect(targeting.selectedTargetId).toBeUndefined();
  });
});
