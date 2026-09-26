import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG, type QualityName } from '../config';
import { ArenaCamera } from '../gameplay/ArenaCamera';
import { ARENA_REGIONS, BOSS_WORLD_ANCHOR, BOSS_ZONE_RADIUS } from '../gameplay/ArenaRegions';
import type { ArenaRunModel } from '../gameplay/ArenaRunModel';
import { BOSS_ATTACKS, type BossTelegraph } from '../gameplay/BossAttackSystem';
import type { LootDrop, LootKind } from '../gameplay/LootSystem';
import type { Vec2 } from '../gameplay/ArenaTypes';

const LOOT_COLORS: Record<LootKind, number> = {
  'run-xp': 0x75eaff, 'crystal-essence': 0x67e7ff, 'void-essence': 0xc667ff,
  'wing-essence': 0xffdf78, 'pumpkin-essence': 0xff792f, 'combat-orb': 0x6dff91,
  relic: 0xffc850, 'harvest-energy': 0xff8a38,
};

interface Landmark { x: number; y: number; type: 'crystal' | 'pillar' | 'root' | 'statue' | 'fissure'; scale: number }
const LANDMARKS: readonly Landmark[] = [
  { x: 360, y: 610, type: 'crystal', scale: 1.45 }, { x: 690, y: 1240, type: 'crystal', scale: 1.05 },
  { x: 2580, y: 650, type: 'pillar', scale: 1.65 }, { x: 2890, y: 1180, type: 'pillar', scale: 1.15 },
  { x: 610, y: 1570, type: 'root', scale: 1.45 }, { x: 1150, y: 1510, type: 'root', scale: 0.95 },
  { x: 2110, y: 1430, type: 'fissure', scale: 1.4 }, { x: 2730, y: 1530, type: 'fissure', scale: 1.15 },
  { x: 1440, y: 890, type: 'statue', scale: 1.35 }, { x: 1840, y: 680, type: 'statue', scale: 0.9 },
] as const;

interface AftermathDecal { position: Vec2; kind: string; ageMs: number; durationMs: number; radius: number }

/** Camera-transformed world presentation; static geometry is cached and never rebuilt per frame. */
export class ArenaLayer extends Container {
  readonly camera = new ArenaCamera(GAME_CONFIG.arena.width, GAME_CONFIG.arena.height, GAME_CONFIG.arena.cameraMinZoom, GAME_CONFIG.arena.cameraMaxZoom);
  private readonly viewportMask = new Graphics();
  private readonly worldRoot = new Container();
  private readonly floor = new Graphics();
  private readonly bossPresence = new Graphics();
  private readonly staticProps = new Graphics();
  private readonly aftermath = new Graphics();
  private readonly telegraphs = new Graphics();
  private readonly guides = new Graphics();
  private readonly atmosphere = new Graphics();
  private readonly lootViews: Graphics[] = [];
  private readonly dummyViews: Graphics[] = [];
  private readonly petView = new Graphics();
  private readonly brokenLandmarks = new Set<number>();
  private readonly decals: AftermathDecal[] = [];
  private quality: QualityName = 'medium';
  private reducedEffects = false;
  private eventTheme = true;
  private cycle = 1;

  constructor() {
    super();
    this.addChild(this.worldRoot, this.viewportMask);
    this.worldRoot.mask = this.viewportMask;
    this.worldRoot.addChild(this.floor, this.bossPresence, this.staticProps, this.aftermath, this.telegraphs, this.guides);
    this.drawStaticWorld();
    for (let index = 0; index < GAME_CONFIG.arena.maxLoot; index += 1) {
      const view = new Graphics(); view.visible = false; this.lootViews.push(view); this.worldRoot.addChild(view);
    }
    for (let index = 0; index < 7; index += 1) {
      const view = new Graphics(); this.drawDummy(view, index); view.visible = false; this.dummyViews.push(view); this.worldRoot.addChild(view);
    }
    this.drawPet(); this.petView.visible = false; this.worldRoot.addChild(this.petView);
    this.addChild(this.atmosphere);
  }

