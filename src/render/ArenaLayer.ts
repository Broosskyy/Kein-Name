import { Container, Graphics, Sprite } from 'pixi.js';
import type { AssetKey, AssetRegistry } from '../assets';
import { GAME_CONFIG, type QualityName } from '../config';
import { ArenaCamera } from '../gameplay/ArenaCamera';
import { ARENA_REGIONS, BOSS_WORLD_ANCHOR } from '../gameplay/ArenaRegions';
import type { ArenaRunModel } from '../gameplay/ArenaRunModel';
import type { LootDrop, LootKind } from '../gameplay/LootSystem';
import type { Vec2 } from '../gameplay/ArenaTypes';
import { GroundDecalSystem } from './GroundDecalSystem';
import { TelegraphRenderer } from './TelegraphRenderer';
import { PRODUCTION_GROUND_DETAILS, PRODUCTION_PROPS, type ProductionProp } from './ArenaProductionArt';

const LOOT_COLORS: Record<LootKind, number> = {
  'run-xp': 0x75eaff, 'crystal-essence': 0x67e7ff, 'void-essence': 0xc667ff,
  'wing-essence': 0xffdf78, 'pumpkin-essence': 0xff792f, 'combat-orb': 0x6dff91,
  relic: 0xffc850, 'harvest-energy': 0xff8a38,
};

interface Landmark { x: number; y: number; type: 'crystal' | 'pillar' | 'root' | 'statue' | 'fissure' | 'arch' | 'rock'; scale: number }

interface LootView { root: Container; fallback: Graphics; sprite: Sprite; key?: AssetKey }
interface ProductionPropView { root: Container; definition: ProductionProp }

/** Camera-transformed world presentation; static geometry is cached and never rebuilt per frame. */
export class ArenaLayer extends Container {
  /** Added to GameScene as a separate depth plane so tall authored props can
   * occlude the player only when their footpoint is in front of it. */
  readonly foregroundWorld = new Container();
  readonly camera = new ArenaCamera(GAME_CONFIG.arena.width, GAME_CONFIG.arena.height, GAME_CONFIG.arena.cameraMinZoom, GAME_CONFIG.arena.cameraMaxZoom);
  private readonly viewportMask = new Graphics();
  private readonly worldRoot = new Container();
  private readonly floor = new Graphics();
  private readonly productionGroundDetails = new Container();
  private readonly bossPresence = new Graphics();
  private readonly staticProps = new Graphics();
  private readonly productionLandmarks = new Container();
  private readonly floorDetail?: Sprite;
  private readonly aftermath = new Graphics();
  private readonly telegraphs = new Graphics();
  private readonly guides = new Graphics();
  private readonly atmosphere = new Graphics();
  private readonly bossIndicator = new Graphics();
  private readonly lootViews: LootView[] = [];
  private readonly dummyViews: Graphics[] = [];
  private readonly petView = new Container();
  private readonly petFallback = new Graphics();
  private petSprite?: Sprite;
  private readonly productionPropViews: ProductionPropView[] = [];
  private readonly brokenLandmarks = new Set<number>();
  private readonly decals = new GroundDecalSystem(24);
  private readonly telegraphRenderer = new TelegraphRenderer();
  private quality: QualityName = 'medium';
  private reducedEffects = false;
  private eventTheme = true;
  private cycle = 1;

  constructor(private readonly assets?: AssetRegistry) {
    super();
    this.worldRoot.sortableChildren = true;
    this.foregroundWorld.sortableChildren = true;
    this.addChild(this.worldRoot, this.viewportMask);
    this.worldRoot.mask = this.viewportMask;
    this.worldRoot.addChild(this.floor);
    const floorTexture=this.assets?.texture('arena.floor.detail');
    if(floorTexture){this.floorDetail=new Sprite(floorTexture);this.floorDetail.width=GAME_CONFIG.arena.width;this.floorDetail.height=GAME_CONFIG.arena.height;this.floorDetail.alpha=.3;this.worldRoot.addChild(this.floorDetail)}
    this.worldRoot.addChild(this.productionGroundDetails, this.bossPresence, this.staticProps, this.productionLandmarks, this.aftermath, this.telegraphs, this.guides);
    this.drawStaticWorld();
    for (let index = 0; index < GAME_CONFIG.arena.maxLoot; index += 1) {
      const root = new Container(); const fallback = new Graphics(); const sprite = new Sprite(); sprite.anchor.set(.5);
      root.addChild(fallback, sprite); root.visible = false; this.lootViews.push({ root, fallback, sprite }); this.worldRoot.addChild(root);
    }
    for (let index = 0; index < 7; index += 1) {
      const view = new Graphics(); this.drawDummy(view, index); view.visible = false; this.dummyViews.push(view); this.worldRoot.addChild(view);
    }
    this.drawPet(); this.petView.visible = false; this.worldRoot.addChild(this.petView);
    this.addChild(this.atmosphere, this.bossIndicator);
  }

