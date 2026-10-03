export type HarvestUIAssetId =
  | 'ui.panel.largeHorizontal'
  | 'ui.panel.mediumHorizontal'
  | 'ui.panel.mediumRect'
  | 'ui.panel.square'
  | 'ui.panel.tallVertical'
  | 'ui.button.primary'
  | 'ui.button.primaryActive'
  | 'ui.button.disabled'
  | 'ui.tab.default'
  | 'ui.tab.active'
  | 'ui.nav.back'
  | 'ui.nav.close'
  | 'ui.slot.common'
  | 'ui.slot.rare'
  | 'ui.slot.epic'
  | 'ui.slot.legendary'
  | 'ui.slot.mythic'
  | 'ui.badge.new'
  | 'ui.badge.equipped'
  | 'ui.badge.locked'
  | 'ui.badge.event'
  | 'ui.card.shop'
  | 'ui.card.pet'
  | 'ui.card.build'
  | 'combat.bossBar'
  | 'combat.playerPlate'
  | 'combat.partyRow'
  | 'combat.minimap'
  | 'combat.zoom'
  | 'combat.joystick'
  | 'combat.dash'
  | 'combat.powerHit'
  | 'combat.skillSlot'
  | 'combat.skillLocked'
  | 'combat.targetMarker'
  | 'combat.lootBeam'
  | 'combat.aoeWarning'
  | 'combat.telegraph';

export interface HarvestUIAssetDefinition {
  id: HarvestUIAssetId;
  runtimePath?: string;
  sourceSheet: string;
  render: 'nine-slice' | 'image' | 'css-component' | 'world-space';
  slice?: Readonly<{ top: number; right: number; bottom: number; left: number }>;
}

const UI_ROOT = '/assets/ui/harvest';

export const HARVEST_UI_ASSETS: Readonly<Record<HarvestUIAssetId, HarvestUIAssetDefinition>> = Object.freeze({
  'ui.panel.largeHorizontal': panel('ui.panel.largeHorizontal', 'panel-large-horizontal.webp', [82, 105, 82, 105]),
  'ui.panel.mediumHorizontal': panel('ui.panel.mediumHorizontal', 'panel-medium-horizontal.webp', [68, 90, 68, 90]),
  'ui.panel.mediumRect': panel('ui.panel.mediumRect', 'panel-medium-rect.webp', [62, 66, 62, 66]),
  'ui.panel.square': panel('ui.panel.square', 'panel-square.webp', [62, 66, 62, 66]),
  'ui.panel.tallVertical': panel('ui.panel.tallVertical', 'panel-tall-vertical.webp', [66, 62, 66, 62]),
  'ui.button.primary': panel('ui.button.primary', 'button-primary.webp', [54, 92, 54, 92]),
  'ui.button.primaryActive': panel('ui.button.primaryActive', 'button-primary-active.webp', [54, 92, 54, 92]),
  'ui.button.disabled': panel('ui.button.disabled', 'button-disabled.webp', [54, 92, 54, 92]),
  'ui.tab.default': panel('ui.tab.default', 'button-primary.webp', [54, 92, 54, 92]),
  'ui.tab.active': panel('ui.tab.active', 'button-primary-active.webp', [54, 92, 54, 92]),
  'ui.nav.back': image('ui.nav.back', 'nav-back.webp'),
  'ui.nav.close': image('ui.nav.close', 'nav-close.webp'),
  'ui.slot.common': reference('ui.slot.common', 'harvest-item-slots-master.png'),
  'ui.slot.rare': reference('ui.slot.rare', 'harvest-item-slots-master.png'),
  'ui.slot.epic': reference('ui.slot.epic', 'harvest-item-slots-master.png'),
  'ui.slot.legendary': reference('ui.slot.legendary', 'harvest-item-slots-master.png'),
  'ui.slot.mythic': reference('ui.slot.mythic', 'harvest-item-slots-master.png'),
  'ui.badge.new': reference('ui.badge.new', 'harvest-ui-controls-master-02.png'),
  'ui.badge.equipped': reference('ui.badge.equipped', 'harvest-ui-controls-master-02.png'),
  'ui.badge.locked': reference('ui.badge.locked', 'harvest-ui-controls-master-02.png'),
  'ui.badge.event': reference('ui.badge.event', 'harvest-ui-controls-master-02.png'),
  'ui.card.shop': reference('ui.card.shop', 'harvest-shop-cards-master.png'),
  'ui.card.pet': reference('ui.card.pet', 'harvest-pets-builds-master.png'),
  'ui.card.build': reference('ui.card.build', 'harvest-pets-builds-master.png'),
  'combat.bossBar': css('combat.bossBar'),
  'combat.playerPlate': css('combat.playerPlate'),
  'combat.partyRow': css('combat.partyRow'),
  'combat.minimap': css('combat.minimap'),
  'combat.zoom': css('combat.zoom'),
  'combat.joystick': css('combat.joystick'),
  'combat.dash': css('combat.dash'),
  'combat.powerHit': css('combat.powerHit'),
  'combat.skillSlot': css('combat.skillSlot'),
  'combat.skillLocked': css('combat.skillLocked'),
  'combat.targetMarker': world('combat.targetMarker'),
  'combat.lootBeam': world('combat.lootBeam'),
  'combat.aoeWarning': world('combat.aoeWarning'),
  'combat.telegraph': world('combat.telegraph'),
});

function panel(id: HarvestUIAssetId, file: string, [top, right, bottom, left]: readonly number[]): HarvestUIAssetDefinition {
  return { id, runtimePath: `${UI_ROOT}/${file}`, sourceSheet: file.startsWith('panel') ? 'harvest-panels-crystal-master.png' : 'harvest-buttons-tabs-c.png', render: 'nine-slice', slice: { top, right, bottom, left } };
}

function image(id: HarvestUIAssetId, file: string): HarvestUIAssetDefinition {
  return { id, runtimePath: `${UI_ROOT}/${file}`, sourceSheet: 'harvest-buttons-tabs-c.png', render: 'image' };
}

function css(id: HarvestUIAssetId): HarvestUIAssetDefinition {
  return { id, sourceSheet: 'harvest-combat-hud-master.png', render: 'css-component' };
}

function reference(id: HarvestUIAssetId, sourceSheet: string): HarvestUIAssetDefinition {
  return { id, sourceSheet, render: 'css-component' };
}

function world(id: HarvestUIAssetId): HarvestUIAssetDefinition {
  return { id, sourceSheet: 'harvest-combat-hud-master.png', render: 'world-space' };
}

export function missingHarvestUIAssets(available: (path: string) => boolean): HarvestUIAssetId[] {
  return Object.values(HARVEST_UI_ASSETS).filter((asset) => asset.runtimePath && !available(asset.runtimePath)).map((asset) => asset.id);
}