  resize(width: number, height: number): void {
    this.camera.resize(width, height);
    const viewport = this.camera.viewport;
    this.viewportMask.clear().rect(viewport.x, viewport.y, viewport.width, viewport.height).fill(0xffffff);
    this.drawAtmosphere();
    this.applyCameraTransform();
  }

  setQuality(name: QualityName, reduced: boolean): void { this.quality = name; this.reducedEffects = reduced; this.drawAtmosphere(); }
  setTheme(eventTheme: boolean): void { if (eventTheme === this.eventTheme) return; this.eventTheme = eventTheme; this.drawStaticWorld(); }
  setCycle(cycle: number): void { if (cycle === this.cycle) return; this.cycle = cycle; this.drawStaticWorld(); }
  toScreen(position: Vec2): Vec2 { return this.camera.worldToScreen(position); }
  updateCamera(deltaMs: number, arena: ArenaRunModel): void { this.camera.update(deltaMs, arena.player.position, arena.player.velocity); this.applyCameraTransform(); }
  setZoom(value: number): number { return this.camera.setZoom(value); }

  reactToImpact(position: Vec2, radius: number, kind = 'slam'): boolean {
    let changed = false;
    LANDMARKS.forEach((landmark, index) => {
      if (!this.brokenLandmarks.has(index) && Math.hypot(position.x - landmark.x, position.y - landmark.y) <= radius + 120) {
        this.brokenLandmarks.add(index); changed = true;
      }
    });
    this.decals.push({ position: { ...position }, kind, ageMs: 0, durationMs: 10000, radius: Math.min(260, Math.max(90, radius)) });
    if (this.decals.length > 24) this.decals.splice(0, this.decals.length - 24);
    if (changed) this.drawStaticWorld();
    return changed;
  }

  sync(arena: ArenaRunModel, seconds: number, deltaMs = 16): void {
    this.setTheme(arena.combat.isEventRun); this.setCycle(arena.bossCycle);
    this.drawBossPresence(seconds, arena.combat.bossHp / arena.combat.maxHp);
    this.updateDecals(deltaMs);
    this.drawTelegraphs(arena.bossAttacks.active, arena.telegraphsVisible, seconds);
    this.drawGuides(arena);
    const drops = arena.loot.drops.filter((drop) => drop.phase !== 'collected');
    this.lootViews.forEach((view, index) => {
      const drop = drops[index]; view.visible = Boolean(drop); if (!drop) return;
      this.drawLoot(view, drop, seconds); view.position.set(drop.position.x, drop.position.y);
      view.visible = this.worldVisible(drop.position, 220);
    });
    this.dummyViews.forEach((view, index) => {
      const dummy = arena.dummyAllies[index]; view.visible = Boolean(dummy); if (!dummy) return;
      view.position.set(dummy.position.x, dummy.position.y); view.visible = this.worldVisible(dummy.position, 160);
    });
    this.petView.visible = Boolean(arena.inventory.petId) && this.worldVisible(arena.petPosition, 120);
    if (this.petView.visible) {
      this.petView.position.set(arena.petPosition.x, arena.petPosition.y + Math.sin(seconds * 4) * 12);
      this.petView.rotation = Math.sin(seconds * 2.3) * 0.08;
    }
    this.atmosphere.alpha = this.reducedEffects ? 0.35 : this.quality === 'low' ? 0.5 : 1;
  }

  clearTransient(): void {
    this.telegraphs.clear(); this.guides.clear(); this.aftermath.clear(); this.decals.length = 0; this.brokenLandmarks.clear();
    this.lootViews.forEach((view) => { view.visible = false; }); this.dummyViews.forEach((view) => { view.visible = false; }); this.petView.visible = false;
    this.drawStaticWorld();
  }

