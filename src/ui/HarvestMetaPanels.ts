import { HARVEST_UI_ASSETS } from './HarvestUIAssetCatalog';
import type { HarvestHubSectionId } from './HarvestUIComponents';

export const HARVEST_RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'] as const;
export type HarvestRarity = typeof HARVEST_RARITIES[number];

interface SlotOptions {
  readonly label: string;
  readonly rarity: HarvestRarity;
  readonly icon?: string;
  readonly image?: string;
  readonly badge?: 'NEW' | 'EQUIPPED' | 'LOCKED' | 'EVENT';
  readonly selected?: boolean;
}

const loot = {
  common: '/assets/loot/loot-common-a.webp',
  rare: '/assets/loot/loot-rare-a.webp',
  epic: '/assets/loot/loot-epic-a.webp',
  commonB: '/assets/loot/loot-common-b.webp',
  rareB: '/assets/loot/loot-rare-b.webp',
  epicB: '/assets/loot/loot-epic-b.webp',
} as const;

export function renderHarvestDetailScreens(): string {
  return [
    detail('progression', 'Hero Progression', 'Evolution milestones preserve one recognizable creature identity.', renderProgression()),
    detail('skills', 'Skills System', 'Reusable active, passive, cooldown and locked states.', renderSkills()),
    detail('inventory', 'Inventory', 'Rarity, equipment and ownership remain readable without baked text.', renderInventory()),
    detail('shop', 'Item Shop', 'Visual foundation only — no purchase, currency or commerce system is active.', renderShop()),
    detail('reinforcement', 'Reinforcement', 'A presentation shell ready to bind to existing item data later.', renderReinforcement()),
    detail('customization', 'Wings & Customization', 'Modular attachment slots remain separate from the base Hero.', renderCustomization()),
    detail('builds', 'Build Variety', 'Clear family identity with compact ability summaries.', renderBuilds()),
    detail('pets', 'Pets / Companions', 'Compact companion cards with the production Ember Wisp active.', renderPets()),
    detail('collection', 'Loot / Collection', 'Discovery, rarity and collection bonus presentation.', renderCollection()),
    detail('gameplay', 'Gameplay', 'The live Hybrid-3D arena remains the authoritative combat runtime.', renderGameplay()),
  ].join('');
}

function detail(id: HarvestHubSectionId, title: string, subtitle: string, content: string): string {
  return `<section id="hub-detail-${id}" class="hc-detail-screen" data-hub-detail="${id}" aria-hidden="true">
    <header class="hc-detail-header">
      <button type="button" class="hc-image-button" data-hub-back aria-label="Back to Hero Sanctum"><img src="${HARVEST_UI_ASSETS['ui.nav.back'].runtimePath}" alt=""></button>
      <div><small>HERO SANCTUM · ${id.toUpperCase()}</small><h2>${title}</h2><p>${subtitle}</p></div>
    </header>
    <div class="hc-detail-body">${content}</div>
    <output class="hc-detail-feedback" aria-live="polite"></output>
  </section>`;
}

function renderProgression(): string {
  return `<div class="hc-detail-layout progression-layout">
    <article class="hc-detail-panel hc-hero-stage"><span class="hc-kicker">CURRENT EVOLUTION · EVO 1</span><img src="/assets/creature/evo1/hero-evo1-s-idle.webp" alt="Astra Evo 1"><h3>ASTRA</h3><p>Warm cream body · graphite accents · crystal awakening</p><div class="hc-level-ring"><b>32</b><span>LEVEL</span></div></article>
    <article class="hc-detail-panel"><h3>Evolution Path</h3><div class="hc-evolution-track">${[1,30,60,100].map((level, index) => `<button type="button" data-ui-select class="${index === 1 ? 'selected' : ''}"><img src="/assets/creature/evo1/hero-evo1-${index % 2 ? 'se' : 's'}-${index < 2 ? 'idle' : 'attack'}.webp" alt=""><b>LV. ${level}</b><small>${index <= 1 ? 'UNLOCKED' : 'PREVIEW'}</small></button>`).join('')}</div><div class="hc-stat-list"><span>ATK <b>1,240</b></span><span>HP <b>8,650</b></span><span>CRIT <b>24%</b></span><span>SPD <b>110%</b></span></div></article>
  </div>`;
}

function renderSkills(): string {
  const actives = [
    slot({ label: 'Crystal Bolt', rarity: 'rare', icon: '➤', selected: true }),
    slot({ label: 'Core Shard', rarity: 'epic', icon: '◆' }),
    slot({ label: 'Void Pulse', rarity: 'epic', icon: '◉' }),
    slot({ label: 'Ember Cut', rarity: 'legendary', icon: '╱' }),
  ].join('');
  return `<div class="hc-detail-layout"><article class="hc-detail-panel hc-wide"><div class="hc-subtabs" data-ui-group><button class="active" data-ui-select>ACTIVE</button><button data-ui-select>PASSIVE</button><button data-ui-select>LOADOUT 1</button></div><div class="hc-slot-grid skills">${actives}${slot({ label: 'Locked', rarity: 'common', icon: '⌁', badge: 'LOCKED' })}${slot({ label: 'Locked', rarity: 'common', icon: '⌁', badge: 'LOCKED' })}</div></article><article class="hc-detail-panel hc-skill-tree"><h3>Crystal Core</h3><div><b>◆</b><i></i><b>✦</b><i></i><b>⬡</b></div><p>Preview connections are presentation only. Combat values remain owned by the gameplay core.</p></article></div>`;
}