  resize(width: number, height: number): void {
    this.camera.resize(width, height);
    const viewport = this.camera.viewport;
    this.viewportMask.clear().rect(viewport.x, viewport.y, viewport.width, viewport.height).fill(0xffffff);
    this.drawAtmosphere();
    this.applyCameraTransform();
  }

  setQuality(name: QualityName, reduced: boolean): void {
    this.quality = name; this.reducedEffects = reduced;
    this.productionGroundDetails.alpha = reduced ? .62 : name === 'low' ? .74 : name === 'high' ? 1 : .9;
    this.drawAtmosphere();
  }
  setTheme(eventTheme: boolean): void { if (eventTheme === this.eventTheme) return; this.eventTheme = eventTheme; this.drawStaticWorld(); }
  setCycle(cycle: number): void { if (cycle === this.cycle) return; this.cycle = cycle; this.drawStaticWorld(); }
  toScreen(position: Vec2): Vec2 { return this.camera.worldToScreen(position); }
  updateCamera(deltaMs: number, arena: ArenaRunModel): void { this.camera.update(deltaMs, arena.player.position, arena.player.velocity); this.applyCameraTransform(); }
  setZoom(value: number): number { return this.camera.setZoom(value); }
  panCamera(dx:number,dy:number):void{this.camera.panByScreen(dx,dy);this.applyCameraTransform()}
  resetCamera():void{this.camera.resetFollow()}

  reactToImpact(position: Vec2, radius: number, kind = 'slam'): boolean {
    let changed = false;
    PRODUCTION_PROPS.forEach((landmark, index) => {
      if (!this.brokenLandmarks.has(index) && Math.hypot(position.x - landmark.x, position.y - landmark.y) <= radius + 120) {
        this.brokenLandmarks.add(index); changed = true;
      }
    });
    this.decals.add(position, radius, kind);
    if (changed) this.drawStaticWorld();
    return changed;
  }

  sync(arena: ArenaRunModel, seconds: number, deltaMs = 16): void {
    this.setTheme(arena.combat.isEventRun); this.setCycle(arena.bossCycle);
    this.drawBossPresence(seconds, arena.combat.bossHp / arena.combat.maxHp);
    this.updateDecals(deltaMs);
    this.telegraphRenderer.draw(this.telegraphs, arena.bossAttacks.active, arena.telegraphsVisible, seconds);
    this.drawBossIndicator(arena.bossWorld.position);
    this.drawGuides(arena);
    const drops = arena.loot.drops.filter((drop) => drop.phase !== 'collected');
    this.lootViews.forEach((view, index) => {
      const drop = drops[index]; view.root.visible = Boolean(drop); if (!drop) return;
      this.drawLoot(view, drop, seconds); view.root.position.set(drop.position.x, drop.position.y);
      view.root.visible = this.worldVisible(drop.position, 220);
    });
    this.dummyViews.forEach((view, index) => {
      const dummy = arena.dummyAllies[index]; view.visible = Boolean(dummy); if (!dummy) return;
      view.position.set(dummy.position.x, dummy.position.y); view.visible = this.worldVisible(dummy.position, 160);
    });
    this.petView.visible = Boolean(arena.inventory.petId) && this.worldVisible(arena.petPosition, 120);
    if (this.petView.visible) {
      this.petView.position.set(arena.petPosition.x, arena.petPosition.y + Math.sin(seconds * 4) * 12);
      this.petView.rotation = Math.sin(seconds * 2.3) * 0.08;
      this.petView.scale.set(2.05+Math.sin(seconds*4)*.05);
    }
    this.updatePropDepth(arena.player.position.y);
    this.atmosphere.alpha = this.reducedEffects ? 0.35 : this.quality === 'low' ? 0.5 : 1;
  }

