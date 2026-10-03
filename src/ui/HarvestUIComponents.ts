import { HARVEST_UI_ASSETS } from './HarvestUIAssetCatalog';
import { renderHarvestDetailScreens, renderHarvestStatePreview } from './HarvestMetaPanels';

export const HARVEST_HUB_SECTIONS = [
  { id: 'progression', index: '01', title: 'Hero Progression', icon: '✦', lead: 'EVOLUTION PATH', copy: 'Grow the same creature through readable milestones.', tone: 'cyan' },
  { id: 'skills', index: '02', title: 'Skills System', icon: '✧', lead: 'ACTIVE LOADOUT', copy: 'Shape a focused combat kit with active and passive slots.', tone: 'violet' },
  { id: 'inventory', index: '03', title: 'Inventory', icon: '◆', lead: 'EQUIPPED RELICS', copy: 'Review collected gear without leaving the Harvest identity.', tone: 'blue' },
  { id: 'shop', index: '04', title: 'Item Shop', icon: '◇', lead: 'VISUAL LAYOUT', copy: 'Presentation shell only; no commerce logic was added.', tone: 'orange' },
  { id: 'reinforcement', index: '05', title: 'Reinforcement', icon: '↑', lead: 'GEAR PREVIEW', copy: 'A reusable upgrade panel ready for existing systems.', tone: 'gold' },
  { id: 'customization', index: '06', title: 'Wings & Customization', icon: '⌁', lead: 'MODULAR SLOTS', copy: 'Head, back, core and aura remain separate attachments.', tone: 'violet' },
  { id: 'builds', index: '07', title: 'Build Variety', icon: '⬡', lead: 'CURRENT BUILD', copy: 'Crystal, Void and Harvest identities stay immediately legible.', tone: 'cyan' },
  { id: 'pets', index: '08', title: 'Pets / Companions', icon: '●', lead: 'EMBER WISP', copy: 'Compact companion presentation with room for collection states.', tone: 'orange' },
  { id: 'collection', index: '09', title: 'Loot / Collection', icon: '▰', lead: 'DISCOVERED 18 / 42', copy: 'Rarity and ownership remain readable at mobile scale.', tone: 'gold' },
  { id: 'gameplay', index: '10', title: 'Gameplay', icon: '▶', lead: 'ENTER HARVEST ARENA', copy: 'Return directly to the current Hybrid‑3D combat slice.', tone: 'orange' },
] as const;

export type HarvestHubSectionId = typeof HARVEST_HUB_SECTIONS[number]['id'];

export function renderHarvestHub(): string {
  return `<div class="hc-hub-shell">
    <header class="hc-hub-header">
      <div><small>HARVEST COLOSSUS</small><h1>HERO SANCTUM</h1><p>Build · Evolve · Enter the arena</p></div>
      <div class="hc-wallet" aria-label="Local preview currencies"><span><i class="coin"></i>12,450</span><span><i class="crystal"></i>840</span></div>
      <button type="button" class="hc-image-button hc-close" data-hub-close aria-label="Close hub"><img src="${HARVEST_UI_ASSETS['ui.nav.close'].runtimePath}" alt=""></button>
    </header>
    <nav class="hc-hub-tabs" aria-label="Hub sections">${HARVEST_HUB_SECTIONS.map((section, index) => `<button type="button" data-hub-target="${section.id}" class="${index === 0 ? 'active' : ''}"><i>${section.icon}</i><span>${section.title}</span></button>`).join('')}</nav>
    <div class="hc-hub-content" tabindex="0">
      <div class="hc-hub-overview" data-hub-overview>
      <section class="hc-hub-hero hc-nine-slice">
        <div class="hc-hero-orbit"><img src="/assets/creature/evo1/hero-evo1-s-idle.webp" alt="Evo 1 hero"><i></i></div>
        <div><small>EVO 1 · CRYSTAL AWAKENING</small><h2>ASTRA</h2><p>Compact directional Hero family integrated into the existing 8-direction runtime.</p><div class="hc-progress"><i></i></div><b>LV. 32 · 74%</b></div>
        <button type="button" class="hc-primary" data-hub-enter-combat>ENTER ARENA</button>
      </section>
      <div class="hc-hub-grid">${HARVEST_HUB_SECTIONS.map(renderHubCard).join('')}</div>
      </div>
      <div class="hc-detail-stack">${renderHarvestDetailScreens()}</div>
    </div>
  </div>`;
}