function renderInventory(): string {
  return `<div class="hc-detail-layout inventory-layout"><article class="hc-detail-panel"><div class="hc-subtabs" data-ui-group><button class="active" data-ui-select>ALL</button><button data-ui-select>GEAR</button><button data-ui-select>RELICS</button><button data-ui-select>MATERIALS</button></div><div class="hc-slot-grid">${[
    slot({ label: 'Stone Shard', rarity: 'common', image: loot.common, selected: true }), slot({ label: 'Blue Relic', rarity: 'rare', image: loot.rare, badge: 'NEW' }), slot({ label: 'Core Relic', rarity: 'epic', image: loot.epic }), slot({ label: 'Rubble Bundle', rarity: 'common', image: loot.commonB }), slot({ label: 'Ancient Prism', rarity: 'rare', image: loot.rareB }), slot({ label: 'Harvest Core', rarity: 'legendary', image: loot.epicB, badge: 'EQUIPPED' }),
  ].join('')}</div></article><article class="hc-detail-panel hc-loadout"><h3>Equipped Hero</h3><img src="/assets/creature/evo1/hero-evo1-se-idle.webp" alt="Equipped Hero"><div class="hc-stat-list"><span>ATK <b>1,240</b></span><span>HP <b>8,650</b></span><span>CRIT <b>24%</b></span><span>SPD <b>110%</b></span></div></article></div>`;
}

function renderShop(): string {
  const cards = [
    { name: 'Crystal Cache', image: loot.rareB, rarity: 'rare' as const, tag: 'FEATURED' },
    { name: 'Void Reliquary', image: loot.epic, rarity: 'epic' as const, tag: 'PREVIEW' },
    { name: 'Harvest Coffer', image: loot.epicB, rarity: 'legendary' as const, tag: 'EVENT' },
  ];
  return `<div class="hc-shop-notice"><b>VISUAL PREVIEW</b><span>No store, payment, balance mutation or monetization logic is implemented.</span></div><div class="hc-shop-cards">${cards.map((card) => `<article class="hc-shop-card rarity-${card.rarity}"><small>${card.tag}</small><img src="${card.image}" alt=""><h3>${card.name}</h3><p>Presentation card · dynamic price slot</p><button type="button" class="hc-primary" data-meta-action="${card.name} selected in preview">PREVIEW</button></article>`).join('')}</div>`;
}

function renderReinforcement(): string {
  return `<div class="hc-detail-layout"><article class="hc-detail-panel hc-reinforce-stage"><div><small>CURRENT</small>${slot({ label: 'Core +1', rarity: 'rare', image: loot.rare, selected: true })}<b>+1</b></div><em>→</em><div><small>PREVIEW</small>${slot({ label: 'Core +10', rarity: 'legendary', image: loot.epic })}<b>+10</b></div></article><article class="hc-detail-panel"><h3>Enhancement Materials</h3><div class="hc-slot-grid compact">${slot({ label: 'Stone', rarity: 'common', image: loot.common })}${slot({ label: 'Prism', rarity: 'rare', image: loot.rareB })}${slot({ label: 'Empty', rarity: 'common', icon: '+' })}</div><div class="hc-meter"><i></i></div><div class="hc-stat-list"><span>ATK <b>+80 → +320</b></span><span>CRIT <b>+5% → +12%</b></span></div><button type="button" class="hc-primary" data-meta-action="Enhancement preview ready">ENHANCE PREVIEW</button></article></div>`;
}

function renderCustomization(): string {
  const wings = ['✦', '⌁', '◆', '◈', '❖', '◇', '✧', '⬡'];
  return `<div class="hc-detail-panel hc-wide"><div class="hc-subtabs" data-ui-group><button class="active" data-ui-select>WINGS</button><button data-ui-select>HEAD</button><button data-ui-select>CORE</button><button data-ui-select>PAWS</button><button data-ui-select>AURA</button></div><div class="hc-customization"><div class="hc-wing-grid" data-ui-group>${wings.map((wing, index) => `<button type="button" data-ui-select class="rarity-${HARVEST_RARITIES[Math.min(HARVEST_RARITIES.length - 1, Math.floor(index / 2))]} ${index === 0 ? 'selected' : ''}"><i>${wing}</i><small>${index === 0 ? 'EQUIPPED' : 'PREVIEW'}</small></button>`).join('')}</div><div class="hc-hero-stage"><img src="/assets/creature/evo1/hero-evo1-s-idle.webp" alt="Customization Hero"><p>Attachments remain separate runtime layers. No wings or weapons are baked into the base Hero.</p></div></div></div>`;
}