  clearTransient(): void {
    this.telegraphs.clear(); this.guides.clear(); this.aftermath.clear(); this.bossIndicator.clear(); this.decals.clear(); this.brokenLandmarks.clear();
    this.lootViews.forEach((view) => { view.root.visible = false; }); this.dummyViews.forEach((view) => { view.visible = false; }); this.petView.visible = false;
    this.drawStaticWorld();
  }

  private applyCameraTransform(): void {
    const viewport = this.camera.viewport, scale = this.camera.scale;
    this.worldRoot.scale.set(scale);
    this.worldRoot.position.set(viewport.x + viewport.width / 2 - this.camera.position.x * scale, viewport.y + viewport.height / 2 - this.camera.position.y * scale);
    this.foregroundWorld.scale.set(scale);
    this.foregroundWorld.position.copyFrom(this.worldRoot.position);
  }

  private drawStaticWorld(): void {
    this.floor.clear(); this.staticProps.clear(); this.productionGroundDetails.removeChildren().forEach((child) => child.destroy());
    for(const child of this.productionLandmarks.removeChildren())child.destroy();
    for(const child of this.foregroundWorld.removeChildren())child.destroy();
    this.productionPropViews.length = 0;
    this.floor.rect(0, 0, GAME_CONFIG.arena.width, GAME_CONFIG.arena.height).fill(this.eventTheme ? 0x100c16 : 0x0d1220);
    for (const region of ARENA_REGIONS) {
      const cycleTint = this.cycle >= 3 ? 0x391925 : this.cycle === 2 ? 0x271521 : region.ground;
      this.floor.ellipse(region.center.x, region.center.y, region.radius.x, region.radius.y).fill({ color: cycleTint, alpha: 0.84 });
      this.floor.ellipse(region.center.x, region.center.y, region.radius.x * 0.78, region.radius.y * 0.76).stroke({ color: region.accent, width: 12, alpha: 0.045 + this.cycle * 0.015 });
    }
    this.drawStoneFloor();
    this.drawProductionGroundDetails();
    PRODUCTION_PROPS.forEach((prop, index) => { if (!this.drawProductionProp(prop, index)) this.drawLandmark(this.fallbackLandmark(prop), index); });
  }

  private drawProductionGroundDetails(): void {
    if (!this.assets) return;
    for (const detail of PRODUCTION_GROUND_DETAILS) {
      const texture = this.assets.texture(detail.key); if (!texture) continue;
      const sprite = new Sprite(texture); sprite.anchor.set(.5); sprite.position.set(detail.x, detail.y);
      sprite.rotation = detail.rotation; sprite.alpha = detail.alpha;
      sprite.scale.set(detail.width / Math.max(1, texture.width));
      this.productionGroundDetails.addChild(sprite);
    }
  }

  private drawProductionProp(prop: ProductionProp, index: number): boolean {
    if (this.brokenLandmarks.has(index) || !this.assets) return false;
    const texture = this.assets.texture(prop.key); if (!texture) return false;
    const root = new Container(); root.position.set(prop.x, prop.y);
    const shadow = new Graphics().ellipse(0, 10, prop.height * .29, prop.height * .075).fill({ color:0x020309, alpha:.48 });
    const sprite = new Sprite(texture); sprite.anchor.set(.5, 1); sprite.scale.set(prop.height / Math.max(1, texture.height));
    if (prop.mirror) sprite.scale.x *= -1;
    root.addChild(shadow, sprite); root.zIndex = Math.round(prop.y);
    this.productionLandmarks.addChild(root); this.productionPropViews.push({ root, definition:prop }); return true;
  }

  private fallbackLandmark(prop: ProductionProp): Landmark {
    const key = prop.key;
    const type: Landmark['type'] = key.includes('crystal') ? 'crystal' : key.includes('root') ? 'root' : key.includes('arch') ? 'arch' : key.includes('pillar') || key.includes('altar') ? 'pillar' : 'rock';
    return { x:prop.x, y:prop.y, type, scale:Math.max(.7, prop.height / 420) };
  }