  private applyCameraTransform(): void {
    const viewport = this.camera.viewport, scale = this.camera.scale;
    this.worldRoot.scale.set(scale);
    this.worldRoot.position.set(viewport.x + viewport.width / 2 - this.camera.position.x * scale, viewport.y + viewport.height / 2 - this.camera.position.y * scale);
  }

  private drawStaticWorld(): void {
    this.floor.clear(); this.staticProps.clear();
    this.floor.rect(0, 0, GAME_CONFIG.arena.width, GAME_CONFIG.arena.height).fill(this.eventTheme ? 0x100c16 : 0x0d1220);
    for (const region of ARENA_REGIONS) {
      const cycleTint = this.cycle >= 3 ? 0x391925 : this.cycle === 2 ? 0x271521 : region.ground;
      this.floor.ellipse(region.center.x, region.center.y, region.radius.x, region.radius.y).fill({ color: cycleTint, alpha: 0.84 });
      this.floor.ellipse(region.center.x, region.center.y, region.radius.x * 0.78, region.radius.y * 0.76).stroke({ color: region.accent, width: 12, alpha: 0.045 + this.cycle * 0.015 });
    }
    this.drawStoneFloor();
    LANDMARKS.forEach((landmark, index) => this.drawLandmark(landmark, index));
  }

