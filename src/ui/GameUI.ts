import { GAME_CONFIG } from '../config';
import { MUTATION_BY_ID } from '../content';
import type { Mutation, RunResult } from '../types';
import type { QualityName } from '../config';
import { EVOLUTIONS } from '../content';
import { HALLOWEEN_CHALLENGES } from '../event/EventChallenges';
import type { EventDefinition } from '../event/EventDefinition';
import { HALLOWEEN_MILESTONES, HALLOWEEN_REWARDS } from '../event/EventRewards';
import type { EventRunOutcome } from '../event/EventProgress';
import type { EventState } from '../event/EventState';
import type { AssetRegistry } from '../assets';
import { renderVisualCatalog } from './VisualCatalog';
import type { MovementInput } from '../gameplay/ArenaTypes';
import type { RunUpgradeDefinition } from '../gameplay/RunUpgrades';

export type DebugAction = 'break-1' | 'break-2' | 'kill' | 'choose-crystal' | 'choose-void' | 'choose-wings' | 'choose-pumpkin' | 'build-cv' | 'build-cw' | 'build-vw' | 'build-pv' | 'build-pc' | 'build-pw' | 'event-toggle' | 'event-progress' | 'event-challenge' | 'event-unlock-all' | 'event-reset' | 'event-complete' | 'quality-low' | 'quality-medium' | 'quality-high' | 'effects-reduced' | 'visual-catalog' | 'grant-xp' | 'level-up' | 'spawn-loot' | 'spawn-rare' | 'next-cycle' | 'cycle-1' | 'cycle-2' | 'cycle-3' | 'region-core' | 'region-crystal' | 'region-ruins' | 'region-edge' | 'distance-near' | 'distance-medium' | 'distance-far' | 'zoom-action' | 'zoom-standard' | 'zoom-tactical' | 'attack-slam' | 'attack-beam' | 'attack-debris' | 'attack-cone' | 'attack-ring' | 'attack-shockwave' | 'damage-player' | 'heal-player' | 'dummy-add' | 'dummy-clear' | 'dummy-1' | 'dummy-2' | 'dummy-4' | 'dummy-8' | 'pickup-radius' | 'collision-bounds' | 'telegraphs' | 'performance' | 'save' | 'clear-snapshot' | 'inspect-progress' | 'inspect-run' | 'restart';

export class GameUI {
  private readonly hpFill = requiredElement<HTMLElement>('hp-fill');
  private readonly hpShine = requiredElement<HTMLElement>('hp-shine');
  private readonly timer = requiredElement<HTMLElement>('timer');
  private readonly powerButton = requiredElement<HTMLButtonElement>('power-button');
  private readonly powerStatus = requiredElement<HTMLElement>('power-status');
  private readonly powerCooldown = requiredElement<HTMLElement>('power-cooldown');
  private readonly announcement = requiredElement<HTMLElement>('announcement');
  private readonly resultPanel = requiredElement<HTMLElement>('result-panel');
  private readonly choicePanel = requiredElement<HTMLElement>('choice-panel');
  private readonly choiceButtons = [...this.choicePanel.querySelectorAll<HTMLButtonElement>('button[data-choice-index]')];
  private readonly debugPanel = requiredElement<HTMLElement>('debug-panel');
  private readonly eventHub = requiredElement<HTMLElement>('event-hub');
  private readonly visualCatalog = requiredElement<HTMLElement>('visual-catalog');
  private onPower?: () => void;
  private onDash?: () => void;
  private onZoom?: (delta: number) => void;
  private onRetry?: () => void;
  private onDebug?: (action: DebugAction) => void;
  private onEventEnter?: () => void;
  private onEventHub?: () => void;
  private onMove?: (input: MovementInput) => void;
  private onFullscreen?: () => void;
  private onResumeChoice?: (resume: boolean) => void;
  private announcementTimeout?: number;
  private choiceCallback?: (mutation: Mutation) => void;
  private choices: readonly Mutation[] = [];