  private updatePropDepth(playerY: number): void {
    for (const item of this.productionPropViews) {
      item.root.visible = this.worldVisible({ x:item.definition.x, y:item.definition.y }, item.definition.height * .65);
      const shouldOcclude = Boolean(item.definition.occludes) && item.definition.y > playerY + 70;
      const target = shouldOcclude ? this.foregroundWorld : this.productionLandmarks;
      if (item.root.parent !== target) target.addChild(item.root);
    }
  }

  private drawStoneFloor(): void {
    // Irregular large plates avoid the obvious debug-grid cadence of M09.
    for (let index = 0; index < 176; index += 1) {
      const x = 90 + hash(index, 11) * (GAME_CONFIG.arena.width - 180);
      const y = 90 + hash(index, 29) * (GAME_CONFIG.arena.height - 180);
      const width = 115 + hash(index, 43) * 250;
      const height = 75 + hash(index, 67) * 170;
      const rotation = hash(index, 83) * Math.PI * 2;
      const points: number[] = [];
      const sides = 5 + index % 3;
      for (let side = 0; side < sides; side += 1) {
        const angle = rotation + side / sides * Math.PI * 2;
        const wobble = .72 + hash(index * 7 + side, 101) * .32;
        points.push(x + Math.cos(angle) * width * wobble, y + Math.sin(angle) * height * wobble);
      }
      const tone = index % 4 === 0 ? 0x282734 : index % 3 === 0 ? 0x20212d : 0x1a1b26;
      this.floor.poly(points).fill({ color: tone, alpha: .27 + hash(index, 109) * .18 })
        .stroke({ color: 0x777180, width: 3 + hash(index, 127) * 3, alpha: .035 + hash(index, 131) * .045 });
    }
    for (let patch = 0; patch < 46; patch += 1) {
      const x = hash(patch, 151) * GAME_CONFIG.arena.width;
      const y = hash(patch, 163) * GAME_CONFIG.arena.height;
      const size = 28 + hash(patch, 173) * 62;
      this.floor.ellipse(x, y, size * 1.8, size * .48).fill({ color: patch % 5 === 0 ? 0x4d2631 : 0x070911, alpha: .08 + hash(patch, 181) * .12 });
    }
    const cracks = [[270,420,790,790],[1280,530,1750,980],[2480,1080,2870,1570],[3380,1370,4260,1680],[610,2790,1440,3340],[3820,2780,5020,3300],[2050,3500,3040,3700]];
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
    } else if (landmark.type === 'arch') {
      this.staticProps.poly([x-150*scale,y,x-124*scale,y-248*scale,x-70*scale,y-282*scale,x-34*scale,y-38*scale]).fill(0x252631)
        .poly([x+34*scale,y-38*scale,x+73*scale,y-282*scale,x+128*scale,y-244*scale,x+151*scale,y]).fill(0x20212b)
        .poly([x-126*scale,y-246*scale,x-70*scale,y-282*scale,x+73*scale,y-282*scale,x+128*scale,y-244*scale,x+94*scale,y-204*scale,x-91*scale,y-204*scale]).fill(0x393946)
        .moveTo(x-98*scale,y-194*scale).lineTo(x-28*scale,y-232*scale).lineTo(x+42*scale,y-208*scale).stroke({color:0xff7740,width:7*scale,alpha:.24});
    } else if (landmark.type === 'rock') {
      this.staticProps.poly([x-144*scale,y,x-108*scale,y-103*scale,x-28*scale,y-156*scale,x+83*scale,y-127*scale,x+142*scale,y-34*scale,x+102*scale,y+8*scale]).fill(0x282936)
        .poly([x-108*scale,y-103*scale,x-28*scale,y-156*scale,x-9*scale,y-44*scale,x-95*scale,y-18*scale]).fill(0x41414e)
        .poly([x-9*scale,y-44*scale,x-28*scale,y-156*scale,x+83*scale,y-127*scale,x+53*scale,y-39*scale]).fill(0x343541);
    } else {
      this.staticProps.moveTo(x-160*scale,y).lineTo(x-52*scale,y-44*scale).lineTo(x+22*scale,y-17*scale).lineTo(x+152*scale,y-72*scale).stroke({color:0xff6630,width:24*scale,alpha:0.2+this.cycle*.06})
        .moveTo(x-160*scale,y).lineTo(x-52*scale,y-44*scale).lineTo(x+22*scale,y-17*scale).lineTo(x+152*scale,y-72*scale).stroke({color:0xffaa58,width:6*scale,alpha:0.72});
    }
  }

  private drawBossPresence(seconds: number, hpRatio: number): void {
    this.bossPresence.clear(); const instability = 1 - hpRatio;
    this.bossPresence.ellipse(BOSS_WORLD_ANCHOR.x, BOSS_WORLD_ANCHOR.y + 180, 675, 260).fill({ color: 0x010107, alpha: 0.45 + instability * 0.13 });
    this.bossPresence.ellipse(BOSS_WORLD_ANCHOR.x, BOSS_WORLD_ANCHOR.y + 145, 515, 185).fill({ color: 0x05040a, alpha: 0.62 + instability * 0.1 });
    this.bossPresence.ellipse(BOSS_WORLD_ANCHOR.x, BOSS_WORLD_ANCHOR.y, 520, 360).stroke({ color: this.eventTheme ? 0xff6d32 : 0x7d5fa7, width: 11, alpha: 0.035 + instability * 0.07 });
    for(let rock=0;rock<12;rock+=1){const angle=rock/12*Math.PI*2+.18;const radius=410+(rock%3)*52;const x=BOSS_WORLD_ANCHOR.x+Math.cos(angle)*radius,y=BOSS_WORLD_ANCHOR.y+Math.sin(angle)*radius*.56;const size=16+(rock%4)*7;this.bossPresence.poly([x-size,y,x-5,y-size*.7,x+size,y-2,x+4,y+size*.55]).fill({color:0x292834,alpha:.62})}
    const pulse = 25 + Math.sin(seconds * (2 + this.cycle)) * 8;
    this.bossPresence.circle(BOSS_WORLD_ANCHOR.x, BOSS_WORLD_ANCHOR.y + 130, 130 + pulse).fill({ color: this.eventTheme ? 0xff6b2d : 0x9258d1, alpha: 0.025 + instability * 0.035 });
  }

  private updateDecals(deltaMs: number): void {
    this.decals.update(deltaMs);
    this.aftermath.clear();
    for (const decal of this.decals.items) {
      const alpha = Math.min(0.34, (1 - decal.ageMs / decal.durationMs) * 0.34);
      const color = decal.kind.includes('corruption') || decal.kind === 'moving-hazard' ? 0x59276f : decal.kind === 'core-beam' ? 0x5a241b : 0x40343a;
      this.aftermath.ellipse(decal.position.x, decal.position.y, decal.radius, decal.radius * 0.42).fill({ color, alpha: alpha * .42 });
      for (let ray = 0; ray < 5 + decal.variant; ray += 1) { const a = decal.rotation + ray / (5 + decal.variant) * Math.PI * 2; const inner=decal.radius*.14,outer=decal.radius*(.55+(ray%3)*.18);this.aftermath.moveTo(decal.position.x+Math.cos(a)*inner,decal.position.y+Math.sin(a)*inner*.55).lineTo(decal.position.x+Math.cos(a+.08)*outer,decal.position.y+Math.sin(a+.08)*outer*.55).stroke({ color: decal.kind.includes('corruption')?0x8f47b0:0x9b5b45, width: 5+decal.variant*2, alpha }); }
    }
  }

  private drawBossIndicator(position: Vec2): void {
    this.bossIndicator.clear();
    const viewport=this.camera.viewport,point=this.camera.worldToScreen(position),margin=26;
    const inside=point.x>=viewport.x&&point.x<=viewport.x+viewport.width&&point.y>=viewport.y&&point.y<=viewport.y+viewport.height;
    if(inside)return;
    const center={x:viewport.x+viewport.width/2,y:viewport.y+viewport.height/2};
    const angle=Math.atan2(point.y-center.y,point.x-center.x);
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const tx=dx===0?Infinity:(dx>0?(viewport.x+viewport.width-margin-center.x)/dx:(viewport.x+margin-center.x)/dx);
    const ty=dy===0?Infinity:(dy>0?(viewport.y+viewport.height-margin-center.y)/dy:(viewport.y+margin-center.y)/dy);
    const t=Math.min(Math.abs(tx),Math.abs(ty));
    const x=center.x+dx*t,y=center.y+dy*t;
    const size=9;
    this.bossIndicator.poly([x+dx*size*1.4,y+dy*size*1.4,x-dy*size-dx*size,y+dx*size-dy*size,x+dy*size-dx*size,y-dx*size-dy*size]).fill({color:0xffa457,alpha:.72});
  }

  private drawLoot(view: LootView, drop: LootDrop, seconds: number): void {
    const color = LOOT_COLORS[drop.kind], rare = drop.rarity !== 'common', epic = drop.rarity === 'epic';
    const alternate = Number(drop.id.split('-')[1] ?? 0) % 2 === 1;
    const key: AssetKey = epic ? (alternate ? 'loot.epic.alt' : 'loot.epic') : rare ? (alternate ? 'loot.rare.alt' : 'loot.rare') : (alternate ? 'loot.common.alt' : 'loot.common');
    const texture = this.assets?.texture(key);
    view.fallback.clear().ellipse(0, 14, epic ? 34 : rare ? 27 : 19, epic ? 11 : 8).fill({ color: 0x02030a, alpha: 0.58 });
    if (texture) {
      if (view.key !== key) { view.sprite.texture = texture; view.key = key; }
      const target = epic ? 72 : rare ? 58 : 45;
      view.sprite.scale.set(target / Math.max(1, texture.width)); view.sprite.visible = true;
      view.sprite.y = -8;
    } else {
      view.sprite.visible = false;
      if (drop.kind === 'relic') view.fallback.roundRect(-18, -22, 36, 31, 6).fill(0x5d321d).stroke({ color, width: epic ? 7 : 5 }).rect(-9, -30, 18, 10).fill(0x8c5e2e);
      else view.fallback.poly([0,-28,19,-8,12,20,-13,18,-21,-7]).fill(color).poly([-1,-21,9,-5,4,9,-7,7]).fill({ color: 0xffffff, alpha: .64 });
    }
    if (rare && drop.phase !== 'airborne') view.fallback.rect(epic ? -4 : -3, epic ? -205 : -142, epic ? 8 : 6, epic ? 176 : 116).fill({ color, alpha: epic ? .25 : .18 });
    const pulse = 1 + Math.sin(seconds * (epic ? 6 : 4) + Number(drop.id.split('-')[1])) * (epic ? .09 : .045);
    view.root.scale.set(pulse * (epic ? 1.22 : rare ? 1.13 : 1));
  }

  private drawPet(): void {
    this.petFallback.clear().ellipse(0, 18, 28, 9).fill({ color: 0x03040a, alpha: .48 }).circle(0, 0, 24).fill({ color: 0xff7e2e, alpha: .15 })
      .poly([0,-25,18,-5,11,18,0,10,-12,19,-19,-5]).fill(0xff8938).circle(0,-4,8).fill(0xffefbd)
      .circle(-4,-6,2).fill(0x3a1830).circle(4,-6,2).fill(0x3a1830);
    this.petView.addChild(this.petFallback);
    const texture = this.assets?.texture('pet.emberWisp');
    if (texture) {
      this.petSprite = new Sprite(texture); this.petSprite.anchor.set(.5); this.petSprite.scale.set(62 / Math.max(1, texture.width));
      this.petView.addChild(this.petSprite); this.petFallback.visible = false;
    }
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
    if (arena.collisionBoundsVisible) this.guides.rect(180, 180, 5240, 3640).stroke({ color: 0x62ffb5, width: 8, alpha: .7 }).ellipse(arena.bossWorld.position.x,arena.bossWorld.position.y,arena.bossWorld.footprint.radiusX,arena.bossWorld.footprint.radiusY).stroke({color:0xff9a45,width:8,alpha:.7});
    if (arena.pickupRadiusVisible) this.guides.circle(arena.player.position.x, arena.player.position.y, arena.player.stats.pickupRadius).stroke({ color: 0x75eaff, width: 7, alpha: .55 });
  }

  private worldVisible(position: Vec2, margin: number): boolean {
    const viewport = this.camera.viewport;
    const halfWidth = viewport.width / (2 * this.camera.scale) + margin, halfHeight = viewport.height / (2 * this.camera.scale) + margin;
    return Math.abs(position.x - this.camera.position.x) <= halfWidth && Math.abs(position.y - this.camera.position.y) <= halfHeight;
  }
}

function hash(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}
