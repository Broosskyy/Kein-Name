import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config';
import { CombatModel } from '../core/CombatModel';
import { VisualQualityController } from './VisualQuality';
import { VisualState } from './VisualState';

describe('M03 render-only state', () => {
  it('maps boss HP to damage stages without changing combat state', () => {
    const model = new CombatModel(0, { seedGenerator: () => 31 });
    const state = new VisualState();
    const hp = model.bossHp;
    expect(state.updateBossHealth(model.maxHp, model.maxHp)).toBe('intact');
    expect(state.updateBossHealth(model.maxHp * 0.7, model.maxHp)).toBe('fractured');
    expect(state.updateBossHealth(model.maxHp * 0.4, model.maxHp)).toBe('critical');
    expect(state.updateBossHealth(0, model.maxHp)).toBe('defeated');
    expect(model.bossHp).toBe(hp);
    expect(model.triggered.size).toBe(0);
  });

  it('completes a mutation visual sequence once and resumes combat once', () => {
    const state = new VisualState();
    expect(state.beginBreakpoint('break-1')).toBe(true);
    expect(state.beginBreakpoint('break-1')).toBe(false);
    expect(state.showChoice()).toBe(true);
    expect(state.beginMutation('crystal')).toBe(true);
    expect(state.beginMutation('crystal')).toBe(false);
    expect(state.completeMutation('crystal')).toBe(true);
    expect(state.completeMutation('crystal')).toBe(false);
    expect(state.snapshot().sequence).toBe('combat');
  });

  it('starts boss kill and reveal only once', () => {
    const state = new VisualState();
    expect(state.beginKill()).toBe(true);
    expect(state.beginKill()).toBe(false);
    expect(state.beginReveal()).toBe(true);
    expect(state.beginReveal()).toBe(false);
  });

  it('reset removes every transient visual guard', () => {
    const state = new VisualState();
    state.beginBreakpoint('break-1');
    state.showChoice();
    state.beginMutation('void');
    state.reset();
    expect(state.snapshot()).toEqual({ damageStage: 'intact', sequence: 'combat', breakpoints: 0, hasMutation: false, killStarted: false, revealStarted: false });
    expect(state.beginBreakpoint('break-1')).toBe(true);
  });

  it('quality and reduced-effects modes do not alter gameplay configuration', () => {
    const combat = JSON.stringify(GAME_CONFIG.combat);
    const quality = new VisualQualityController('low');
    const low = quality.profile;
    quality.set('high');
    const high = quality.profile;
    expect(high.maxParticles).toBeGreaterThan(low.maxParticles);
    quality.toggleReduced();
    expect(quality.profile.maxParticles).toBeLessThan(high.maxParticles);
    expect(JSON.stringify(GAME_CONFIG.combat)).toBe(combat);
  });
});