  private drawStoneFloor(): void {
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 14; column += 1) {
        const x = 120 + column * 230 + (row % 2) * 95;
        const y = 110 + row * 205;
        const variation = (row * 17 + column * 31) % 5;
        const points = [x - 98, y - 70, x + 78 + variation * 5, y - 78, x + 108, y + 48, x + 34, y + 82, x - 90, y + 65];
        this.floor.poly(points).fill({ color: variation % 2 ? 0x20202c : 0x1b1c28, alpha: 0.44 }).stroke({ color: 0x6e6372, width: 4, alpha: 0.09 });
      }
    }
    const cracks = [[270,420,590,690],[980,330,1250,580],[1980,980,2270,1270],[2380,1370,2860,1480],[610,1390,1040,1540]];
    for (const [x1,y1,x2,y2] of cracks) this.floor.moveTo(x1,y1).lineTo((x1+x2)/2+40,(y1+y2)/2-35).lineTo(x2,y2).stroke({ color: this.eventTheme ? 0xb5482c : 0x485a85, width: 13, alpha: 0.18 + this.cycle * 0.04 });
  }

  private drawLandmark(landmark: Landmark, index: number): void {
    const { x, y, scale } = landmark;
    if (this.brokenLandmarks.has(index)) {
      this.staticProps.ellipse(x, y + 15, 95 * scale, 28 * scale).fill({ color: 0x080910, alpha: 0.62 });
      this.staticProps.poly([x-82*scale,y,x-42*scale,y-54*scale,x+2*scale,y+5*scale]).fill(0x343342)
        .poly([x+8*scale,y+4*scale,x+48*scale,y-38*scale,x+88*scale,y+8*scale]).fill(0x282835); return;
    }
    this.staticProps.ellipse(x, y + 28 * scale, 100 * scale, 31 * scale).fill({ color: 0x04050a, alpha: 0.58 });
    if (landmark.type === 'crystal') {
      this.staticProps.poly([x,y-175*scale,x+68*scale,y-30*scale,x+22*scale,y+18*scale,x-58*scale,y-18*scale]).fill(0x24567a)
        .poly([x,y-168*scale,x+23*scale,y-36*scale,x-26*scale,y-22*scale]).fill({color:0x73e8ff,alpha:0.78})
        .poly([x-55*scale,y-70*scale,x-98*scale,y-5*scale,x-28*scale,y+10*scale]).fill(0x533a7d);
    } else if (landmark.type === 'pillar') {
      this.staticProps.poly([x-54*scale,y-205*scale,x+34*scale,y-222*scale,x+52*scale,y+7*scale,x-58*scale,y+14*scale]).fill(0x343441)
        .poly([x-58*scale,y-207*scale,x+52*scale,y-226*scale,x+67*scale,y-185*scale,x-50*scale,y-172*scale]).fill(0x55515b)
        .moveTo(x-28*scale,y-160*scale).lineTo(x+19*scale,y-86*scale).lineTo(x-17*scale,y-22*scale).stroke({color:0xc17b58,width:9*scale,alpha:0.35});
    } else if (landmark.type === 'root') {
      this.staticProps.moveTo(x,y).bezierCurveTo(x-155*scale,y-68*scale,x-92*scale,y-174*scale,x-188*scale,y-220*scale).stroke({color:0x241526,width:46*scale})
        .moveTo(x,y).bezierCurveTo(x+126*scale,y-80*scale,x+65*scale,y-178*scale,x+176*scale,y-231*scale).stroke({color:0x2a1727,width:38*scale})
        .moveTo(x,y-20*scale).bezierCurveTo(x-70*scale,y-90*scale,x+50*scale,y-150*scale,x,y-250*scale).stroke({color:0x6e2d67,width:9*scale,alpha:0.55});
    } else if (landmark.type === 'statue') {
      this.staticProps.poly([x-90*scale,y,x-58*scale,y-124*scale,x,y-176*scale,x+74*scale,y-105*scale,x+95*scale,y]).fill(0x292b37)
        .poly([x-24*scale,y-174*scale,x+7*scale,y-246*scale,x+39*scale,y-169*scale]).fill(0x454552)
        .circle(x-18*scale,y-146*scale,8*scale).fill({color:0xff7138,alpha:0.72});
    } else {
      this.staticProps.moveTo(x-160*scale,y).lineTo(x-52*scale,y-44*scale).lineTo(x+22*scale,y-17*scale).lineTo(x+152*scale,y-72*scale).stroke({color:0xff6630,width:24*scale,alpha:0.2+this.cycle*.06})
        .moveTo(x-160*scale,y).lineTo(x-52*scale,y-44*scale).lineTo(x+22*scale,y-17*scale).lineTo(x+152*scale,y-72*scale).stroke({color:0xffaa58,width:6*scale,alpha:0.72});
    }
  }

  private drawBossPresence(seconds: number, hpRatio: number): void {
    this.bossPresence.clear(); const instability = 1 - hpRatio;
    this.bossPresence.ellipse(BOSS_WORLD_ANCHOR.x, BOSS_WORLD_ANCHOR.y + 220, 470, 180).fill({ color: 0x020208, alpha: 0.55 + instability * 0.15 });
    this.bossPresence.circle(BOSS_WORLD_ANCHOR.x, BOSS_WORLD_ANCHOR.y + 120, BOSS_ZONE_RADIUS).stroke({ color: this.eventTheme ? 0xff6d32 : 0x7d5fa7, width: 20, alpha: 0.07 + instability * 0.08 });
    const pulse = 25 + Math.sin(seconds * (2 + this.cycle)) * 8;
    this.bossPresence.circle(BOSS_WORLD_ANCHOR.x, BOSS_WORLD_ANCHOR.y + 130, 130 + pulse).fill({ color: this.eventTheme ? 0xff6b2d : 0x9258d1, alpha: 0.025 + instability * 0.035 });
  }

  private drawTelegraphs(attacks: readonly BossTelegraph[], visible: boolean, seconds: number): void {
    this.telegraphs.clear(); if (!visible) return;
    for (const attack of attacks) {
      const definition = BOSS_ATTACKS[attack.kind];
      const progress = attack.phase === 'telegraph' ? Math.min(1, attack.elapsedMs / definition.telegraphMs) : 1;
      const imminent = progress > 0.68, impact = attack.phase === 'impact';
      const color = attack.kind.includes('corruption') || attack.kind === 'moving-hazard' ? 0xa94dff : attack.kind === 'core-beam' ? 0xffa13f : 0xff4d35;
      const fillAlpha = impact ? 0.36 : 0.08 + progress * 0.13;
      if (definition.shape === 'circle') {
        this.telegraphs.circle(attack.position.x, attack.position.y, attack.radius).fill({ color, alpha: fillAlpha })
          .circle(attack.position.x, attack.position.y, attack.radius).stroke({ color: imminent ? 0xffd590 : color, width: 10 + progress * 7, alpha: 0.86 })
          .circle(attack.position.x, attack.position.y, attack.radius * (1 - progress * 0.88)).stroke({ color: 0xfff0c8, width: 7, alpha: 0.72 });
        for (let ray = 0; ray < 8; ray += 1) { const angle = ray / 8 * Math.PI * 2 + seconds; this.telegraphs.moveTo(attack.position.x + Math.cos(angle) * attack.radius * .25, attack.position.y + Math.sin(angle) * attack.radius * .25).lineTo(attack.position.x + Math.cos(angle) * attack.radius * .8, attack.position.y + Math.sin(angle) * attack.radius * .8).stroke({ color, width: 5, alpha: .16 + progress * .16 }); }
      } else if (definition.shape === 'ring') {
        this.telegraphs.circle(attack.position.x, attack.position.y, attack.radius).stroke({ color, width: Math.max(30, attack.radius - attack.innerRadius), alpha: 0.09 + progress * 0.12 })
          .circle(attack.position.x, attack.position.y, attack.radius).stroke({ color: imminent ? 0xffd6a0 : color, width: 12, alpha: 0.9 })
          .circle(attack.position.x, attack.position.y, attack.innerRadius).stroke({ color, width: 8, alpha: 0.7 });
      } else {
        const length = definition.shape === 'line' ? 1900 : attack.radius;
        const end = { x: attack.origin.x + attack.direction.x * length, y: attack.origin.y + attack.direction.y * length };
        const width = definition.shape === 'line' ? attack.radius * 2 : length * 0.72;
        this.telegraphs.moveTo(attack.origin.x, attack.origin.y).lineTo(end.x, end.y).stroke({ color, width, alpha: fillAlpha })
          .moveTo(attack.origin.x, attack.origin.y).lineTo(end.x, end.y).stroke({ color: imminent ? 0xffedc2 : color, width: 10 + progress * 6, alpha: 0.88 });
      }
    }
  }

  private updateDecals(deltaMs: number): void {
    this.aftermath.clear();
    for (let index = this.decals.length - 1; index >= 0; index -= 1) {
      const decal = this.decals[index]; decal.ageMs += deltaMs;
      if (decal.ageMs >= decal.durationMs) { this.decals.splice(index, 1); continue; }
      const alpha = Math.min(0.34, (1 - decal.ageMs / decal.durationMs) * 0.34);
      const color = decal.kind.includes('corruption') || decal.kind === 'moving-hazard' ? 0x59276f : decal.kind === 'core-beam' ? 0x5a241b : 0x40343a;
      this.aftermath.ellipse(decal.position.x, decal.position.y, decal.radius, decal.radius * 0.45).fill({ color, alpha });
      if (decal.kind === 'ground-slam' || decal.kind === 'shockwave') for (let ray = 0; ray < 6; ray += 1) { const a = ray / 6 * Math.PI * 2; this.aftermath.moveTo(decal.position.x, decal.position.y).lineTo(decal.position.x + Math.cos(a) * decal.radius, decal.position.y + Math.sin(a) * decal.radius * .55).stroke({ color: 0x9b5b45, width: 8, alpha }); }
    }
  }

  private drawLoot(view: Graphics, drop: LootDrop, seconds: number): void {
    const color = LOOT_COLORS[drop.kind], rare = drop.rarity !== 'common', epic = drop.rarity === 'epic';
    view.clear().ellipse(0, 12, epic ? 32 : rare ? 25 : 17, epic ? 10 : 7).fill({ color: 0x02030a, alpha: 0.55 });
    if (rare) view.circle(0, -5, epic ? 32 : 24).fill({ color, alpha: epic ? 0.19 : 0.11 });
    if (drop.kind === 'relic') view.roundRect(-18, -22, 36, 31, 6).fill(0x5d321d).stroke({ color, width: epic ? 7 : 5 }).rect(-9, -30, 18, 10).fill(0x8c5e2e);
    else view.poly([0,-28,19,-8,12,20,-13,18,-21,-7]).fill(color).poly([-1,-21,9,-5,4,9,-7,7]).fill({ color: 0xffffff, alpha: .64 }).stroke({ color: epic ? 0xffffff : color, width: epic ? 4 : 2, alpha: .8 });
    if (rare && drop.phase !== 'airborne') {
      view.rect(epic ? -5 : -3, epic ? -220 : -150, epic ? 10 : 6, epic ? 188 : 124).fill({ color, alpha: epic ? .28 : .2 });
      view.circle(0, epic ? -218 : -148, epic ? 11 : 7).fill({ color: 0xffffff, alpha: .55 });
    }
    const pulse = 1 + Math.sin(seconds * (epic ? 6 : 4) + Number(drop.id.split('-')[1])) * (epic ? .09 : .045); view.scale.set(pulse);
  }

  private drawPet(): void {
    this.petView.clear().ellipse(0, 18, 28, 9).fill({ color: 0x03040a, alpha: .48 }).circle(0, 0, 24).fill({ color: 0xff7e2e, alpha: .15 })
      .poly([0,-25,18,-5,11,18,0,10,-12,19,-19,-5]).fill(0xff8938).circle(0,-4,8).fill(0xffefbd)
      .circle(-4,-6,2).fill(0x3a1830).circle(4,-6,2).fill(0x3a1830);
  }

  private drawDummy(view: Graphics, index: number): void {
    const colors = [0x6f8cff, 0xff706d, 0x63d9a0, 0xd27cff, 0xffc25c, 0x64d6ed, 0xb2e268]; const color = colors[index % colors.length];
    view.ellipse(0, 24, 37, 12).fill({ color: 0x02030a, alpha: .5 }).circle(0, 0, 29).fill(color).poly([-20,-13,0,-35,21,-12]).fill({color,alpha:.9}).circle(-9,-5,4).fill(0xffffff).circle(9,-5,4).fill(0xffffff);
  }

  private drawAtmosphere(): void {
    this.atmosphere.clear(); const viewport = this.camera.viewport; if (!viewport.width) return;
    const count = this.quality === 'low' ? 5 : this.quality === 'high' ? 14 : 9;
    for (let index = 0; index < count; index += 1) {
      const x = viewport.x + ((index * 137) % 97) / 97 * viewport.width;
      const y = viewport.y + ((index * 79) % 91) / 91 * viewport.height;
      this.atmosphere.circle(x, y, index % 3 === 0 ? 3 : 1.5).fill({ color: this.eventTheme ? 0xff8041 : 0x9ec7ff, alpha: 0.12 + (index % 4) * .025 });
    }
    this.atmosphere.rect(viewport.x, viewport.y, viewport.width, viewport.height * .23).fill({ color: this.eventTheme ? 0x6a3144 : 0x384c72, alpha: .07 + this.cycle * .015 });
  }

  private drawGuides(arena: ArenaRunModel): void {
    this.guides.clear();
    if (arena.collisionBoundsVisible) this.guides.rect(160, 180, 2880, 1440).stroke({ color: 0x62ffb5, width: 8, alpha: .7 });
    if (arena.pickupRadiusVisible) this.guides.circle(arena.player.position.x, arena.player.position.y, arena.player.stats.pickupRadius).stroke({ color: 0x75eaff, width: 7, alpha: .55 });
  }

  private worldVisible(position: Vec2, margin: number): boolean {
    const viewport = this.camera.viewport;
    const halfWidth = viewport.width / (2 * this.camera.scale) + margin, halfHeight = viewport.height / (2 * this.camera.scale) + margin;
    return Math.abs(position.x - this.camera.position.x) <= halfWidth && Math.abs(position.y - this.camera.position.y) <= halfHeight;
  }
}