  constructor(private readonly assets: AssetRegistry) {
    this.powerButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.onPower?.();
    });
    requiredElement<HTMLButtonElement>('dash-button').addEventListener('pointerdown', (event) => { event.preventDefault(); this.onDash?.(); });
    requiredElement<HTMLButtonElement>('zoom-out').addEventListener('click', () => this.onZoom?.(-0.08));
    requiredElement<HTMLButtonElement>('zoom-in').addEventListener('click', () => this.onZoom?.(0.08));
    requiredElement<HTMLButtonElement>('retry-button').addEventListener('click', () => this.onRetry?.());
    requiredElement<HTMLButtonElement>('event-enter').addEventListener('click', () => this.onEventEnter?.());
    requiredElement<HTMLButtonElement>('result-hub-button').addEventListener('click', () => this.onEventHub?.());
    requiredElement<HTMLButtonElement>('fullscreen-button').addEventListener('click', () => this.onFullscreen?.());
    requiredElement<HTMLButtonElement>('continue-run').addEventListener('click', () => this.chooseResume(true));
    requiredElement<HTMLButtonElement>('new-run').addEventListener('click', () => this.chooseResume(false));
    requiredElement<HTMLButtonElement>('failure-retry').addEventListener('click', () => this.onRetry?.());
    this.bindJoystick();
    this.bindArenaZoom();
    this.choiceButtons.forEach((button, index) => button.addEventListener('click', () => {
      const mutation = this.choices[index];
      if (mutation) this.choiceCallback?.(mutation);
    }));
    this.debugPanel.querySelectorAll<HTMLButtonElement>('button[data-debug]').forEach((button) => {
      button.addEventListener('click', () => this.onDebug?.(button.dataset.debug as DebugAction));
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === '`' || event.key.toLowerCase() === 'd') this.debugPanel.classList.toggle('visible');
    });
    if (new URLSearchParams(location.search).has('debug')) this.debugPanel.classList.add('visible');
    this.visualCatalog.querySelector<HTMLButtonElement>('[data-catalog-close]')?.addEventListener('click', () => this.toggleVisualCatalog(false));
    requiredElement('visual-catalog-content').innerHTML = renderVisualCatalog(this.assets);
    if (!(import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV) {
      this.debugPanel.querySelector('[data-debug="visual-catalog"]')?.remove();
      this.visualCatalog.remove();
    }
  }

  bindPower(callback: () => void): void { this.onPower = callback; }
  bindDash(callback: () => void): void { this.onDash = callback; }
  bindZoom(callback: (delta: number) => void): void { this.onZoom = callback; }
  bindRetry(callback: () => void): void { this.onRetry = callback; }
  bindDebug(callback: (action: DebugAction) => void): void { this.onDebug = callback; }
  bindEventEnter(callback: () => void): void { this.onEventEnter = callback; }
  bindEventHub(callback: () => void): void { this.onEventHub = callback; }
  bindMovement(callback: (input: MovementInput) => void): void { this.onMove = callback; }
  bindFullscreen(callback: () => void): void { this.onFullscreen = callback; }
  bindResumeChoice(callback: (resume: boolean) => void): void { this.onResumeChoice = callback; }

  update(hp: number, maxHp: number, elapsedMs: number, cooldownMs: number, playing: boolean): void {
    const hpRatio = Math.max(0, hp / maxHp);
    this.hpFill.style.transform = `scaleX(${hpRatio})`;
    this.hpShine.style.left = `${hpRatio * 100}%`;
    this.timer.textContent = formatTime(elapsedMs);
    const cooldownRatio = Math.min(1, cooldownMs / GAME_CONFIG.combat.powerCooldownMs);
    const ready = cooldownMs <= 0 && playing;
    this.powerCooldown.style.transform = `scaleY(${cooldownRatio})`;
    this.powerStatus.textContent = ready ? 'READY' : playing ? `${(cooldownMs / 1000).toFixed(1)}s` : 'LOCKED';
    this.powerButton.disabled = !ready;
    this.powerButton.classList.toggle('ready', ready);
  }

  setMutation(mutation: Mutation, active = true): void {
    requiredElement(`mut-${mutation}`).classList.toggle('active', active);
  }

  setBreakpoint(id: 'break-1' | 'break-2', active = true): void {
    requiredElement(`bp-${id}`).classList.toggle('broken', active);
  }

  setSeed(seed: number): void { requiredElement('debug-seed').textContent = `SEED ${seed}`; }
  setQuality(quality: QualityName, reduced: boolean): void {
    requiredElement('debug-quality').textContent = `${quality.toUpperCase()}${reduced ? ' · REDUCED' : ''}`;
  }

  updateArena(playerHp: number, playerMaxHp: number, level: number, xp: number, xpToNext: number, cycle: number, dashCooldownMs = 0): void {
    const ratio = Math.max(0, Math.min(1, playerHp / playerMaxHp));
    requiredElement('player-hp-fill').style.transform = `scaleX(${ratio})`;
    requiredElement('player-hp-text').textContent = `${Math.ceil(playerHp)} / ${playerMaxHp}`;
    requiredElement('run-level').textContent = String(level);
    requiredElement('run-xp-fill').style.transform = `scaleX(${Math.max(0, Math.min(1, xp / xpToNext))})`;
    requiredElement('cycle-label').textContent = `CYCLE ${cycle}`;
    requiredElement('dash-status').textContent = dashCooldownMs <= 0 ? 'READY' : `${(dashCooldownMs / 1000).toFixed(1)}s`;
    requiredElement<HTMLButtonElement>('dash-button').disabled = dashCooldownMs > 0;
  }

  showUpgradeChoices(choices: readonly RunUpgradeDefinition[], callback: (id: string) => void): void {
    const panel = requiredElement('upgrade-panel');
    const options = requiredElement('upgrade-options');
    options.innerHTML = choices.map((choice) => `<button type="button" data-upgrade="${choice.id}"><i>${choice.category.slice(0, 1)}</i><strong>${choice.name}</strong><span>${choice.shortDescription}</span><small>${choice.rarity}</small></button>`).join('');
    options.querySelectorAll<HTMLButtonElement>('button[data-upgrade]').forEach((button) => button.addEventListener('click', () => callback(button.dataset.upgrade ?? ''), { once: true }));
    panel.classList.add('visible'); panel.setAttribute('aria-hidden', 'false');
  }

  hideUpgradeChoices(): void { const panel = requiredElement('upgrade-panel'); panel.classList.remove('visible'); panel.setAttribute('aria-hidden', 'true'); }
  showResumePrompt(): void { const panel = requiredElement('resume-panel'); panel.classList.add('visible'); panel.setAttribute('aria-hidden', 'false'); }
  hideResumePrompt(): void { const panel = requiredElement('resume-panel'); panel.classList.remove('visible'); panel.setAttribute('aria-hidden', 'true'); }
  showFailure(): void { const panel = requiredElement('failure-panel'); panel.classList.add('visible'); panel.setAttribute('aria-hidden', 'false'); }
  hideFailure(): void { const panel = requiredElement('failure-panel'); panel.classList.remove('visible'); panel.setAttribute('aria-hidden', 'true'); }

  toggleVisualCatalog(force?: boolean): void {
    const visible = force ?? !this.visualCatalog.classList.contains('visible');
    this.visualCatalog.classList.toggle('visible', visible);
    this.visualCatalog.setAttribute('aria-hidden', String(!visible));
  }

  showChoices(choices: readonly Mutation[], callback: (mutation: Mutation) => void): void {
    this.choices = [...choices];
    this.choiceCallback = callback;
    this.choiceButtons.forEach((button, index) => {
      const mutation = choices[index];
      const definition = mutation ? MUTATION_BY_ID[mutation] : undefined;
      button.dataset.mutation = mutation ?? '';
      const iconKey = mutation ? `icon.mutation.${mutation}` as const : undefined;
      const iconSource = iconKey ? this.assets.source(iconKey) : undefined;
      button.classList.toggle('production-icon', Boolean(iconSource));
      if (iconSource) button.style.setProperty('--choice-icon', `url("${iconSource}")`);
      else button.style.removeProperty('--choice-icon');
      const name = button.querySelector('strong');
      const description = button.querySelector('span');
      if (name) name.textContent = definition?.name.toUpperCase() ?? '';
      if (description) description.textContent = definition?.shortDescription ?? '';
    });
    this.choicePanel.classList.add('visible');
    this.choicePanel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('choice-open');
  }

  hideChoices(): void {
    this.choicePanel.classList.remove('visible');
    this.choicePanel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('choice-open');
    this.choices = [];
    this.choiceCallback = undefined;
  }

  announce(title: string, subtitle: string, color: string, durationMs = 1400): void {
    const strong = this.announcement.querySelector('strong');
    const span = this.announcement.querySelector('span');
    if (strong) strong.textContent = title;
    if (span) span.textContent = subtitle;
    this.announcement.style.setProperty('--accent', color);
    this.announcement.classList.remove('show');
    void this.announcement.offsetWidth;
    this.announcement.classList.add('show');
    window.clearTimeout(this.announcementTimeout);
    this.announcementTimeout = window.setTimeout(() => this.announcement.classList.remove('show'), durationMs);
  }

  showResult(result: RunResult): void {
    requiredElement('result-time').textContent = formatTime(result.durationMs);
    requiredElement('result-damage').textContent = Math.round(result.totalDamage).toLocaleString();
    requiredElement('result-power').textContent = String(result.powerHits);
    requiredElement('result-evolution').textContent = result.evolutionName;
    requiredElement('result-build').innerHTML = result.mutationIds.map((mutation) => MUTATION_BY_ID[mutation].name.toUpperCase()).join(' <i>•</i> ');
    const eventSummary = requiredElement('result-event-summary');
    eventSummary.hidden = !result.eventId;
    if (result.eventId) {
      requiredElement('result-event-energy').textContent = `+${result.eventProgressEarned ?? 0} HARVEST ENERGY`;
      requiredElement('result-discovery').textContent = result.isNewEvolutionDiscovery ? 'NEW EVOLUTION DISCOVERED' : 'COLLECTION UPDATED';
    }
    this.resultPanel.classList.add('visible');
    this.resultPanel.dataset.evolution = result.evolutionId;
    this.resultPanel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('result-open');
  }

  showEventHub(definition: EventDefinition, state: EventState, outcome?: EventRunOutcome): void {
    const hero = this.eventHub.querySelector<HTMLElement>('.event-colossus');
    const heroSource = this.assets.source('boss.halloween.base');
    hero?.classList.toggle('production-art', Boolean(heroSource));
    if (heroSource) hero?.style.setProperty('--event-boss-art', `url("${heroSource}")`);
    else hero?.style.removeProperty('--event-boss-art');
    const finalMilestone = HALLOWEEN_MILESTONES.at(-1)?.energy ?? 1;
    const ratio = Math.min(1, state.eventProgress / finalMilestone);
    requiredElement('event-energy').textContent = `${state.eventProgress} / ${finalMilestone}`;
    requiredElement('event-progress-fill').style.transform = `scaleX(${ratio})`;
    requiredElement('event-collection-count').textContent = `${state.discoveredEvolutionIds.length} / 6`;
    requiredElement('event-runs').textContent = `${state.bossKills} BOSS DEFEATS`;
    requiredElement('event-hub-title').textContent = definition.displayName;
    requiredElement('event-status').textContent = state.eventCompleted ? 'HARVEST MASTER' : nextMilestoneText(state);

    const activeChallenges = [
      ...HALLOWEEN_CHALLENGES.filter((challenge) => !state.completedChallenges.includes(challenge.id)),
      ...HALLOWEEN_CHALLENGES.filter((challenge) => state.completedChallenges.includes(challenge.id)),
    ].slice(0, 3);
    requiredElement('event-challenges').innerHTML = activeChallenges.map((challenge) => {
      const progress = state.challengeProgress[challenge.id] ?? 0;
      const complete = state.completedChallenges.includes(challenge.id);
      return `<li class="${complete ? 'complete' : ''}"><b>${complete ? '✓' : progress}</b><span>${challenge.title}<small>${Math.min(progress, challenge.target)} / ${challenge.target}</small></span></li>`;
    }).join('');

    requiredElement('event-collection').innerHTML = EVOLUTIONS.map((evolution) => {
      const unlocked = state.discoveredEvolutionIds.includes(evolution.id);
      const source = unlocked ? this.assets.source(`evolution.${evolution.id}`) : undefined;
      return `<div class="collection-entry ${unlocked ? 'unlocked' : 'locked'} ${source ? 'production-art' : ''}" data-evolution="${evolution.id}">${source ? `<img src="${source}" alt="">` : '<i></i>'}<strong>${unlocked ? evolution.name : '?'}</strong><span>${unlocked ? evolution.mutations.map((id) => MUTATION_BY_ID[id].name).join(' • ') : 'UNDISCOVERED'}</span></div>`;
    }).join('');

    requiredElement('event-rewards').innerHTML = HALLOWEEN_REWARDS.map((reward) => {
      const unlocked = state.unlockedRewards.includes(reward.id);
      return `<span class="${unlocked ? 'unlocked' : ''}"><b>${unlocked ? '✓' : '◇'}</b>${reward.name}</span>`;
    }).join('');
    const toast = requiredElement('event-reward-toast');
    const latest = outcome?.unlockedRewards[0] ?? outcome?.newEvolution;
    toast.textContent = outcome?.eventCompletedNow ? 'HALLOWEEN 2026 COMPLETE' : latest ? `NEW UNLOCK · ${labelForUnlock(latest)}` : '';
    toast.hidden = !toast.textContent;
    requiredElement<HTMLButtonElement>('event-enter').textContent = state.completedRuns > 0 ? 'FIGHT AGAIN' : 'ENTER EVENT';
    this.eventHub.classList.toggle('complete', state.eventCompleted);
    this.eventHub.classList.add('visible');
    this.eventHub.setAttribute('aria-hidden', 'false');
    document.body.classList.add('event-hub-open');
  }

  hideEventHub(): void {
    this.eventHub.classList.remove('visible');
    this.eventHub.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('event-hub-open');
  }

  reset(): void {
    this.resultPanel.classList.remove('visible');
    delete this.resultPanel.dataset.evolution;
    this.resultPanel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('result-open');
    this.hideChoices();
    this.hideUpgradeChoices();
    this.hideFailure();
    this.announcement.classList.remove('show');
    window.clearTimeout(this.announcementTimeout);
    (['crystal', 'void', 'wings', 'pumpkin'] as Mutation[]).forEach((mutation) => this.setMutation(mutation, false));
    this.setBreakpoint('break-1', false);
    this.setBreakpoint('break-2', false);
    requiredElement('bp-core').classList.remove('broken');
  }

  private chooseResume(resume: boolean): void { this.hideResumePrompt(); this.onResumeChoice?.(resume); }

  private bindJoystick(): void {
    const joystick = requiredElement('joystick'); const knob = requiredElement('joystick-knob');
    let pointerId: number | undefined;
    const update = (event: PointerEvent): void => {
      const rect = joystick.getBoundingClientRect(); const radius = Math.max(1, rect.width * 0.34);
      let x = event.clientX - (rect.left + rect.width / 2); let y = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(x, y); if (distance > radius) { x = x / distance * radius; y = y / distance * radius; }
      knob.style.transform = `translate(${x}px, ${y}px)`; this.onMove?.({ x: x / radius, y: y / radius });
    };
    joystick.addEventListener('pointerdown', (event) => { pointerId = event.pointerId; joystick.setPointerCapture(pointerId); update(event); event.preventDefault(); });
    joystick.addEventListener('pointermove', (event) => { if (event.pointerId === pointerId) update(event); });
    const release = (event: PointerEvent): void => { if (event.pointerId !== pointerId) return; pointerId = undefined; knob.style.transform = ''; this.onMove?.({ x: 0, y: 0 }); };
    joystick.addEventListener('pointerup', release); joystick.addEventListener('pointercancel', release);
  }

  private bindArenaZoom(): void {
    const surface = requiredElement('game-canvas'); const pointers = new Map<number, { x: number; y: number }>(); let previousDistance = 0;
    surface.addEventListener('wheel', (event) => { event.preventDefault(); this.onZoom?.(event.deltaY > 0 ? -0.055 : 0.055); }, { passive: false });
    surface.addEventListener('pointerdown', (event) => { pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); });
    surface.addEventListener('pointermove', (event) => { if (!pointers.has(event.pointerId)) return; pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.size !== 2) { previousDistance = 0; return; } const [a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(previousDistance>0&&Math.abs(distance-previousDistance)>3)this.onZoom?.((distance-previousDistance)*.0025);previousDistance=distance; });
    const release=(event:PointerEvent):void=>{pointers.delete(event.pointerId);previousDistance=0};surface.addEventListener('pointerup',release);surface.addEventListener('pointercancel',release);
  }
}

function nextMilestoneText(state: EventState): string {
  const next = HALLOWEEN_MILESTONES.find((milestone) => !state.milestones.includes(milestone.id));
  return next ? `NEXT · ${next.title}` : 'ALL MILESTONES COMPLETE';
}

function labelForUnlock(id: string): string {
  return HALLOWEEN_REWARDS.find((reward) => reward.id === id)?.name
    ?? EVOLUTIONS.find((evolution) => evolution.id === id)?.name
    ?? id.toUpperCase();
}

function requiredElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element #${id}`);
  return element as T;
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