function renderHubCard(section: typeof HARVEST_HUB_SECTIONS[number]): string {
  const gameplay = section.id === 'gameplay';
  return `<article id="hub-${section.id}" class="hc-hub-card hc-nine-slice tone-${section.tone}" data-hub-section="${section.id}">
    <header><b>${section.index}</b><div><small>${section.lead}</small><h3>${section.title}</h3></div><i>${section.icon}</i></header>
    <div class="hc-card-preview">${renderCardPreview(section.id)}</div>
    <p>${section.copy}</p>
    <button type="button" class="hc-card-action" ${gameplay ? 'data-hub-enter-combat' : `data-hub-target="${section.id}"`}>${gameplay ? 'PLAY NOW' : 'OPEN SECTION'}</button>
  </article>`;
}

function renderCardPreview(id: HarvestHubSectionId): string {
  if (id === 'progression') return '<div class="hc-evo-line"><img src="/assets/creature/evo1/hero-evo1-s-idle.webp" alt=""><i></i><img src="/assets/creature/evo1/hero-evo1-se-run.webp" alt=""><i></i><span>60</span></div>';
  if (id === 'skills') return '<div class="hc-icon-row"><b>➤</b><b>◆</b><b>✦</b><b class="locked">⌁</b></div>';
  if (id === 'inventory' || id === 'collection') return '<div class="hc-item-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
  if (id === 'shop') return '<div class="hc-shop-row"><i>◆</i><i>⬡</i><i>▣</i></div>';
  if (id === 'reinforcement') return '<div class="hc-reinforce"><b>+1</b><span>◆</span><em>→</em><b>+10</b></div>';
  if (id === 'customization') return '<div class="hc-icon-row wings"><b>⌁</b><b>◈</b><b>✦</b><b>◇</b></div>';
  if (id === 'builds') return '<div class="hc-builds"><i class="cyan"></i><i class="violet"></i><i class="orange"></i><i class="green"></i></div>';
  if (id === 'pets') return '<div class="hc-pets"><img src="/assets/pet/ember-wisp.webp" alt="Ember Wisp"><b>EMBER WISP</b></div>';
  return '<div class="hc-gameplay-preview"><span>HARVEST BASIN</span><b>▶</b></div>';
}

export function renderHarvestUIPreview(): string {
  const heroDirections = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  return `<div class="hc-preview-shell">
    <header><div><small>INTERNAL DESIGN QA</small><h1>HARVEST UI FOUNDATION</h1></div><button type="button" class="hc-image-button" data-ui-preview-close aria-label="Close UI preview"><img src="${HARVEST_UI_ASSETS['ui.nav.close'].runtimePath}" alt=""></button></header>
    <div class="hc-preview-scroll">
      <section><h2>9-Slice Panels</h2><div class="hc-preview-panels"><article class="hc-nine-slice wide">Large Horizontal</article><article class="hc-nine-slice medium">Medium</article><article class="hc-nine-slice square">Square</article><article class="hc-nine-slice tall">Tall</article></div></section>
      <section><h2>Buttons & Tabs</h2><div class="hc-preview-buttons"><button class="hc-primary">DEFAULT</button><button class="hc-primary active">ACTIVE</button><button class="hc-primary" disabled>DISABLED</button><button class="hc-tab active">ACTIVE TAB</button><button class="hc-tab">DEFAULT TAB</button></div></section>
      <section><h2>Slots, Rarity & Status</h2>${renderHarvestStatePreview()}</section>
      <section><h2>Combat Components</h2>${renderCombatPreview()}</section>
      <section><h2>Evo 1 · 8 Directions × 4 States</h2>${['idle', 'run', 'dash', 'attack'].map((pose) => `<h3>${pose}</h3><div class="hc-hero-audit">${heroDirections.map((direction) => `<figure><img src="/assets/creature/evo1/hero-evo1-${direction}-${pose}.webp" alt="${direction} ${pose}"><figcaption>${direction.toUpperCase()}</figcaption></figure>`).join('')}</div>`).join('')}</section>
    </div>
  </div>`;
}

function renderCombatPreview(): string {
  return `<div class="hc-combat-preview"><div class="preview-boss"><strong>HARVEST COLOSSUS</strong><time>02:14</time><i><b></b></i><span><em>BREAK I</em><em>BREAK II</em><em>CORE</em></span></div><div class="preview-party"><b>YOU</b><i></i><small>100 / 100</small><b>PLAYER 2</b><i></i><small>82 / 100</small></div><div class="preview-radar"><i></i><b></b></div><div class="preview-controls"><button>DASH</button><button class="power">POWER HIT</button><button>◆</button><button class="locked">⌁</button></div><div class="preview-overlays"><b>160</b><strong>1,248 CRIT!</strong><i></i><em></em></div></div>`;
}

export function responsiveHubColumns(width: number): 1 | 2 | 3 {
  return width < 620 ? 1 : width < 1040 ? 2 : 3;
}
