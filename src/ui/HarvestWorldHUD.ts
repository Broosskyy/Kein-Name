import { HERO_CLASSES, type HeroClassId, type WorldProgression } from '../gameplay/WorldProgression';
import type { WorldPortalDefinition, WorldQuestDefinition } from '../gameplay/WorldMapDefinition';
import type { WorldQuestState } from '../gameplay/WorldQuestSystem';

export class HarvestWorldHUD {
  readonly root = document.createElement('section');
  private readonly heroLevel: HTMLElement;
  private readonly heroBar: HTMLElement;
  private readonly jobLevel: HTMLElement;
  private readonly jobBar: HTMLElement;
  private readonly classState: HTMLElement;
  private readonly questList: HTMLElement;
  private readonly context: HTMLButtonElement;
  private readonly target: HTMLElement;
  private readonly attack: HTMLButtonElement;
  private onInteract?: () => void;
  private onClass?: (classId: HeroClassId) => void;
  private onAttack?: () => void;

  constructor(mapName: string, subtitle: string) {
    this.root.id = 'world-hud';
    this.root.innerHTML = `<header><small>WORLD MAP</small><strong>${mapName}</strong><span>${subtitle}</span></header>
      <section class="world-progress"><div><b>HERO <em data-world-hero-level>1</em></b><i><u data-world-hero-bar></u></i></div><div><b>JOB <em data-world-job-level>1</em></b><i><u data-world-job-bar></u></i></div><p data-world-class></p></section>
      <section class="world-quests"><small>ACTIVE QUESTS</small><div data-world-quests></div></section>
      <div class="world-target" data-world-target hidden></div>
      <button class="world-attack" type="button" data-world-attack disabled><b>ATTACK</b><span>SELECT TARGET</span></button>
      <button class="world-context" type="button" data-world-context hidden>INTERACT</button>
      <section class="world-class-select" data-world-class-select hidden><small>CLASS AWAKENING</small><strong>CHOOSE YOUR PATH</strong><div>${HERO_CLASSES.map((heroClass) => `<button type="button" data-world-class="${heroClass.id}"><b>${heroClass.name}</b><span>${heroClass.combatRole}</span><small>${heroClass.description}</small></button>`).join('')}</div></section>`;
    document.body.appendChild(this.root);
    this.heroLevel = required(this.root, '[data-world-hero-level]');
    this.heroBar = required(this.root, '[data-world-hero-bar]');
    this.jobLevel = required(this.root, '[data-world-job-level]');
    this.jobBar = required(this.root, '[data-world-job-bar]');
    this.classState = required(this.root, '[data-world-class]');
    this.questList = required(this.root, '[data-world-quests]');
    this.context = required<HTMLButtonElement>(this.root, '[data-world-context]');
    this.target = required(this.root, '[data-world-target]');
    this.attack = required<HTMLButtonElement>(this.root, '[data-world-attack]');
    this.context.addEventListener('pointerdown', (event) => { event.preventDefault(); event.stopPropagation(); this.onInteract?.(); });
    this.attack.addEventListener('pointerdown', (event) => { event.preventDefault(); event.stopPropagation(); this.onAttack?.(); });
    this.root.querySelectorAll<HTMLButtonElement>('[data-world-class]').forEach((button) => button.addEventListener('click', () => this.onClass?.(button.dataset.worldClass as HeroClassId)));
  }

  bindInteract(callback: () => void): void { this.onInteract = callback; }
  bindClass(callback: (classId: HeroClassId) => void): void { this.onClass = callback; }
  bindAttack(callback: () => void): void { this.onAttack = callback; }

  updateProgress(progression: WorldProgression): void {
    this.heroLevel.textContent = String(progression.heroLevel);
    this.heroBar.style.transform = `scaleX(${Math.min(1, progression.heroXp / progression.heroXpToNext)})`;
    this.jobLevel.textContent = String(progression.jobLevel);
    this.jobBar.style.transform = `scaleX(${Math.min(1, progression.jobXp / progression.jobXpToNext)})`;
    this.classState.textContent = progression.classId
      ? `CLASS · ${HERO_CLASSES.find((item) => item.id === progression.classId)?.name.toUpperCase()}`
      : `CLASS UNLOCK · HERO 15 + JOB 20`;
    const selection = required<HTMLElement>(this.root, '[data-world-class-select]');
    selection.hidden = !progression.classSelectionEligible;
  }

  updateQuests(definitions: readonly WorldQuestDefinition[], states: readonly WorldQuestState[]): void {
    this.questList.innerHTML = definitions.map((quest) => {
      const state = states.find((candidate) => candidate.id === quest.id);
      return `<article class="${state?.complete ? 'complete' : ''}"><b>${state?.complete ? '✓' : '◇'}</b><span><strong>${quest.title}</strong><small>${state?.progress ?? 0} / ${quest.targetCount}</small></span></article>`;
    }).join('');
  }

  showPortal(portal?: WorldPortalDefinition, allowed = false): void {
    this.context.hidden = !portal;
    if (!portal) return;
    this.context.disabled = !allowed;
    this.context.innerHTML = `<b>${allowed ? 'ENTER' : 'LOCKED'}</b><span>${portal.name}</span>`;
  }

  showTarget(name?: string, level = 1, hp = 0, maxHp = 1): void {
    this.target.hidden = !name;
    if (!name) return;
    this.target.innerHTML = `<b>LV. ${level} · ${name}</b><i><u style="transform:scaleX(${Math.max(0, hp / maxHp)})"></u></i>`;
  }

  updateAttack(selected: boolean, attacking: boolean, inRange: boolean): void {
    this.attack.disabled = !selected;
    this.attack.classList.toggle('active', attacking);
    const title = this.attack.querySelector('b');
    const status = this.attack.querySelector('span');
    if (title) title.textContent = attacking ? 'STOP' : 'ATTACK';
    if (status) status.textContent = !selected ? 'SELECT TARGET' : attacking ? 'AUTO ATTACK' : inRange ? 'READY' : 'MOVE CLOSER';
  }

  destroy(): void { this.root.remove(); }
}

function required<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing world HUD element: ${selector}`);
  return element;
}
