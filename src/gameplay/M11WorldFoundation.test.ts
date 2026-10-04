import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HARVEST_HAVEN_MAP } from './HarvestHavenMap';
import { validateWorldMap } from './WorldMapDefinition';
import { FieldMonsterSystem } from './FieldMonsterSystem';
import { WorldPortalSystem } from './WorldPortalSystem';
import { WorldQuestSystem } from './WorldQuestSystem';
import { CLASS_HERO_LEVEL_REQUIREMENT, CLASS_JOB_LEVEL_REQUIREMENT, WorldProgression } from './WorldProgression';
import { GamePersistence, SAVE_KEY, type StoragePort } from '../progress/GamePersistence';

const root = fileURLToPath(new URL('../../', import.meta.url));

describe('M11 Harvest Haven world foundation', () => {
  it('keeps the authored town, farm actors and raid gate inside the map', () => {
    expect(validateWorldMap(HARVEST_HAVEN_MAP)).toEqual([]);
    expect(HARVEST_HAVEN_MAP.scene.sceneKind).toBe('haven');
    expect(HARVEST_HAVEN_MAP.scene.props.filter((prop) => ['house', 'inn', 'forge', 'guild-hall'].includes(prop.kind)).length).toBeGreaterThanOrEqual(5);
    expect(HARVEST_HAVEN_MAP.monsters.length).toBeGreaterThanOrEqual(6);
    expect(HARVEST_HAVEN_MAP.portals.some((portal) => portal.targetMapId === 'harvest-basin-raid')).toBe(true);
  });

  it('uses separate Hero and Job XP and unlocks a class only at Hero 15 and Job 20', () => {
    const progression = new WorldProgression({ heroLevel: 14, heroXp: 0, jobLevel: 19, jobXp: 0 });
    expect(progression.classSelectionEligible).toBe(false);
    progression.grant(10000, 10000);
    expect(progression.heroLevel).toBeGreaterThanOrEqual(CLASS_HERO_LEVEL_REQUIREMENT);
    expect(progression.jobLevel).toBeGreaterThanOrEqual(CLASS_JOB_LEVEL_REQUIREMENT);
    expect(progression.classSelectionEligible).toBe(true);
    expect(progression.chooseClass('ranger')).toBe(true);
    expect(progression.chooseClass('vanguard')).toBe(false);
  });

  it('supports repeatable farm combat, respawn and quest progress', () => {
    const definition = HARVEST_HAVEN_MAP.monsters[0];
    const monsters = new FieldMonsterSystem([definition]);
    const quests = new WorldQuestSystem(HARVEST_HAVEN_MAP.quests);
    const defeat = monsters.damage(definition.id, definition.maxHp);
    expect(defeat?.species).toBe('mossling');
    expect(monsters.monsters[0].alive).toBe(false);
    expect(monsters.monsters[0].defeatVisualMs).toBeGreaterThan(0);
    expect(quests.onMonsterDefeated(defeat!).length).toBe(0);
    expect(quests.state('quest-first-harvest')?.progress).toBe(1);
    monsters.update(definition.respawnMs);
    expect(monsters.monsters[0].alive).toBe(true);
    expect(monsters.monsters[0].hp).toBe(definition.maxHp);
    expect(monsters.monsters[0].defeatVisualMs).toBe(0);
  });

  it('mounts field and raid overlays inside the fullscreen game shell', () => {
    const fieldHud = readFileSync(`${root}src/ui/HarvestWorldHUD.ts`, 'utf8');
    const raid = readFileSync(`${root}src/world3d/Hybrid3DVerticalSlice.ts`, 'utf8');
    const css = readFileSync(`${root}src/styles.css`, 'utf8');
    expect(fieldHud).toContain('fullscreenHost.appendChild(this.root)');
    expect(fieldHud).not.toContain('document.body.appendChild(this.root)');
    expect(raid).toContain('createReturnPortalElement(fullscreenHost)');
    expect(css).toMatch(/#world-hud \{ position: absolute;/);
  });

  it('only offers physical portals inside their world radius', () => {
    const system = new WorldPortalSystem(HARVEST_HAVEN_MAP.portals);
    const portal = HARVEST_HAVEN_MAP.portals[0];
    expect(system.nearby(portal.position)?.id).toBe(portal.id);
    expect(system.nearby({ x: portal.position.x + portal.radius + 1, y: portal.position.y })).toBeUndefined();
  });

  it('migrates v1 persistent progress without losing the guest or Hero level', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, guestId: 'guest-old', playerLevel: 12, playerXp: 44 }));
    const progress = new GamePersistence(storage).loadProgress();
    expect(progress.guestId).toBe('guest-old');
    expect(progress.playerLevel).toBe(12);
    expect(progress.jobLevel).toBe(1);
    expect(progress.jobXp).toBe(0);
  });
});

class MemoryStorage implements StoragePort {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}