function renderBuilds(): string {
  const builds = [
    ['Crystal', 'cyan', '◆', 'Control · Shatter'], ['Void', 'violet', '◉', 'Burst · Drain'], ['Ember', 'orange', '✦', 'Burn · Impact'], ['Nature', 'green', '❈', 'Sustain · Growth'], ['Harvest', 'gold', '⬡', 'Loot · Core'],
  ];
  return `<div class="hc-build-grid" data-ui-group>${builds.map(([name, tone, icon, copy], index) => `<button type="button" data-ui-select class="hc-build-card tone-${tone} ${index === 0 ? 'selected' : ''}"><i>${icon}</i><h3>${name}</h3><p>${copy}</p><span><b>${icon}</b><b>${icon}</b><b>⌁</b></span></button>`).join('')}</div>`;
}

function renderPets(): string {
  const petCards = [
    ['Ember Wisp', 'ACTIVE', 'orange'], ['Crystal Wisp', 'PREVIEW', 'cyan'], ['Void Wisp', 'PREVIEW', 'violet'], ['Nature Wisp', 'LOCKED', 'green'],
  ];
  return `<div class="hc-pet-grid" data-ui-group>${petCards.map(([name, state, tone], index) => `<button type="button" data-ui-select class="hc-pet-card tone-${tone} ${index === 0 ? 'selected' : ''}"><span><img src="/assets/pet/ember-wisp.webp" alt="${name}"></span><h3>${name}</h3><small>${state}</small></button>`).join('')}</div><p class="hc-implementation-note">Only Ember Wisp has production runtime art. Other cards demonstrate reusable collection states and do not invent gameplay companions.</p>`;
}

function renderCollection(): string {
  const items = [
    slot({ label: 'Stone Shard', rarity: 'common', image: loot.common }), slot({ label: 'Ruin Prism', rarity: 'rare', image: loot.rare }), slot({ label: 'Colossus Core', rarity: 'epic', image: loot.epic, badge: 'NEW' }), slot({ label: 'Stone Bundle', rarity: 'common', image: loot.commonB }), slot({ label: 'Ancient Prism', rarity: 'rare', image: loot.rareB }), slot({ label: 'Harvest Relic', rarity: 'legendary', image: loot.epicB, badge: 'EVENT' }), slot({ label: 'Undiscovered', rarity: 'common', icon: '?', badge: 'LOCKED' }),
  ].join('');
  return `<div class="hc-detail-layout collection-layout"><article class="hc-detail-panel"><div class="hc-subtabs" data-ui-group><button class="active" data-ui-select>ALL</button><button data-ui-select>LOOT</button><button data-ui-select>RELICS</button><button data-ui-select>EVENT</button></div><div class="hc-slot-grid">${items}</div></article><article class="hc-detail-panel"><h3>Collection Bonus</h3><div class="hc-collection-medal">✦</div><div class="hc-stat-list"><span>DISCOVERED <b>18 / 42</b></span><span>ATK <b>+15%</b></span><span>HP <b>+15%</b></span><span>CRIT <b>+10%</b></span></div></article></div>`;
}

function renderGameplay(): string {
  return `<div class="hc-gameplay-detail"><article class="hc-detail-panel"><span class="hc-kicker">LIVE RUNTIME</span><h3>Harvest Basin</h3><p>Hybrid-3D world, world-space Hero/Boss/projectiles, manual camera and the current combat HUD.</p><div class="hc-runtime-features"><span>3D WORLD</span><span>8-DIR HERO</span><span>WORLD TELEGRAPHS</span><span>PHYSICAL LOOT</span></div><button type="button" class="hc-primary" data-hub-enter-combat>ENTER ARENA</button></article><div class="hc-combat-stage"><b>HARVEST COLOSSUS</b><i></i><img src="/assets/creature/evo1/hero-evo1-n-attack.webp" alt="Hero attacks"><span>▶</span></div></div>`;
}

function slot(options: SlotOptions): string {
  return `<button type="button" class="hc-item-slot rarity-${options.rarity} ${options.selected ? 'selected' : ''}" data-ui-select aria-label="${options.label}">${options.badge ? `<small class="badge badge-${options.badge.toLowerCase()}">${options.badge}</small>` : ''}${options.image ? `<img src="${options.image}" alt="">` : `<i>${options.icon ?? '◆'}</i>`}<span>${options.label}</span></button>`;
}

export function renderHarvestStatePreview(): string {
  return `<div class="hc-state-preview"><div><h3>Item rarity & selection</h3><div class="hc-slot-grid compact">${HARVEST_RARITIES.map((rarity, index) => slot({ label: rarity.toUpperCase(), rarity, image: [loot.common, loot.rare, loot.epic, loot.epicB, loot.rareB][index], selected: index === 2, badge: index === 1 ? 'NEW' : index === 4 ? 'EVENT' : undefined })).join('')}</div></div><div><h3>Status badges</h3><div class="hc-badge-row"><b class="badge badge-new">NEW</b><b class="badge badge-equipped">EQUIPPED</b><b class="badge badge-locked">LOCKED</b><b class="badge badge-event">EVENT</b></div></div></div>`;
}
