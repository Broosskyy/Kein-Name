import { Application, Container, Graphics, Sprite, Ticker } from 'pixi.js';
import { AssetRegistry, type AssetKey } from '../assets';
import { GAME_CONFIG, type QualityName } from '../config';
import { EVOLUTIONS, evolutionFor } from '../content';
import { CombatModel } from '../core/CombatModel';
import type { DomainEventBus } from '../core/DomainEvents';
import type { GameAudio } from '../audio/AudioBus';
import type { AttackKind, BreakpointId, Mutation } from '../types';
import type { EventRuntime } from '../event/EventRuntime';
import { GameUI, type DebugAction } from '../ui/GameUI';
import { EffectsLayer } from './EffectsLayer';
import { visualRandom } from './VisualRandom';
import { VisualQualityController } from './VisualQuality';
import { VisualState, type BossDamageStage } from './VisualState';
import { EVOLUTION_VISUALS, bossVisualKey } from './VisualDefinitions';
import { ArenaLayer } from './ArenaLayer';
import type { ArenaRunEvent, ArenaRunSnapshot } from '../gameplay/ArenaRunModel';
import { ArenaRunModel } from '../gameplay/ArenaRunModel';
import { RUN_UPGRADES } from '../gameplay/RunUpgrades';
import type { MovementInput } from '../gameplay/ArenaTypes';
import { BossWorldPresentation } from './BossWorldPresentation';
import { BOSS_WORLD_ANCHOR } from '../gameplay/ArenaRegions';
import { CreatureLocomotion } from './CreatureLocomotion';
import { ArenaDepthSystem } from '../gameplay/ArenaDepthSystem';
import { BOSS_ATTACKS } from '../gameplay/BossAttackSystem';

export interface GameSceneM06Options {
  arena: ArenaRunModel;
  resumeSnapshot?: ArenaRunSnapshot;
  saveSnapshot?: (snapshot: ArenaRunSnapshot) => void;
  clearSnapshot?: () => void;
  toggleFullscreen?: () => void;
  inspectProgress?: () => void;
  initialZoom?: number;
  saveZoom?: (zoom: number) => void;
}

interface Projectile {
  view: Graphics;
  active: boolean;
  kind: AttackKind;
  elapsed: number;
  duration: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourceKind: 'normal' | 'power';
  trailElapsed: number;
}

interface Transition {
  kind: 'breakpoint' | 'mutation' | 'final';
  mutation?: Mutation;
  elapsed: number;
  duration: number;
  absorbed: boolean;
}

export class GameScene {
  private readonly world = new Container();
  private readonly background = new Graphics();
  private readonly arenaBack = new Graphics();
  private readonly arenaFloor = new Graphics();
  private readonly arenaForeground = new Graphics();
  private readonly vignette = new Graphics();
  private readonly screenFlash = new Graphics();
  private readonly backgroundAsset?: Sprite;
  private readonly halloweenBackgroundAsset?: Sprite;
  private readonly halloweenForegroundAsset?: Sprite;
  private readonly ambient = new Container();
  private readonly boss = new Container();
  private readonly bossShadow = new Graphics();
  private readonly bossFallbackArt = new Container();
  private readonly bossProductionArt = new Container();
  private bossProductionSprite?: Sprite;
  private currentBossAssetKey?: AssetKey;
  private readonly bossFlash = new Graphics();
  private readonly bossCore = new Container();
  private readonly bossLeftPlate = new Graphics();
  private readonly bossRightPlate = new Graphics();
  private readonly bossDamageFractured = new Graphics();
  private readonly bossDamageCritical = new Graphics();
  private readonly bossEventLayer = new Graphics();
  private readonly bossRimLight = new Graphics();
  private readonly coreGlow = new Graphics();
  private readonly coreGem = new Graphics();
  private readonly creature = new Container();
  private readonly creatureShadow = new Graphics();
  private readonly creatureAura = new Graphics();
  private readonly creatureBody = new Container();
  private readonly creatureFallbackBase = new Container();
  private readonly creatureProductionBase = new Container();
  private readonly creatureProductionEvolution = new Container();
  private evolutionProductionSprite?: Sprite;
  private readonly crystalMutation = new Container();
  private readonly voidMutation = new Container();
  private readonly wingMutation = new Container();
  private readonly pumpkinMutation = new Container();
  private readonly fusionMutation = new Container();
  private readonly fusionGraphics = new Graphics();
  private readonly powerGrowth = new Graphics();
  private readonly essence = new Container();
  private readonly essenceGlow = new Graphics();
  private readonly essenceCore = new Graphics();
  private essenceAsset?: Sprite;
  private readonly quality = new VisualQualityController();
  private readonly visualState = new VisualState();
  private readonly effects = new EffectsLayer(this.quality);
  private readonly arenaLayer: ArenaLayer;
  private readonly bossWorldPresentation = new BossWorldPresentation();
  private readonly creatureLocomotion = new CreatureLocomotion();
  private readonly depthSystem = new ArenaDepthSystem();
  private readonly projectiles: Projectile[] = [];
  private readonly motes: Graphics[] = [];
  private readonly temporaryTimers = new Set<number>();
  private readonly tick = (ticker: Ticker): void => this.update(Math.min(50, ticker.deltaMS));
  private readonly unsubscribeEvents: () => void;
  private resultTimeout?: number;
  private transition?: Transition;
  private elapsedMs = 0;
  private autoAttackMs = 350;
  private hitStopMs = 0;
  private shakeMs = 0;
  private shakeStrength = 0;
  private bossRecoil = 0;
  private creaturePunch = 0;
  private powerInFlight = false;
  private echoDelayMs = -1;
  private echoSource: 'normal' | 'power' = 'normal';
  private volleyDelayMs = -1;
  private pumpkinDelayMs = -1;
  private pumpkinSource: 'normal' | 'power' = 'normal';
  private inEventHub = false;
  private resultElapsed = 0;
  private flashAlpha = 0;
  private width = 0;
  private height = 0;
  private portrait = true;
  private bossBaseScale = 1;
  private creatureBaseScale = 1;
  private bossBaseX = 0;
  private bossBaseY = 0;
  private creatureBaseX = 0;
  private creatureBaseY = 0;
  private movementInput: MovementInput = { x: 0, y: 0 };
  private readonly keys = new Set<string>();
  private autosaveMs = 0;
  private finalLootGranted = false;
  private movementDustMs = 0;
  private readonly keyDown = (event: KeyboardEvent): void => { const key=event.key.toLowerCase(); this.keys.add(key); if(key===' '){event.preventDefault();this.tryDash();} if(key==='+'||key==='=')this.changeZoom(.08);if(key==='-')this.changeZoom(-.08);this.syncKeyboardMovement(); };
  private readonly keyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); this.syncKeyboardMovement(); };

  constructor(
    private readonly app: Application,
    private readonly ui: GameUI,
    private readonly audio: GameAudio,
    private readonly model: CombatModel,
    events: DomainEventBus,
    private readonly assets: AssetRegistry,
    private readonly eventRuntime?: EventRuntime,
    private readonly m06?: GameSceneM06Options,
  ) {
    this.app.stage.addChild(this.world);
    this.arenaLayer = new ArenaLayer(this.assets);
    this.world.sortableChildren = true;
    const backgroundTexture = this.assets.texture('arena.standard.background');
    if (backgroundTexture) this.backgroundAsset = new Sprite(backgroundTexture);
    const halloweenBackgroundTexture = this.assets.texture('arena.halloween.background');
    if (halloweenBackgroundTexture) this.halloweenBackgroundAsset = new Sprite(halloweenBackgroundTexture);
    const halloweenForegroundTexture = this.assets.texture('arena.halloween.foreground');
    if (halloweenForegroundTexture) this.halloweenForegroundAsset = new Sprite(halloweenForegroundTexture);
    this.world.addChild(this.background);
    if (this.backgroundAsset) this.world.addChild(this.backgroundAsset);
    if (this.halloweenBackgroundAsset) this.world.addChild(this.halloweenBackgroundAsset);
    this.world.addChild(this.arenaBack, this.ambient, this.arenaFloor, this.arenaLayer, this.boss, this.creature, this.essence, this.effects, this.arenaForeground);
    if (this.halloweenForegroundAsset) this.world.addChild(this.halloweenForegroundAsset);
    this.world.addChild(this.vignette, this.screenFlash);
    this.background.zIndex=-100;
    if(this.backgroundAsset)this.backgroundAsset.zIndex=-99;
    if(this.halloweenBackgroundAsset)this.halloweenBackgroundAsset.zIndex=-98;
    this.arenaBack.zIndex=-90;this.ambient.zIndex=-80;this.arenaFloor.zIndex=-70;this.arenaLayer.zIndex=0;
    this.boss.zIndex=12;this.creature.zIndex=14;this.essence.zIndex=25;this.effects.zIndex=30;this.arenaForeground.zIndex=40;
    if(this.halloweenForegroundAsset)this.halloweenForegroundAsset.zIndex=41;
    this.vignette.zIndex=50;this.screenFlash.zIndex=60;
    this.createBoss();
    this.createCreature();
    this.createAmbientMotes();
    this.createProjectilePool();
    this.createEssence();
    this.applyQuality();
    this.resize();
    this.arenaLayer.setZoom(this.m06?.initialZoom ?? GAME_CONFIG.arena.cameraDefaultZoom);
    this.bindInput();
    this.m06?.arena.setEventSink((event) => this.handleArenaEvent(event));
    this.unsubscribeEvents = events.subscribe((event) => {
      if (event.type === 'MUTATION_ACQUIRED') this.ui.setMutation(event.mutationId);
      if (event.type === 'EVOLUTION_DISCOVERED') this.audio.play('newDiscovery');
      if (event.type === 'MILESTONE_REACHED') this.audio.play('milestoneUnlock');
      if (event.type === 'EVENT_COMPLETED') this.audio.play('eventComplete');
      if (event.type === 'RUN_COMPLETED') {
        window.clearTimeout(this.resultTimeout);
        this.resultTimeout = window.setTimeout(() => this.ui.showResult(event.result), 420);
      }
    });
    this.app.ticker.add(this.tick);
    this.syncEventPresentation();
    if (this.eventRuntime?.enabled && !this.m06?.resumeSnapshot) this.openEventHub();
    if (this.m06?.resumeSnapshot) { this.inEventHub = false; this.ui.hideEventHub(); this.model.pause(performance.now()); this.ui.showResumePrompt(); }
  }

  pause(nowMs: number): void {
    this.model.pause(nowMs);
    this.audio.pause();
    this.app.ticker.stop();
  }

  resume(nowMs: number): void {
    this.model.resume(nowMs);
    this.audio.resume();
    this.app.resize();
    this.resize();
    this.app.ticker.start();
  }

  destroy(): void {
    window.clearTimeout(this.resultTimeout);
    this.clearTemporaryTimers();
    this.unsubscribeEvents();
    this.app.ticker.remove(this.tick);
    this.clearProjectiles();
    this.effects.clearAll();
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
  }

  private createBoss(): void {
    this.bossShadow.ellipse(0, 165, 205, 48).fill({ color: 0x02030a, alpha: 0.62 });
    this.boss.addChild(this.bossShadow, this.bossFallbackArt, this.bossProductionArt);

    this.bossRimLight
      .poly([-244, -67, -164, -143, -81, -126, -67, -214, -13, -247, 54, -224, 75, -135, 171, -148, 251, -63, 224, 54, 158, 25, 139, 141, 0, 190, -139, 141, -157, 32, -223, 54])
      .fill({ color: 0x090a12, alpha: 0.94 })
      .moveTo(-239, -65).lineTo(-164, -139).lineTo(-83, -123)
      .moveTo(72, -132).lineTo(170, -145).lineTo(246, -61)
      .stroke({ color: 0xd29b78, width: 8, alpha: 0.18 });
    this.bossFallbackArt.addChild(this.bossRimLight);

    const back = new Graphics()
      .poly([-208, 28, -256, 108, -204, 174, -144, 121, -135, 22]).fill(0x171a25)
      .poly([208, 28, 258, 108, 204, 174, 143, 121, 135, 22]).fill(0x171a25);
    const shoulders = new Graphics()
      .poly([-198, -76, -116, -126, -68, -74, -100, 12, -211, 30]).fill(0x303544)
      .poly([198, -76, 116, -126, 68, -74, 100, 12, 211, 30]).fill(0x303544)
      .poly([-198, -76, -151, -119, -116, -126, -141, -55]).fill(0x454c5d)
      .poly([198, -76, 151, -119, 116, -126, 141, -55]).fill(0x454c5d);
    this.bossLeftPlate
      .poly([-220, -60, -166, -118, -108, -99, -119, -18, -192, 18, -238, -12]).fill(0x3b4152)
      .poly([-210, -55, -168, -105, -131, -92, -163, -55]).fill({ color: 0x626a7c, alpha: 0.52 })
      .moveTo(-213, -28).lineTo(-145, -73).stroke({ color: 0x777f91, width: 4, alpha: 0.35 });
    this.bossRightPlate
      .poly([112, -94, 179, -125, 233, -73, 246, -4, 191, 27, 122, -25]).fill(0x343a4b)
      .poly([142, -88, 177, -111, 220, -71, 181, -66]).fill({ color: 0x596173, alpha: 0.48 })
      .moveTo(145, -69).lineTo(221, -31).stroke({ color: 0x737b8d, width: 4, alpha: 0.3 });
    const torso = new Graphics()
      .poly([-128, -88, -73, -137, 0, -116, 73, -137, 128, -88, 143, 57, 86, 146, 0, 169, -86, 146, -143, 57])
      .fill(0x262a38)
      .poly([-118, -76, -63, -119, -9, -99, -57, -25, -126, 9]).fill(0x3b4050)
      .poly([14, -99, 68, -119, 118, -76, 126, 9, 58, -25]).fill(0x323746)
      .poly([-93, 76, -26, 42, -5, 157, -86, 142]).fill(0x1d202c)
      .poly([93, 76, 26, 42, 5, 157, 86, 142]).fill(0x191c27);
    const head = new Graphics()
      .poly([-75, -195, -26, -225, 42, -216, 82, -175, 61, -111, 0, -89, -64, -116, -91, -169]).fill(0x303544)
      .poly([-70, -188, -25, -216, 0, -207, -31, -153, -78, -160]).fill(0x474d5e)
      .poly([0, -207, 39, -207, 72, -174, 53, -122, 6, -105]).fill(0x242936);
    const crown = new Graphics()
      .poly([-65, -200, -48, -252, -19, -211]).fill(0x242836)
      .poly([21, -215, 52, -253, 63, -197]).fill(0x242836);
    const face = new Graphics()
      .ellipse(-29, -163, 13, 8).fill(0xff6b2d)
      .ellipse(30, -163, 13, 8).fill(0xff6b2d)
      .ellipse(-29, -163, 6, 4).fill(0xffd08a)
      .ellipse(30, -163, 6, 4).fill(0xffd08a);
    const cracks = new Graphics()
      .moveTo(-64, -78).lineTo(-35, -47).lineTo(-49, -8).stroke({ color: 0xff5a24, width: 5, alpha: 0.75 })
      .moveTo(69, -72).lineTo(37, -39).lineTo(53, 3).stroke({ color: 0xff5a24, width: 4, alpha: 0.7 })
      .moveTo(-66, 61).lineTo(-37, 79).lineTo(-48, 116).stroke({ color: 0xff7b36, width: 4, alpha: 0.5 })
      .moveTo(70, 55).lineTo(44, 81).lineTo(54, 119).stroke({ color: 0xff7b36, width: 4, alpha: 0.5 });
    this.bossFallbackArt.addChild(back, shoulders, torso, this.bossLeftPlate, this.bossRightPlate, head, crown, face, cracks);
    this.bossEventLayer
      .moveTo(-186, -62).bezierCurveTo(-225, -12, -201, 51, -155, 96).stroke({ color: 0x342115, width: 17, alpha: 0.92 })
      .moveTo(178, -77).bezierCurveTo(216, -26, 201, 55, 144, 112).stroke({ color: 0x402319, width: 14, alpha: 0.9 })
      .moveTo(-183, -39).lineTo(-143, -17).lineTo(-169, 20).stroke({ color: 0xf26a25, width: 5, alpha: 0.62 })
      .moveTo(166, -56).lineTo(128, -16).lineTo(162, 12).stroke({ color: 0x8f3cff, width: 5, alpha: 0.48 })
      .poly([-118, 102, -82, 72, -44, 111, -71, 151]).fill({ color: 0x4d2517, alpha: 0.82 })
      .poly([119, 99, 82, 71, 47, 111, 73, 151]).fill({ color: 0x43201b, alpha: 0.82 });
    this.bossEventLayer.visible = this.model.isEventRun;
    this.bossFallbackArt.addChild(this.bossEventLayer);
    this.syncBossProductionVisual('intact');

    this.coreGlow.circle(0, 0, 82).fill({ color: 0xff361b, alpha: 0.08 }).circle(0, 0, 62).fill({ color: 0xff481f, alpha: 0.16 }).circle(0, 0, 42).fill({ color: 0xff8a32, alpha: 0.24 });
    this.coreGem.poly([0, -46, 34, -16, 25, 30, 0, 48, -28, 28, -34, -17]).fill(0xff5c26)
      .poly([0, -34, 23, -12, 16, 20, 0, 34, -18, 19, -23, -12]).fill(0xffc15a)
      .circle(-7, -9, 7).fill({ color: 0xffffff, alpha: 0.75 });
    this.bossCore.position.set(this.model.activeBoss.weakpoint.x, this.model.activeBoss.weakpoint.y);
    this.bossCore.addChild(this.coreGlow, this.coreGem);
    this.boss.addChild(this.bossCore);

    this.bossDamageFractured
      .moveTo(-13, -54).lineTo(-42, -86).lineTo(-35, -125).stroke({ color: 0xff7635, width: 7, alpha: 0.9 })
      .moveTo(20, 43).lineTo(51, 72).lineTo(39, 122).stroke({ color: 0xff572b, width: 6, alpha: 0.85 })
      .moveTo(-95, -15).lineTo(-71, 7).lineTo(-91, 44).stroke({ color: 0xff6a31, width: 5, alpha: 0.68 });
    this.bossDamageCritical
      .moveTo(4, -92).lineTo(48, -142).lineTo(78, -127).stroke({ color: 0xff9a48, width: 9, alpha: 0.96 })
      .moveTo(-29, 38).lineTo(-72, 76).lineTo(-55, 137).stroke({ color: 0xff5b28, width: 8, alpha: 0.92 })
      .moveTo(80, -5).lineTo(111, 25).lineTo(92, 75).stroke({ color: 0xff7d35, width: 7, alpha: 0.84 })
      .poly([115, -89, 158, -108, 179, -70, 149, -38, 111, -49]).fill({ color: 0x080a12, alpha: 0.82 });
    this.bossDamageFractured.visible = false;
    this.bossDamageCritical.visible = false;
    this.boss.addChild(this.bossDamageFractured, this.bossDamageCritical);

    this.bossFlash
      .poly([-126, -90, -62, -138, 0, -116, 62, -138, 126, -90, 142, 60, 80, 146, 0, 172, -80, 146, -142, 60])
      .fill({ color: 0xffffff, alpha: 0.8 });
    this.bossFlash.alpha = 0;
    this.boss.addChild(this.bossFlash);
  }

  private createCreature(): void {
    this.creatureShadow.ellipse(0, 69, 79, 22).fill({ color: 0x02030b, alpha: 0.5 });
    this.creatureAura.circle(0, -5, 118).fill({ color: 0x7b5cff, alpha: 0.04 }).circle(0, -5, 94).stroke({ color: 0xa58cff, width: 3, alpha: 0.12 });
    this.creatureAura.visible = false;
    this.creature.addChild(this.creatureAura, this.creatureShadow, this.wingMutation, this.creatureBody, this.fusionMutation, this.creatureProductionEvolution, this.powerGrowth);

    const feet = new Graphics()
      .ellipse(-46, 49, 29, 20).fill(0xd9dcff)
      .ellipse(43, 53, 27, 18).fill(0xc4c8f2);
    const body = new Graphics()
      .moveTo(-79, 35).bezierCurveTo(-92, -20, -65, -76, -16, -91)
      .bezierCurveTo(18, -110, 67, -79, 79, -30)
      .bezierCurveTo(94, 22, 70, 65, 17, 70)
      .bezierCurveTo(-27, 78, -67, 66, -79, 35).fill(0xe4e5ff)
      .moveTo(-66, 6).bezierCurveTo(-54, -46, -19, -78, 16, -79)
      .bezierCurveTo(-7, -57, -19, -26, -18, 7).fill({ color: 0xffffff, alpha: 0.36 });
    const bodyMaterial = new Graphics()
      .moveTo(-69, 30).bezierCurveTo(-79, -18, -52, -63, -13, -79).stroke({ color: 0xffffff, width: 7, alpha: 0.34 })
      .moveTo(53, -56).bezierCurveTo(77, -30, 79, 8, 62, 37).stroke({ color: 0x8c96d0, width: 8, alpha: 0.24 })
      .ellipse(-26, -57, 22, 10).fill({ color: 0xffffff, alpha: 0.13 });
    const earFins = new Graphics()
      .poly([-63, -51, -96, -86, -82, -27]).fill(0xc6cbf4)
      .poly([57, -59, 82, -94, 81, -35]).fill(0xb8bde9)
      .poly([-74, 13, -107, 31, -75, 43]).fill(0xb9bee8);
    const tail = new Graphics()
      .moveTo(61, 33).bezierCurveTo(112, 24, 112, -17, 88, -25).bezierCurveTo(103, 7, 87, 22, 64, 47)
      .stroke({ color: 0xb8bee9, width: 15, cap: 'round' });
    const identityArmor = new Graphics()
      .poly([-48, -58, -16, -83, 20, -82, 52, -55, 29, -43, -25, -43]).fill({ color: 0xbcc3ef, alpha: 0.58 })
      .poly([-42, 30, 0, 16, 43, 27, 25, 51, -19, 53]).fill({ color: 0xa8afd9, alpha: 0.3 })
      .poly([-6, 24, 0, 15, 7, 24, 0, 34]).fill({ color: 0x7e87bd, alpha: 0.72 });
    const face = new Graphics()
      .poly([-42, -31, -14, -38, -18, -29, -40, -23]).fill({ color: 0x5a618e, alpha: 0.42 })
      .poly([43, -33, 16, -39, 19, -30, 41, -24]).fill({ color: 0x5a618e, alpha: 0.42 })
      .ellipse(-27, -17, 10, 15).fill(0x111426)
      .ellipse(27, -19, 10, 15).fill(0x111426)
      .circle(-30, -23, 3.5).fill(0xffffff)
      .circle(24, -25, 3.5).fill(0xffffff)
      .moveTo(-7, 12).quadraticCurveTo(1, 15, 10, 9).stroke({ color: 0x474a70, width: 2.5 });
    this.creatureFallbackBase.addChild(tail, feet, earFins, body, bodyMaterial, identityArmor, face);
    const baseTexture = this.assets.texture('creature.base');
    if (baseTexture) {
      const sprite = new Sprite(baseTexture);
      sprite.anchor.set(0.5);
      sprite.scale.set(215 / Math.max(1, baseTexture.width));
      this.creatureProductionBase.addChild(sprite);
      this.creatureFallbackBase.visible = false;
    }
    this.creatureBody.addChild(this.creatureFallbackBase, this.creatureProductionBase, this.crystalMutation, this.voidMutation, this.pumpkinMutation);

    this.crystalMutation.addChild(
      new Graphics()
        .poly([-51, -54, -31, -139, -5, -67]).fill(0x42cdea)
        .poly([-16, -72, 15, -162, 39, -57]).fill(0x7d6ef6)
        .poly([26, -61, 72, -126, 73, -33]).fill(0x32bfe7)
        .poly([-73, -12, -119, -60, -91, 19]).fill(0x4ad5ec)
        .poly([68, -1, 112, -50, 89, 23]).fill(0x6c70ed)
        .poly([-50, 29, -78, 10, -68, 57]).fill(0x73e9f7)
        .poly([-31, -139, -20, -105, -5, -67, -38, -82]).fill({ color: 0xe8ffff, alpha: 0.5 })
        .poly([15, -162, 26, -113, 39, -57, 4, -89]).fill({ color: 0xbcecff, alpha: 0.36 })
        .poly([72, -126, 73, -33, 48, -59]).fill({ color: 0x274fbd, alpha: 0.4 })
        .moveTo(-26, -126).lineTo(-12, -78).stroke({ color: 0xe6ffff, width: 5, alpha: 0.72 })
        .moveTo(18, -145).lineTo(24, -78).stroke({ color: 0xd9faff, width: 5, alpha: 0.66 }),
    );
    this.replaceWithAsset(this.crystalMutation, 'creature.mutation.crystal', 210);
    this.crystalMutation.visible = false;
    this.crystalMutation.scale.set(0.01);

    this.voidMutation.addChild(
      new Graphics()
        .poly([-57, -55, -101, -116, -103, -34, -78, -7]).fill({ color: 0x27183c, alpha: 0.96 })
        .poly([52, -61, 96, -126, 104, -38, 76, -9]).fill({ color: 0x211532, alpha: 0.96 })
        .circle(-55, 15, 11).fill(0xc964ff).circle(53, 8, 11).fill(0xc964ff)
        .circle(-55, 15, 4).fill(0xffffff).circle(53, 8, 4).fill(0xffffff)
        .moveTo(-45, 42).quadraticCurveTo(0, 62, 48, 37).stroke({ color: 0xb653ff, width: 7, alpha: 0.9 })
        .moveTo(-73, -20).lineTo(-52, -1).lineTo(-69, 19).stroke({ color: 0xd277ff, width: 5, alpha: 0.75 })
        .moveTo(70, -22).lineTo(49, -3).lineTo(68, 18).stroke({ color: 0xb84cff, width: 5, alpha: 0.75 })
        .moveTo(-32, -67).lineTo(-8, -43).lineTo(-20, -13).stroke({ color: 0xf0b2ff, width: 4, alpha: 0.64 })
        .moveTo(38, -62).lineTo(14, -37).lineTo(29, -9).stroke({ color: 0x8d34e5, width: 4, alpha: 0.62 })
        .circle(0, 0, 111).stroke({ color: 0x9d4cff, width: 7, alpha: 0.18 }),
    );
    this.replaceWithAsset(this.voidMutation, 'creature.mutation.void', 220);
    this.voidMutation.visible = false;
    this.voidMutation.alpha = 0;

    this.wingMutation.addChild(
      new Graphics()
        .moveTo(-38, -31).bezierCurveTo(-111, -132, -194, -113, -178, -15).bezierCurveTo(-151, -55, -122, -25, -87, 24).lineTo(-35, 34).fill(0x55258f)
        .moveTo(38, -31).bezierCurveTo(111, -132, 194, -113, 178, -15).bezierCurveTo(151, -55, 122, -25, 87, 24).lineTo(35, 34).fill(0x55258f)
        .moveTo(-40, -29).bezierCurveTo(-106, -104, -161, -91, -157, -39).stroke({ color: 0xc45cff, width: 8, alpha: 0.88 })
        .moveTo(40, -29).bezierCurveTo(106, -104, 161, -91, 157, -39).stroke({ color: 0xc45cff, width: 8, alpha: 0.88 })
        .moveTo(-72, -22).lineTo(-142, -63).moveTo(72, -22).lineTo(142, -63).stroke({ color: 0x9f55d8, width: 4, alpha: 0.7 }),
      new Graphics()
        .moveTo(-39, -27).bezierCurveTo(-85, -58, -118, -50, -151, -19).lineTo(-118, -7).lineTo(-87, 24).stroke({ color: 0xf0b1ff, width: 3, alpha: 0.48 })
        .moveTo(39, -27).bezierCurveTo(85, -58, 118, -50, 151, -19).lineTo(118, -7).lineTo(87, 24).stroke({ color: 0xf0b1ff, width: 3, alpha: 0.48 }),
    );
    this.replaceWithAsset(this.wingMutation, 'creature.mutation.wings', 360);
    this.wingMutation.visible = false;
    this.wingMutation.scale.set(0.01);
    this.pumpkinMutation.addChild(
      new Graphics()
        .ellipse(0, -2, 91, 76).fill(0x4e2118)
        .ellipse(-30, -2, 46, 71).fill(0x8e3b1e)
        .ellipse(28, -2, 44, 71).fill(0x6f2a19)
        .moveTo(-71, -37).quadraticCurveTo(0, -69, 72, -34).stroke({ color: 0xe56c27, width: 6, alpha: 0.58 })
        .moveTo(-67, 24).quadraticCurveTo(0, 53, 67, 22).stroke({ color: 0xff8a31, width: 5, alpha: 0.52 })
        .poly([-35, -26, -12, -15, -37, -5]).fill(0xffa63d)
        .poly([35, -28, 13, -16, 39, -7]).fill(0xffa63d)
        .moveTo(-26, 17).lineTo(-9, 30).lineTo(7, 17).lineTo(25, 28).stroke({ color: 0xffad42, width: 7, alpha: 0.92 })
        .moveTo(-8, -67).bezierCurveTo(9, -105, 36, -95, 44, -119).stroke({ color: 0x4d5a2d, width: 13, cap: 'round' })
        .moveTo(-60, 39).bezierCurveTo(-112, 39, -112, -8, -88, -24).stroke({ color: 0x53602e, width: 9, cap: 'round' })
        .moveTo(58, 35).bezierCurveTo(108, 29, 103, -13, 89, -31).stroke({ color: 0x46552b, width: 8, cap: 'round' }),
    );
    this.replaceWithAsset(this.pumpkinMutation, 'creature.mutation.pumpkin', 225);
    this.pumpkinMutation.visible = false;
    this.pumpkinMutation.scale.set(0.01);
    this.fusionMutation.addChild(this.fusionGraphics);
    this.fusionMutation.visible = false;
    this.creatureProductionEvolution.visible = false;
  }

  private createAmbientMotes(): void {
    for (let index = 0; index < GAME_CONFIG.quality.high.ambientMotes; index += 1) {
      const mote = new Graphics().circle(0, 0, visualRandom.range(1.5, 4)).fill({ color: index % 2 ? 0xff8b46 : 0x7668ff, alpha: 0.45 });
      mote.x = visualRandom.next();
      mote.y = visualRandom.next();
      mote.alpha = visualRandom.range(0.2, 0.7);
      this.ambient.addChild(mote);
      this.motes.push(mote);
    }
  }

  private createProjectilePool(): void {
    for (let index = 0; index < GAME_CONFIG.quality.high.maxProjectiles; index += 1) {
      const view = new Graphics();
      view.visible = false;
      view.zIndex = 24;
      this.world.addChild(view);
      this.projectiles.push({ view, active: false, kind: 'normal', elapsed: 0, duration: 0, sx: 0, sy: 0, tx: 0, ty: 0, sourceKind: 'normal', trailElapsed: 0 });
    }
    this.world.setChildIndex(this.effects, this.world.children.length - 1);
  }

  private createEssence(): void {
    this.essenceGlow.circle(0, 0, 34).fill({ color: 0x70dcff, alpha: 0.15 });
    this.essenceCore.poly([0, -19, 15, -5, 9, 17, -10, 16, -16, -4]).fill(0x7ce8ff);
    this.essence.addChild(this.essenceGlow, this.essenceCore);
    this.essence.visible = false;
  }

  private replaceWithAsset(container: Container, key: AssetKey, targetWidth: number): void {
    const texture = this.assets.texture(key);
    if (!texture) return;
    container.removeChildren();
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    const scale = targetWidth / Math.max(1, texture.width);
    sprite.scale.set(scale);
    container.addChild(sprite);
  }

  private syncBossProductionVisual(stage: BossDamageStage): boolean {
    const requestedKey = bossVisualKey(this.model.isEventRun, stage);
    const baseKey = bossVisualKey(this.model.isEventRun, 'intact');
    const key = this.assets.has(requestedKey) ? requestedKey : this.assets.has(baseKey) ? baseKey : undefined;
    if (!key) {
      this.bossFallbackArt.visible = true;
      this.bossProductionArt.visible = false;
      this.currentBossAssetKey = undefined;
      return false;
    }
    if (key !== this.currentBossAssetKey) {
      this.bossProductionSprite?.destroy();
      const texture = this.assets.texture(key);
      if (!texture) return false;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(520 / Math.max(1, texture.width));
      this.bossProductionArt.removeChildren();
      this.bossProductionArt.addChild(sprite);
      this.bossProductionSprite = sprite;
      this.currentBossAssetKey = key;
    }
    this.bossFallbackArt.visible = false;
    this.bossProductionArt.visible = true;
    return key === requestedKey;
  }

  private syncEvolutionProductionVisual(): boolean {
    this.creatureProductionEvolution.removeChildren();
    this.evolutionProductionSprite?.destroy();
    this.evolutionProductionSprite = undefined;
    this.creatureProductionEvolution.visible = false;
    this.creatureBody.visible = true;
    if (this.model.mutations.size !== 2) return false;
    const evolution = evolutionFor(this.model.mutations);
    const definition = EVOLUTION_VISUALS[evolution.id];
    const texture = this.assets.texture(definition.assetKey);
    if (!texture) return false;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.scale.set((definition.profile === 'aerial' || definition.profile === 'predator' || definition.profile === 'ember-aerial' ? 385 : 330) / Math.max(1, texture.width));
    this.creatureProductionEvolution.addChild(sprite);
    this.evolutionProductionSprite = sprite;
    this.creatureProductionEvolution.visible = true;
    this.creatureBody.visible = false;
    this.wingMutation.visible = false;
    return true;
  }

  private bindInput(): void {
    this.ui.bindPower(() => {
      this.audio.unlock();
      this.requestPowerHit();
    });
    this.ui.bindDash(() => this.tryDash());
    this.ui.bindZoom((delta) => this.changeZoom(delta));
    this.ui.bindCameraPan((dx, dy) => this.arenaLayer.panCamera(dx, dy));
    this.ui.bindCameraReset(() => this.arenaLayer.resetCamera());
    this.ui.bindRetry(() => this.reset());
    this.ui.bindEventEnter(() => this.startEventRun());
    this.ui.bindEventHub(() => this.openEventHub());
    this.ui.bindDebug((action) => this.handleDebug(action));
    this.ui.bindMovement((input) => { this.movementInput = input; });
    this.ui.bindFullscreen(() => this.m06?.toggleFullscreen?.());
    this.ui.bindResumeChoice((resume) => {
      const now = performance.now();
      if (resume && this.m06?.resumeSnapshot) {
        this.m06.arena.restore(this.m06.resumeSnapshot, now);
        this.syncMutationVisuals();
        this.syncBossDamageVisuals(this.visualState.updateBossHealth(this.model.bossHp, this.model.maxHp));
        if (this.model.phase === 'choice') this.ui.showChoices(this.model.pendingChoices, (mutation) => this.selectMutation(mutation));
        if (this.model.phase === 'upgrade') {
          const choices = this.m06.arena.pendingUpgradeIds.map((id) => RUN_UPGRADES.find((upgrade) => upgrade.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
          this.ui.showUpgradeChoices(choices, (id) => { if (this.m06?.arena.chooseUpgrade(id, performance.now())) this.ui.hideUpgradeChoices(); });
        }
      } else {
        this.m06?.clearSnapshot?.(); this.model.reset(now); this.m06?.arena.reset(); this.resetVisualsAfterModelReset();
      }
      this.model.resume(now); this.ui.hideResumePrompt();
    });
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    this.ui.setSeed(this.model.seed);
  }

  private syncKeyboardMovement(): void {
    const left = this.keys.has('a') || this.keys.has('arrowleft'); const right = this.keys.has('d') || this.keys.has('arrowright');
    const up = this.keys.has('w') || this.keys.has('arrowup'); const down = this.keys.has('s') || this.keys.has('arrowdown');
    const keyboard = { x: Number(right) - Number(left), y: Number(down) - Number(up) };
    if (keyboard.x || keyboard.y || (!this.movementInput.x && !this.movementInput.y)) this.movementInput = keyboard;
  }

  private tryDash(): void { if(this.m06?.arena.dash(this.movementInput)){this.audio.unlock();this.creaturePunch=1.2;this.shake(105,3.2);this.arenaLayer.camera.impulse(4.5);} }
  private changeZoom(delta:number):void{const zoom=this.arenaLayer.setZoom(this.arenaLayer.camera.targetZoom+delta);this.m06?.saveZoom?.(zoom)}

  private handleArenaEvent(event: ArenaRunEvent): void {
    if (event.type === 'PLAYER_DAMAGED') { this.creaturePunch = -0.8; this.flash(0.16); this.shake(150, 5); }
    if (event.type === 'PLAYER_DASHED') { const from=this.arenaLayer.toScreen(event.from),to=this.arenaLayer.toScreen(event.to);for(let i=0;i<7;i++){const t=i/6;this.effects.trail(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t,0x8feaff,7-i*.65);} }
    if (event.type === 'BOSS_ATTACK_IMPACT') {
      const p=this.arenaLayer.toScreen(event.impact.position);
      const major=event.impact.kind==='ground-slam'||event.impact.kind==='rear-slam'||event.impact.kind==='radial-shockwave';
      this.effects.burst(p.x,p.y,event.impact.kind.includes('corruption')?0xb65cff:0xff7748,major?22:event.impact.kind==='falling-debris'?10:15,major?1:.68);
      if(major){this.effects.debrisBurst(p.x,p.y,0x494553,14,.82);this.effects.shockwave(p.x,p.y,0xff8b4d,1.18);this.bossRecoil=Math.max(this.bossRecoil,1.25)}
      this.arenaLayer.camera.impulse(event.impact.hit?8:major?6:4);
      if(this.arenaLayer.reactToImpact(event.impact.position,event.impact.radius,event.impact.kind))this.effects.debrisBurst(p.x,p.y,0x918ba5,9,.48);
    }
    if (event.type === 'PLAYER_DEFEATED') { this.clearProjectiles(); this.ui.showFailure(); this.m06?.clearSnapshot?.(); }
    if (event.type === 'LOOT_PICKED') {
      const point = this.arenaLayer.toScreen(this.m06!.arena.player.position);
      this.effects.burst(point.x, point.y, event.pickup.rarity === 'epic' ? 0xffd05b : 0x7deaff, event.pickup.rarity === 'common' ? 6 : 12, 0.55);
      this.ui.announce('LOOT ACQUIRED', event.pickup.kind.replaceAll('-', ' ').toUpperCase(), '#8feaff', 650);
    }
    if (event.type === 'RUN_LEVEL_UP') {
      const choices = event.choices.map((id) => RUN_UPGRADES.find((upgrade) => upgrade.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
      this.ui.showUpgradeChoices(choices, (id) => { if (this.m06?.arena.chooseUpgrade(id, performance.now())) { this.ui.hideUpgradeChoices(); this.syncPowerGrowth(); this.ui.announce('POWER EVOLVED', RUN_UPGRADES.find((upgrade) => upgrade.id === id)?.name ?? '', '#ffe28a'); } });
    }
    if (event.type === 'BOSS_CYCLE_STARTED') { this.ui.announce(`CYCLE ${event.cycle}`, event.cycle === 2 ? 'THE ARENA CORRUPTS' : 'FINAL INSTABILITY', '#ffb35f', 1500); this.arenaLayer.setCycle(event.cycle); this.arenaLayer.camera.emphasize('cycle'); }
  }

  private handleDebug(action: DebugAction): void {
    const now = performance.now();
    if (action === 'restart') return this.reset();
    const arena = this.m06?.arena;
    if (action === 'grant-xp' || action === 'level-up') { arena?.grantXp(action === 'level-up' ? arena.xpToNext : 100, now); return; }
    if (action === 'spawn-loot' || action === 'spawn-rare') { arena?.spawnLoot(action === 'spawn-rare' ? 'relic' : 'run-xp', action === 'spawn-rare' ? 'epic' : 'common', action === 'spawn-rare' ? 1 : 25); return; }
    if (action === 'next-cycle') { arena?.advanceCycle(now); this.resetBossForCycle(); return; }
    if ((action === 'cycle-1' || action === 'cycle-2' || action === 'cycle-3') && arena) { arena.debugSetCycle(Number(action.slice(-1)) as 1|2|3, now); this.resetBossForCycle(); return; }
    if (action.startsWith('zoom-')) { const values={ 'zoom-action':1.22,'zoom-standard':.88,'zoom-tactical':.7 } as const;this.arenaLayer.setZoom(values[action as keyof typeof values]);return; }
    if ((action.startsWith('region-') || action.startsWith('distance-')) && arena) {
      const positions: Record<string,{x:number;y:number}> = {
        'region-core':{x:1600,y:670},'region-crystal':{x:480,y:730},'region-ruins':{x:2670,y:760},'region-edge':{x:540,y:1480},
        'distance-near':{x:1600,y:690},'distance-medium':{x:1150,y:1080},'distance-far':{x:420,y:1550},
      };
      arena.player.position={...positions[action]}; arena.player.velocity={x:0,y:0}; return;
    }
    if (action.startsWith('attack-')) { const attacks={ 'attack-slam':'ground-slam','attack-beam':'core-beam','attack-debris':'falling-debris','attack-cone':'void-cone','attack-ring':'corruption-ring','attack-shockwave':'shockwave'} as const;arena?.forceBossAttack(attacks[action as keyof typeof attacks]);return; }
    if (action === 'damage-player') { arena?.takeDamage(25, 'ground-slam', now); return; }
    if (action === 'heal-player') { arena?.heal(50); return; }
    if (action === 'dummy-add') { arena?.spawnDummy(); return; }
    if (action === 'dummy-clear') { arena?.clearDummies(); return; }
    if (action === 'dummy-1' || action === 'dummy-2' || action === 'dummy-4' || action === 'dummy-8') { arena?.setVisualPlayerCount(Number(action.slice(-1)) as 1|2|4|8); return; }
    if (action === 'pickup-radius' && arena) { arena.pickupRadiusVisible = !arena.pickupRadiusVisible; return; }
    if (action === 'collision-bounds' && arena) { arena.collisionBoundsVisible = !arena.collisionBoundsVisible; return; }
    if (action === 'telegraphs' && arena) { arena.telegraphsVisible = !arena.telegraphsVisible; return; }
    if (action === 'performance' && arena) { arena.performanceCountersVisible = !arena.performanceCountersVisible; return; }
    if (action === 'save' && arena) { this.m06?.saveSnapshot?.(arena.snapshot(now)); return; }
    if (action === 'clear-snapshot') { this.m06?.clearSnapshot?.(); return; }
    if (action === 'inspect-progress') { this.m06?.inspectProgress?.(); return; }
    if (action === 'inspect-run' && arena) { console.info('M06 RunState', arena.snapshot(now)); return; }
    if (action === 'visual-catalog') { this.ui.toggleVisualCatalog(); return; }
    if (action === 'event-toggle' && this.eventRuntime) {
      this.eventRuntime.setEnabled(!this.eventRuntime.enabled);
      this.model.setEventEnabled(this.eventRuntime.enabled, now);
      if (this.m06?.arena) { this.m06.arena.runMode = this.eventRuntime.enabled ? 'event' : 'solo'; this.m06.arena.reset(); }
      this.resetVisualsAfterModelReset();
      this.syncEventPresentation();
      if (this.eventRuntime.enabled) this.openEventHub(); else this.ui.hideEventHub();
      return;
    }
    if (action === 'event-progress' && this.eventRuntime) { this.eventRuntime.progress.addProgress(250); return this.openEventHub(); }
    if (action === 'event-challenge' && this.eventRuntime) { this.eventRuntime.progress.completeChallenge('power-five'); return this.openEventHub(); }
    if (action === 'event-unlock-all' && this.eventRuntime) { this.eventRuntime.progress.unlockAllEvolutions(EVOLUTIONS.map((item) => item.id)); return this.openEventHub(); }
    if (action === 'event-reset' && this.eventRuntime) { this.eventRuntime.progress.reset(); return this.openEventHub(); }
    if (action === 'event-complete' && this.eventRuntime) { this.eventRuntime.progress.forceComplete(); return this.openEventHub(); }
    if (action === 'effects-reduced') {
      this.quality.toggleReduced();
      this.applyQuality();
      return;
    }
    if (action.startsWith('quality-')) {
      this.quality.set(action.slice(8) as QualityName);
      this.applyQuality();
      return;
    }
    if (action.startsWith('choose-')) {
      const mutation = action.slice(7) as Mutation;
      if (this.model.debugOfferMutation(mutation)) this.selectMutation(mutation);
      return;
    }
    const builds: Partial<Record<DebugAction, readonly [Mutation, Mutation]>> = {
      'build-cv': ['crystal', 'void'],
      'build-cw': ['crystal', 'wings'],
      'build-vw': ['void', 'wings'],
      'build-pv': ['pumpkin', 'void'],
      'build-pc': ['pumpkin', 'crystal'],
      'build-pw': ['pumpkin', 'wings'],
    };
    const build = builds[action];
    if (build) {
      this.model.debugGrantBuild(build, now);
      this.transition = undefined;
      this.ui.hideChoices();
      this.syncMutationVisuals();
      return;
    }
    if (action === 'kill' && this.model.mutations.size < 2) {
      const selected = [...this.model.mutations];
      const fallback = (['crystal', 'void', 'wings'] as Mutation[]).filter((mutation) => !selected.includes(mutation));
      this.model.debugGrantBuild([selected[0] ?? fallback.shift()!, fallback[0] ?? 'void'], now);
      this.syncMutationVisuals();
    }
    const result = action === 'kill'
      ? this.model.debugForceKill(now)
      : this.model.debugForceBreakpoint(action as BreakpointId, now);
    if (!result.accepted) return;
    this.syncBossDamageVisuals(this.visualState.updateBossHealth(this.model.bossHp, this.model.maxHp));
    this.showImpact(result.kind, result.damage);
    if (result.triggeredBreakpointId) this.beginBreakpointTransition(result.triggeredBreakpointId);
    if (result.bossDefeated) this.beginFinalTransition();
  }

  private applyQuality(): void {
    const profile = this.quality.profile;
    this.motes.forEach((mote, index) => { mote.visible = index < profile.ambientMotes; });
    this.app.renderer.resolution = Math.min(window.devicePixelRatio || 1, profile.dpr);
    this.arenaForeground.alpha = this.quality.name === 'low' ? 0.68 : this.quality.name === 'medium' ? 0.84 : 1;
    if (this.halloweenForegroundAsset) this.halloweenForegroundAsset.alpha = this.quality.name === 'low' ? 0.72 : 1;
    this.app.resize();
    this.arenaLayer.setQuality(this.quality.name, this.quality.reducedEffects);
    this.ui.setQuality(this.quality.name, this.quality.reducedEffects);
  }

  private requestPowerHit(): void {
    if (this.powerInFlight || !this.model.canPowerHit(performance.now())) return;
    this.powerInFlight = true;
    this.creaturePunch = 1.4;
    this.audio.play('powerHit');
    this.schedule(() => {
      if (this.model.phase === 'playing') this.launchProjectile('power');
      else this.powerInFlight = false;
    }, 120);
  }

  private launchProjectile(kind: AttackKind, sourceKind: 'normal' | 'power' = kind === 'power' ? 'power' : 'normal', extraIndex = 0): void {
    const projectile = this.projectiles.find((candidate) => !candidate.active);
    if (!projectile || this.model.phase !== 'playing') return;
    projectile.active = true;
    projectile.kind = kind;
    projectile.sourceKind = sourceKind;
    projectile.elapsed = 0;
    projectile.trailElapsed = 0;
    projectile.duration = kind === 'power' ? GAME_CONFIG.timing.powerProjectileMs : kind === 'voidEcho' || kind === 'wingVolley' || kind === 'pumpkinBurst' ? 180 : GAME_CONFIG.timing.normalProjectileMs;
    projectile.sx = this.creature.x;
    projectile.sy = this.creature.y - 45 * this.creatureBaseScale + extraIndex * 10;
    projectile.tx = this.boss.x;
    projectile.ty = this.boss.y + this.model.activeBoss.weakpoint.y * this.bossBaseScale;
    projectile.view.clear();
    if (kind === 'power') {
      const crystal = this.model.mutations.has('crystal');
      const voided = this.model.mutations.has('void');
      const pumpkin = this.model.mutations.has('pumpkin');
      const color = pumpkin ? 0xff762d : crystal ? 0x65e7ff : voided ? 0xc56cff : 0xffd65b;
      projectile.view.poly([-64, 0, -22, -9, -22, 9]).fill({ color, alpha: 0.16 })
        .circle(0, 0, crystal || pumpkin ? 33 : 25).fill({ color, alpha: 0.2 })
        .poly(pumpkin ? [-31, -22, 19, -28, 36, 0, 18, 28, -31, 21, -40, 0] : crystal ? [-42, 0, -10, -21, 35, 0, -10, 21] : [-34, 0, -9, -16, 29, 0, -9, 16]).fill(pumpkin ? 0xb64720 : crystal ? 0x8cecff : voided ? 0x9e46db : 0xffef97)
        .circle(9, 0, 8).fill(0xffffff);
      if (crystal && voided) projectile.view.moveTo(-18, -13).lineTo(22, 0).lineTo(-18, 13).stroke({ color: 0xa94cff, width: 5, alpha: 0.9 });
      if (pumpkin) projectile.view.moveTo(-22, -13).lineTo(12, -4).lineTo(-22, 7).stroke({ color: voided ? 0xb84cff : crystal ? 0x7cecff : 0xffc45e, width: 5, alpha: 0.92 });
    } else if (kind === 'voidEcho') {
      const strong = sourceKind === 'power';
      projectile.view.circle(0, 0, strong ? 27 : 20).fill({ color: 0x5c1b93, alpha: 0.22 })
        .circle(0, 0, strong ? 15 : 10).stroke({ color: 0xd475ff, width: strong ? 6 : 4, alpha: 0.92 })
        .circle(0, 0, 4).fill(0xf3d7ff);
    } else if (kind === 'wingVolley') {
      projectile.view.poly([-35, 0, -9, -4, -9, 4]).fill({ color: 0xffd56f, alpha: 0.18 })
        .poly([-15, 0, -4, -8, 17, 0, -4, 8]).fill(0xffd56f).circle(3, 0, 4).fill(0xffffff);
    } else if (kind === 'pumpkinBurst') {
      projectile.view.circle(0, 0, sourceKind === 'power' ? 22 : 15).fill({ color: 0xff6f27, alpha: 0.24 })
        .poly([-15, -10, 8, -14, 17, 0, 8, 14, -15, 10, -20, 0]).fill(0xb7471f)
        .circle(3, 0, 6).fill(0xffc04f);
      if (this.model.mutations.has('void')) projectile.view.circle(0, 0, 23).stroke({ color: 0xb94fff, width: 4, alpha: 0.75 });
      if (this.model.mutations.has('crystal')) projectile.view.poly([10, -13, 25, 0, 10, 13]).fill(0x7cecff);
    } else if (this.model.mutations.has('pumpkin')) {
      projectile.view.poly([-34, 0, -12, -6, -12, 6]).fill({ color: 0xff7b2d, alpha: 0.22 })
        .ellipse(1, 0, 14, 11).fill(0x9f3b1c).circle(5, -1, 5).fill(0xffa93f)
        .moveTo(-3, -10).lineTo(2, -18).stroke({ color: 0x627039, width: 4, alpha: 0.9 });
    } else if (this.model.mutations.has('crystal')) {
      const voided = this.model.mutations.has('void');
      projectile.view.poly([-42, 0, -14, -6, -14, 6]).fill({ color: voided ? 0xa849e6 : 0x5edff2, alpha: 0.2 })
        .poly([-21, 0, -5, -15, 24, 0, -5, 15]).fill(0x68e5f7)
        .poly([-8, -5, 18, 0, -8, 5]).fill(0xffffff);
      if (voided) projectile.view.moveTo(-12, -8).lineTo(13, 0).lineTo(-12, 8).stroke({ color: 0xa643df, width: 4, alpha: 0.9 });
    } else if (this.model.mutations.has('void')) {
      projectile.view.poly([-34, 0, -10, -5, -10, 5]).fill({ color: 0xa648e4, alpha: 0.2 })
        .circle(0, 0, 11).fill(0x32164b).circle(2, 0, 6).fill(0xc76dff).circle(4, -2, 2).fill(0xffffff);
    } else {
      projectile.view.poly([-28, 0, -9, -4, -9, 4]).fill({ color: 0xaeb8ff, alpha: 0.16 })
        .circle(0, 0, 8).fill(0xe5e8ff).circle(0, 0, 13).stroke({ color: 0x9fa9ff, width: 3, alpha: 0.38 });
    }
    projectile.view.position.set(projectile.sx, projectile.sy);
    projectile.view.scale.set(this.m06?.arena.player.stats.projectileScale ?? 1);
    projectile.view.visible = true;
    this.creaturePunch = Math.max(this.creaturePunch, kind === 'power' ? 1.2 : 0.55);
    if (kind === 'normal') this.audio.play(this.model.mutations.has('pumpkin') ? 'pumpkinShot' : 'normalAttack');
    if (extraIndex === 0 && (kind === 'normal' || kind === 'power')) {
      const count = Math.min(5, this.m06?.arena.player.stats.projectileCount ?? 1);
      for (let index = 1; index < count; index += 1) this.schedule(() => this.launchProjectile(kind === 'power' ? 'wingVolley' : 'normal', sourceKind, index), 55 * index);
    }
  }

  private update(deltaMs: number): void {
    const now = performance.now();
    this.elapsedMs = this.model.elapsedMs(now);
    this.ui.update(
      this.model.bossHp,
      this.model.maxHp,
      this.elapsedMs,
      this.model.powerCooldownRemaining(now),
      !this.inEventHub && this.model.phase === 'playing' && !this.powerInFlight,
    );
    const arena = this.m06?.arena;
    if (arena) {
      this.ui.updateArena(arena.player.hp, arena.player.maxHp, arena.runLevel, arena.runXp, arena.xpToNext, arena.bossCycle, arena.dashCooldownMs);
    }

    if (this.hitStopMs > 0) {
      this.hitStopMs -= deltaMs;
      return;
    }

    if (arena && !this.inEventHub) {
      arena.update(deltaMs, this.movementInput, now);
      this.arenaLayer.updateCamera(deltaMs, arena);
      const point = this.arenaLayer.toScreen(arena.player.position);
      this.creatureBaseX = point.x; this.creatureBaseY = point.y;
      this.arenaLayer.sync(arena, now / 1000, deltaMs);
      this.autosaveMs += deltaMs;
      if (this.autosaveMs >= GAME_CONFIG.arena.autosaveIntervalMs) { this.autosaveMs = 0; this.m06?.saveSnapshot?.(arena.snapshot(now)); }
    }

    this.animateScene(deltaMs, now);
    this.effects.update(deltaMs);
    this.updateProjectiles(deltaMs, now);

    if (!this.inEventHub && this.model.phase === 'playing') {
      this.autoAttackMs -= deltaMs;
      if (this.autoAttackMs <= 0) {
        this.autoAttackMs += this.model.attackIntervalMs;
        this.launchProjectile('normal');
      }
      if (this.echoDelayMs >= 0) {
        this.echoDelayMs -= deltaMs;
        if (this.echoDelayMs <= 0) {
          this.echoDelayMs = -1;
          this.launchProjectile('voidEcho', this.echoSource);
        }
      }
      if (this.volleyDelayMs >= 0) {
        this.volleyDelayMs -= deltaMs;
        if (this.volleyDelayMs <= 0) {
          this.volleyDelayMs = -1;
          this.launchProjectile('wingVolley', 'power');
        }
      }
      if (this.pumpkinDelayMs >= 0) {
        this.pumpkinDelayMs -= deltaMs;
        if (this.pumpkinDelayMs <= 0) {
          this.pumpkinDelayMs = -1;
          this.launchProjectile('pumpkinBurst', this.pumpkinSource);
        }
      }
    }
    if (this.transition) this.updateTransition(deltaMs);
    if (this.model.phase === 'result') this.updateResult(deltaMs);
  }

  private animateScene(deltaMs: number, now: number): void {
    const seconds = now / 1000;
    if (this.model.phase !== 'result' && this.m06?.arena) {
      const pose = this.bossWorldPresentation.pose(this.arenaLayer.camera, this.m06.arena.player.position, this.width, this.height, this.portrait, this.m06.arena.bossWorld.position);
      this.bossBaseX = pose.x;
      this.bossBaseY = pose.y;
      this.bossBaseScale = pose.scale;
      const depth = this.depthSystem.bossAndPlayer(this.m06.arena.bossWorld.position, this.m06.arena.player.position);
      this.boss.zIndex = depth.boss;
      this.creature.zIndex = depth.player;
    }
    const breath = 1 + Math.sin(seconds * 1.45) * 0.009;
    const activeAttack=this.m06?.arena.bossAttacks.active[0];
    let attackLift=0,attackSquash=0,attackLean=0;
    if(activeAttack){
      const definition=BOSS_ATTACKS[activeAttack.kind];
      if(activeAttack.phase==='telegraph'){
        const progress=Math.min(1,activeAttack.elapsedMs/definition.telegraphMs);
        const anticipation=Math.sin(progress*Math.PI*.5);
        attackLift=-10*anticipation;
        attackLean=(activeAttack.direction.x||0)*.026*anticipation;
      }else if(activeAttack.phase==='impact'){attackSquash=.055;attackLift=8}
    }
    const facingLean=this.m06?.arena?Math.max(-.5,Math.min(.5,(this.creatureBaseX-this.bossBaseX)/Math.max(1,this.width)))*.035:0;
    this.boss.scale.set(this.bossBaseScale * breath * (1 + this.bossRecoil * 0.018+attackSquash), this.bossBaseScale * (2 - breath) * (1 - this.bossRecoil * 0.012-attackSquash*.72));
    this.boss.x = this.bossBaseX + this.bossRecoil * 8;
    this.boss.y = this.bossBaseY + Math.sin(seconds * 1.45) * 2 * this.bossBaseScale+attackLift*this.bossBaseScale;
    this.boss.rotation=facingLean+attackLean-this.bossRecoil*.003;
    this.bossRecoil = Math.max(0, this.bossRecoil - deltaMs / 130);
    this.bossFlash.alpha = Math.max(0, this.bossFlash.alpha - deltaMs / 95);
    const damageStage = this.visualState.damageStage;
    const coreSpeed = damageStage === 'critical' ? 7.4 : damageStage === 'fractured' ? 5.4 : 4.2;
    const coreAmplitude = damageStage === 'critical' ? 0.19 : damageStage === 'fractured' ? 0.14 : 0.11;
    const corePulse = 1 + Math.sin(seconds * coreSpeed) * coreAmplitude;
    this.coreGlow.scale.set(corePulse);
    this.coreGlow.alpha = 0.7 + Math.sin(seconds * coreSpeed) * 0.18;
    const cycle = this.m06?.arena.bossCycle ?? 1;
    this.bossRimLight.tint = cycle === 3 ? 0x9f4d72 : cycle === 2 ? 0xb46c58 : 0xffffff;
    this.bossEventLayer.alpha = Math.min(1, .68 + cycle * .1 + (1 - this.model.bossHp / this.model.maxHp) * .14);
    this.bossFallbackArt.rotation = Math.sin(seconds * 1.17) * .004 * cycle;

    const creatureBreath = 1 + Math.sin(seconds * 3.1) * 0.014;
    const punch = Math.max(0, this.creaturePunch);
    const evolution = this.model.mutations.size === 2 ? evolutionFor(this.model.mutations).id : undefined;
    const progressScale = evolution ? EVOLUTION_VISUALS[evolution].renderScale : 1 + this.model.mutations.size * 0.07;
    const cameraScale = this.model.phase === 'result' ? 1 : this.arenaLayer.camera.zoom / GAME_CONFIG.arena.cameraDefaultZoom;
    const arenaPlayer = this.m06?.arena.player;
    const locomotion = this.creatureLocomotion.update(deltaMs, this.m06?.arena.lastMovementFrame, arenaPlayer?.velocity.x ?? 0, arenaPlayer?.stats.moveSpeed ?? 1);
    this.creature.scale.set(
      this.creatureBaseScale * cameraScale * progressScale * (creatureBreath + punch * 0.08) * locomotion.scaleX,
      this.creatureBaseScale * cameraScale * progressScale * (2 - creatureBreath - punch * 0.11) * locomotion.scaleY,
    );
    const moveSpeed = this.model.phase !== 'result' && this.m06?.arena ? Math.hypot(this.m06.arena.player.velocity.x, this.m06.arena.player.velocity.y) : 0;
    const moveRatio = this.m06?.arena ? Math.min(1, moveSpeed / Math.max(1, this.m06.arena.player.stats.moveSpeed)) : 0;
    const wingLift = this.wingMutation.visible ? -5 + Math.sin(seconds * 3.4) * 4 : 0;
    this.creature.x = this.creatureBaseX;
    this.creature.y = this.creatureBaseY + locomotion.offsetY + wingLift + punch * 7;
    this.creature.rotation = locomotion.rotation + Math.sin(seconds * 2) * 0.006 - punch * 0.025;
    this.creaturePunch = Math.max(0, this.creaturePunch - deltaMs / 190);
    const hovering = this.wingMutation.visible || evolution === 'skyshard' || evolution === 'nightwing' || evolution === 'hollowwing';
    this.creatureShadow.scale.set((hovering ? 0.78 : 1) * locomotion.shadowScaleX, (hovering ? 0.72 : 1) * locomotion.shadowScaleY);
    this.creatureShadow.alpha = hovering ? 0.32 : locomotion.shadowAlpha;
    if (this.wingMutation.visible && this.visualState.sequence !== 'mutation') {
      const flap = 1 + Math.sin(seconds * 5.6) * 0.035;
      this.wingMutation.scale.set(flap, 2 - flap);
      this.wingMutation.rotation = Math.sin(seconds * 4.2) * 0.025;
    }
    if (this.visualState.sequence !== 'mutation') {
      if (this.crystalMutation.visible) this.crystalMutation.scale.set(1 + Math.sin(seconds * 2.1) * 0.008);
      if (this.pumpkinMutation.visible) this.pumpkinMutation.scale.set(1 + Math.sin(seconds * 4.4) * 0.012);
      if (this.voidMutation.visible) this.voidMutation.alpha = 0.9 + Math.sin(seconds * 3.7) * 0.08;
      if (this.creatureProductionEvolution.visible) {
        this.creatureProductionEvolution.y = Math.sin(seconds * 2.8) * (hovering ? 3 : 1.5);
        this.creatureProductionEvolution.rotation = Math.sin(seconds * 1.7) * 0.009;
      }
    }
    if (this.creatureAura.visible) {
      this.creatureAura.rotation -= deltaMs * 0.00025;
      this.creatureAura.alpha = 0.56 + Math.sin(seconds * 3.8) * 0.15;
    }
    this.powerGrowth.rotation += deltaMs * 0.0009;
    this.movementDustMs -= deltaMs;
    if (locomotion.dust && this.movementDustMs <= 0 && !this.quality.reducedEffects) {
      this.movementDustMs = this.quality.name === 'low' ? 170 : 105;
      this.effects.trail(this.creatureBaseX, this.creatureBaseY + 20, this.model.isEventRun ? 0xb26a48 : 0x7787aa, 4 + moveRatio * 3);
    }
    this.flashAlpha = Math.max(0, this.flashAlpha - deltaMs / 180);
    this.screenFlash.alpha = this.flashAlpha;

    this.shakeMs = Math.max(0, this.shakeMs - deltaMs);
    if (this.shakeMs > 0) {
      this.world.position.set(visualRandom.centered(this.shakeStrength), visualRandom.centered(this.shakeStrength));
    } else {
      this.world.position.set(0, 0);
    }

    this.motes.forEach((mote, index) => {
      if (!mote.visible) return;
      mote.y -= deltaMs * (0.006 + (index % 4) * 0.002);
      mote.alpha = 0.18 + (Math.sin(seconds * 1.4 + index) + 1) * 0.18;
      if (mote.y < -10) mote.y = this.height + 10;
    });
  }

  private updateProjectiles(deltaMs: number, now: number): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      projectile.elapsed += deltaMs;
      const progress = Math.min(1, projectile.elapsed / projectile.duration);
      const eased = 1 - Math.pow(1 - progress, 2);
      projectile.view.x = lerp(projectile.sx, projectile.tx, eased);
      projectile.view.y = lerp(projectile.sy, projectile.ty, eased) - Math.sin(progress * Math.PI) * (projectile.kind === 'power' ? 75 : 42);
      projectile.view.rotation = Math.atan2(projectile.ty - projectile.view.y, projectile.tx - projectile.view.x);
      projectile.trailElapsed += deltaMs;
      if (progress > 0.08 && projectile.trailElapsed >= this.quality.profile.trailIntervalMs) {
        projectile.trailElapsed = 0;
        const trailColor = projectile.kind === 'voidEcho' ? 0xb94fff : projectile.kind === 'pumpkinBurst' || this.model.mutations.has('pumpkin') ? 0xff782f : projectile.kind === 'wingVolley' ? 0xffd66c : this.model.mutations.has('crystal') ? 0x68e8ff : projectile.kind === 'power' ? 0xffd968 : 0x9fa9ff;
        this.effects.trail(projectile.view.x, projectile.view.y, trailColor, projectile.kind === 'power' ? 7 : 4);
      }
      if (progress >= 1) {
        projectile.active = false;
        projectile.view.visible = false;
        const result = this.model.attack(projectile.kind, now, projectile.sourceKind);
        if (projectile.kind === 'power') this.powerInFlight = false;
        if (!result.accepted) continue;
        this.m06?.arena.onBossDamage(result.damage, now);
        this.syncBossDamageVisuals(this.visualState.updateBossHealth(this.model.bossHp, this.model.maxHp));
        this.showImpact(projectile.kind, result.damage);
        const followupsAllowed = !result.triggeredBreakpointId && !result.bossDefeated && this.model.phase === 'playing';
        if (this.model.mutations.has('void') && projectile.kind !== 'voidEcho' && projectile.kind !== 'wingVolley' && projectile.kind !== 'pumpkinBurst' && followupsAllowed) {
          this.echoDelayMs = this.model.voidEchoDelayMs;
          this.echoSource = projectile.kind === 'power' ? 'power' : 'normal';
        }
        if (this.model.mutations.has('wings') && projectile.kind === 'power' && followupsAllowed) this.volleyDelayMs = 80;
        if (this.model.mutations.has('pumpkin') && projectile.kind !== 'pumpkinBurst' && projectile.kind !== 'voidEcho' && projectile.kind !== 'wingVolley' && followupsAllowed) {
          this.pumpkinDelayMs = GAME_CONFIG.combat.pumpkinBurstDelayMs;
          this.pumpkinSource = projectile.kind === 'power' ? 'power' : 'normal';
        }
        if (result.triggeredBreakpointId) { this.m06?.arena.onBreakpoint(); this.beginBreakpointTransition(result.triggeredBreakpointId); }
        if (result.bossDefeated) this.beginFinalTransition();
      }
    }
  }

  private showImpact(kind: AttackKind, damage: number): void {
    const x = this.bossBaseX;
    const y = this.bossBaseY + this.model.activeBoss.weakpoint.y * this.bossBaseScale;
    const power = kind === 'power';
    const echo = kind === 'voidEcho';
    const volley = kind === 'wingVolley';
    const pumpkin = kind === 'pumpkinBurst';
    const color = echo ? 0xc96cff : pumpkin ? 0xff7a2e : volley ? 0xffd36c : this.model.mutations.has('crystal') ? 0x7cecff : power ? 0xffe67b : 0xffffff;
    this.effects.burst(x, y, color, power ? 20 : pumpkin ? 13 : echo ? 8 : volley ? 6 : 7, power ? 1.2 : pumpkin ? 0.9 : 0.7);
    if (pumpkin) {
      this.effects.debrisBurst(x, y, 0x6c2b19, 8, 0.65);
      this.flash(0.12);
      this.audio.play('pumpkinImpact');
    }
    if (echo && this.model.mutations.has('crystal')) this.effects.burst(x, y, 0x72e6ff, 6, 0.55);
    this.effects.damageNumber(x, y, damage, power, color);
    if (power) this.effects.shockwave(x, y, 0xffdb62, 1.15);
    this.bossRecoil = power ? 1.4 : pumpkin ? 0.85 : echo || volley ? 0.42 : 0.72;
    this.bossFlash.alpha = power ? 0.72 : 0.38;
    this.hitStopMs = power ? GAME_CONFIG.timing.powerHitStopMs : GAME_CONFIG.timing.normalHitStopMs;
    this.shake(power ? 300 : 110, power ? 12 : echo || volley ? 2.5 : 4);
    this.audio.play('bossImpact');
  }

  private beginBreakpointTransition(id: BreakpointId): void {
    if (!this.visualState.beginBreakpoint(id)) return;
    this.arenaLayer.camera.emphasize('breakpoint');
    this.clearProjectiles();
    this.powerInFlight = false;
    this.echoDelayMs = -1;
    this.volleyDelayMs = -1;
    this.pumpkinDelayMs = -1;
    this.transition = {
      kind: 'breakpoint',
      elapsed: 0,
      duration: GAME_CONFIG.timing.breakpointIntroMs,
      absorbed: false,
    };
    this.ui.setBreakpoint(id);
    this.ui.announce('CORE FRACTURED', 'CHOOSE YOUR NEXT MUTATION', '#ffb45f', 850);
    this.audio.play('bossBreak');
    if (this.model.isEventRun) this.audio.play('eventBossBreak');
    this.bossFlash.alpha = 1;
    this.bossRecoil = 1.9;
    this.flash(0.34);
    this.syncBossDamageVisuals(this.visualState.updateBossHealth(this.model.bossHp, this.model.maxHp));
    this.effects.shockwave(this.bossBaseX, this.bossBaseY, 0xff8b4b, 1.35);
    this.effects.burst(this.bossBaseX, this.bossBaseY, 0xffa057, 30, 1.15);
    this.effects.debrisBurst(this.bossBaseX, this.bossBaseY, 0x454b5c, 16, 1.15);
    this.arenaLayer.reactToImpact(BOSS_WORLD_ANCHOR, id === 'break-1' ? 520 : 720, id === 'break-1' ? 'ground-slam' : 'corruption-ring');
    this.shake(430, 15);
  }

  private selectMutation(mutation: Mutation): void {
    if (!this.model.pendingChoices.includes(mutation)) return;
    if (!this.visualState.beginMutation(mutation)) return;
    this.audio.unlock();
    this.audio.play('mutationChoice');
    this.ui.hideChoices();
    this.beginMutationTransition(mutation);
  }

  private beginMutationTransition(mutation: Mutation): void {
    this.arenaLayer.camera.emphasize('mutation');
    this.transition = { kind: 'mutation', mutation, elapsed: 0, duration: GAME_CONFIG.timing.mutationDurationMs, absorbed: false };
    const data = mutationVisual(mutation);
    this.essenceAsset?.destroy();
    this.essenceAsset = undefined;
    const lootTexture = this.assets.texture(`essence.${mutation}` as AssetKey);
    this.essenceCore.visible = !lootTexture;
    if (lootTexture) {
      this.essenceAsset = new Sprite(lootTexture);
      this.essenceAsset.anchor.set(0.5);
      const scale = 46 / Math.max(1, lootTexture.width);
      this.essenceAsset.scale.set(scale);
      this.essence.addChild(this.essenceAsset);
    }
    this.essenceCore.clear().poly([0, -19, 15, -5, 9, 17, -10, 16, -16, -4]).fill(data.color);
    this.essenceGlow.clear().circle(0, 0, 38).fill({ color: data.color, alpha: 0.2 }).circle(0, 0, 24).stroke({ color: data.light, width: 4, alpha: 0.65 });
    this.essence.position.set(this.bossBaseX, this.bossBaseY);
    this.essence.scale.set(0.1);
    this.essence.visible = true;
    this.ui.announce(data.title, data.subtitle, data.css, 1200);
    this.audio.play('essenceAbsorb');
    this.bossFlash.alpha = 1;
    this.bossRecoil = 1.25;
    this.effects.shockwave(this.bossBaseX, this.bossBaseY, data.color, 1.05);
    this.effects.burst(this.bossBaseX, this.bossBaseY, data.color, 20, 0.95);
    this.shake(260, 9);
  }

  private beginFinalTransition(): void {
    if (!this.visualState.beginKill()) return;
    this.arenaLayer.camera.emphasize('kill');
    if (!this.finalLootGranted) { this.finalLootGranted = true; this.m06?.arena.onBossDefeated(performance.now()); }
    this.clearProjectiles();
    this.powerInFlight = false;
    this.echoDelayMs = -1;
    this.volleyDelayMs = -1;
    this.pumpkinDelayMs = -1;
    this.transition = { kind: 'final', elapsed: 0, duration: GAME_CONFIG.timing.finalDurationMs, absorbed: false };
    this.ui.hideChoices();
    document.getElementById('bp-core')?.classList.add('broken');
    this.ui.announce('COLOSSUS BROKEN', 'EVOLUTION COMPLETE', '#ffe29a', 1800);
    this.audio.play(this.model.isEventRun ? 'eventBossKill' : 'bossKill');
    this.hitStopMs = GAME_CONFIG.timing.finalHitStopMs;
    this.bossFlash.alpha = 1;
    this.bossRecoil = 3;
    this.flash(0.72);
    this.syncBossDamageVisuals('defeated');
    this.effects.shockwave(this.bossBaseX, this.bossBaseY, 0xffd36b, 1.9);
    this.effects.burst(this.bossBaseX, this.bossBaseY, 0xffb65f, 58, 1.8);
    this.effects.debrisBurst(this.bossBaseX, this.bossBaseY, 0x343949, 26, 1.75);
    this.shake(760, 23);
  }

  private updateTransition(deltaMs: number): void {
    const transition = this.transition;
    if (!transition) return;
    transition.elapsed += deltaMs;
    const progress = transition.elapsed / transition.duration;
    if (transition.kind === 'breakpoint') {
      if (progress >= 1) {
        this.transition = undefined;
        if (this.visualState.showChoice()) this.ui.showChoices(this.model.pendingChoices, (mutation) => this.selectMutation(mutation));
      }
      return;
    }
    if (transition.kind === 'final') {
      this.coreGlow.scale.set(Math.max(0.05, 1 - progress));
      this.coreGem.alpha = Math.max(0, 1 - progress * 1.4);
      this.boss.alpha = Math.max(0.08, 1 - Math.max(0, progress - 0.35) * 1.45);
      if (progress >= 1) {
        this.transition = undefined;
        const now = performance.now();
        if (this.m06?.arena.advanceCycle(now)) {
          this.resetBossForCycle();
        } else if (this.visualState.beginReveal()) {
          this.model.finish(now, this.m06?.arena.resultExtras());
          this.m06?.clearSnapshot?.();
          this.audio.play('evolutionReveal');
          this.resultElapsed = 0;
        }
      }
      return;
    }
    const mutation = transition.mutation;
    if (!mutation) return;
    const flyStart = 0.16;
    const flyEnd = 0.58;
    const bossX = this.bossBaseX;
    const bossY = this.bossBaseY;
    const creatureX = this.creatureBaseX;
    const creatureY = this.creatureBaseY - 30 * this.creatureBaseScale;

    if (progress < flyStart) {
      this.essence.position.set(bossX, bossY);
      this.essence.scale.set(easeOutBack(Math.max(0, progress / flyStart)));
    } else if (progress < flyEnd) {
      const local = easeInOut((progress - flyStart) / (flyEnd - flyStart));
      this.essence.x = lerp(bossX, creatureX, local);
      this.essence.y = lerp(bossY, creatureY, local) - Math.sin(local * Math.PI) * Math.min(150, this.height * 0.12);
      this.essence.scale.set(1 + Math.sin(local * Math.PI) * 0.35);
      this.essence.rotation += deltaMs * 0.007;
      this.effects.burst(this.essence.x, this.essence.y, mutationVisual(mutation).color, 1, 0.18);
    } else if (!transition.absorbed) {
      transition.absorbed = true;
      this.essence.visible = false;
      this.creaturePunch = 2.1;
      this.effects.shockwave(creatureX, creatureY, mutationVisual(mutation).color, 1.15);
      this.effects.burst(creatureX, creatureY, mutationVisual(mutation).light, 40, 1.18);
      this.revealMutation(mutation);
      this.audio.play('essenceAbsorb');
      this.schedule(() => this.audio.play('mutationAcquire'), 180);
      this.flash(0.44);
      this.shake(520, 18);
    }

    if (transition.absorbed) {
      const local = Math.min(1, (progress - flyEnd) / Math.max(0.001, 1 - flyEnd));
      this.animateMutationReveal(mutation, local);
    }

    if (progress >= 1) {
      if (this.visualState.completeMutation(mutation)) {
        this.model.chooseMutation(mutation, performance.now());
        this.syncMutationVisuals();
        this.transition = undefined;
        this.autoAttackMs = 440;
        if (this.model.phase === 'finalizing') this.beginFinalTransition();
      }
    }
  }

  private resetBossForCycle(): void {
    this.finalLootGranted = false;
    this.visualState.reset(); this.boss.alpha = 1; this.coreGlow.scale.set(1); this.coreGem.alpha = 1;
    document.getElementById('bp-core')?.classList.remove('broken');
    this.ui.setBreakpoint('break-1', false); this.ui.setBreakpoint('break-2', false);
    this.syncBossDamageVisuals('intact'); this.autoAttackMs = 550;
  }

  private revealMutation(mutation: Mutation): void {
    if (mutation === 'crystal') {
      this.crystalMutation.visible = true;
      this.crystalMutation.scale.set(0.01);
    } else if (mutation === 'void') {
      this.voidMutation.visible = true;
      this.voidMutation.alpha = 0;
    } else if (mutation === 'wings') {
      this.wingMutation.visible = true;
      this.wingMutation.scale.set(0.01);
    } else {
      this.pumpkinMutation.visible = true;
      this.pumpkinMutation.scale.set(0.01);
    }
  }

  private syncMutationVisuals(): void {
    (['crystal', 'void', 'wings', 'pumpkin'] as Mutation[]).forEach((mutation) => this.ui.setMutation(mutation, false));
    this.crystalMutation.visible = false;
    this.voidMutation.visible = false;
    this.wingMutation.visible = false;
    this.pumpkinMutation.visible = false;
    if (this.model.mutations.has('crystal')) {
      this.crystalMutation.visible = true;
      this.crystalMutation.scale.set(1);
      this.ui.setMutation('crystal');
    }
    if (this.model.mutations.has('void')) {
      this.voidMutation.visible = true;
      this.voidMutation.alpha = 1;
      this.ui.setMutation('void');
    }
    if (this.model.mutations.has('wings')) {
      this.wingMutation.visible = true;
      this.wingMutation.scale.set(1);
      this.ui.setMutation('wings');
    }
    if (this.model.mutations.has('pumpkin')) {
      this.pumpkinMutation.visible = true;
      this.pumpkinMutation.scale.set(1);
      this.ui.setMutation('pumpkin');
    }
    const tint = this.model.mutations.has('pumpkin')
      ? 0xffe1c4
      : this.model.mutations.has('void')
        ? 0xe5d8ff
        : this.model.mutations.has('crystal')
          ? 0xdffaff
          : 0xffffff;
    this.creatureFallbackBase.tint = tint;
    this.creatureProductionBase.tint = tint;
    this.syncFusionVisuals();
    this.syncPowerGrowth();
  }

  private syncPowerGrowth(): void {
    const arena = this.m06?.arena; this.powerGrowth.clear(); if (!arena) return;
    const visible = arena.selectedUpgrades.filter((selected) => RUN_UPGRADES.find((upgrade) => upgrade.id === selected.id)?.visualModifier);
    const count = Math.min(4, Math.max(0, arena.runLevel - 1, visible.length));
    const color = this.model.mutations.has('pumpkin') ? 0xff8a3b : this.model.mutations.has('void') ? 0xbc5fff : this.model.mutations.has('crystal') ? 0x68eaff : 0x91a5ff;
    for (let i = 0; i < count; i += 1) { const angle = i / Math.max(1, count) * Math.PI * 2; this.powerGrowth.poly([Math.cos(angle) * 105, Math.sin(angle) * 52 - 12, Math.cos(angle) * 112 + 6, Math.sin(angle) * 58 - 5, Math.cos(angle) * 99 - 5, Math.sin(angle) * 47]).fill({ color, alpha: 0.78 }); }
    this.powerGrowth.visible = count > 0;
  }

  private animateMutationReveal(mutation: Mutation, progress: number): void {
    const scale = easeOutBack(progress);
    if (mutation === 'crystal') this.crystalMutation.scale.set(scale);
    else if (mutation === 'void') this.voidMutation.alpha = Math.min(1, progress * 1.8);
    else if (mutation === 'wings') this.wingMutation.scale.set(scale);
    else this.pumpkinMutation.scale.set(scale);
  }

  private syncFusionVisuals(): void {
    this.fusionGraphics.clear();
    this.fusionMutation.visible = false;
    this.creatureAura.clear();
    this.creatureAura.visible = false;
    this.powerGrowth.clear();
    const productionEvolution = this.syncEvolutionProductionVisual();
    if (this.model.mutations.size < 2) return;

    const evolution = evolutionFor(this.model.mutations);
    const visual = EVOLUTION_VISUALS[evolution.id];
    this.fusionMutation.visible = true;
    this.creatureAura.visible = true;
    this.creatureAura.circle(0, -7, 136).fill({ color: visual.accent, alpha: 0.048 })
      .circle(0, -7, 112).stroke({ color: visual.secondary, width: 4, alpha: 0.2 });
    if (productionEvolution) return;
    if (evolution.id === 'voidshard') {
      this.fusionGraphics
        .poly([-76, -44, -49, -83, -18, -71, -33, -23, -72, -6]).fill({ color: 0x28203f, alpha: 0.9 })
        .poly([74, -47, 45, -83, 18, -67, 35, -21, 73, -8]).fill({ color: 0x241d3a, alpha: 0.9 })
        .poly([-35, -124, -17, -153, -2, -108]).fill(0xd15cff)
        .poly([35, -105, 58, -129, 61, -83]).fill(0x8e3ce3)
        .moveTo(-73, -28).quadraticCurveTo(0, -58, 76, -25).stroke({ color: 0xba4fff, width: 7, alpha: 0.72 })
        .circle(-54, 34, 6).fill(0x68eaff).circle(55, 31, 6).fill(0xc45cff);
    } else if (evolution.id === 'skyshard') {
      this.fusionGraphics
        .poly([-54, -61, -14, -82, 16, -74, 49, -57, 27, -30, -31, -31]).fill({ color: 0xd7f7ff, alpha: 0.54 })
        .poly([-81, -50, -123, -85, -106, -35]).fill({ color: 0x83efff, alpha: 0.9 })
        .poly([81, -50, 123, -85, 106, -35]).fill({ color: 0x83efff, alpha: 0.9 })
        .moveTo(-125, -66).lineTo(-166, -91).moveTo(125, -66).lineTo(166, -91).stroke({ color: 0xffdf7b, width: 5, alpha: 0.72 });
    } else if (evolution.id === 'nightwing') {
      this.fusionGraphics
        .poly([-73, -23, -51, -75, -14, -68, 0, -39, 16, -69, 52, -75, 74, -20, 43, 4, -44, 4]).fill({ color: 0x21152f, alpha: 0.88 })
        .moveTo(-43, -43).bezierCurveTo(-94, -80, -130, -70, -157, -22).stroke({ color: 0xd05dff, width: 8, alpha: 0.75 })
        .moveTo(43, -43).bezierCurveTo(94, -80, 130, -70, 157, -22).stroke({ color: 0xd05dff, width: 8, alpha: 0.75 })
        .poly([-13, -76, 0, -98, 13, -76, 0, -57]).fill(0xc158ff)
        .circle(0, 39, 8).fill(0xffce69);
    } else if (evolution.id === 'jack-o-void') {
      this.fusionGraphics
        .poly([-78, -29, -58, -75, -12, -88, 39, -72, 78, -29, 61, 26, 18, 51, -31, 45, -67, 18]).fill({ color: 0x3c1820, alpha: 0.72 })
        .moveTo(-74, -42).bezierCurveTo(-122, -79, -137, -27, -102, 9).stroke({ color: 0x9e48e8, width: 10, alpha: 0.8 })
        .moveTo(74, -42).bezierCurveTo(122, -79, 137, -27, 102, 9).stroke({ color: 0x9e48e8, width: 10, alpha: 0.8 })
        .circle(-47, 15, 7).fill(0xffb04a).circle(48, 11, 7).fill(0xc45cff);
    } else if (evolution.id === 'harvestshard') {
      this.fusionGraphics
        .poly([-70, -31, -42, -78, 1, -88, 49, -69, 73, -23, 48, 31, 0, 52, -48, 30]).fill({ color: 0x864022, alpha: 0.44 })
        .poly([-78, -37, -112, -76, -96, -13]).fill(0x68dded)
        .poly([76, -42, 111, -81, 96, -18]).fill(0x7d6ef6)
        .moveTo(-60, 31).quadraticCurveTo(0, 53, 62, 27).stroke({ color: 0xffa340, width: 7, alpha: 0.82 });
    } else {
      this.fusionGraphics
        .poly([-68, -28, -42, -70, 0, -84, 44, -68, 70, -24, 43, 28, 0, 45, -44, 27]).fill({ color: 0x4b2220, alpha: 0.56 })
        .moveTo(-50, -46).bezierCurveTo(-111, -98, -159, -76, -171, -15).stroke({ color: 0xff7830, width: 8, alpha: 0.75 })
        .moveTo(50, -46).bezierCurveTo(111, -98, 159, -76, 171, -15).stroke({ color: 0xff7830, width: 8, alpha: 0.75 })
        .moveTo(-129, -49).lineTo(-88, -28).moveTo(129, -49).lineTo(88, -28).stroke({ color: 0x6925a0, width: 5, alpha: 0.78 });
    }
  }

  private syncBossDamageVisuals(stage: BossDamageStage): void {
    const exactProductionStage = this.syncBossProductionVisual(stage);
    this.bossDamageFractured.visible = !exactProductionStage && stage !== 'intact';
    this.bossDamageCritical.visible = !exactProductionStage && (stage === 'critical' || stage === 'defeated');
    this.bossLeftPlate.position.set(stage === 'critical' || stage === 'defeated' ? -12 : stage === 'fractured' ? -5 : 0, stage === 'critical' || stage === 'defeated' ? 9 : 0);
    this.bossLeftPlate.rotation = stage === 'critical' || stage === 'defeated' ? -0.09 : stage === 'fractured' ? -0.035 : 0;
    this.bossRightPlate.position.set(stage === 'critical' || stage === 'defeated' ? 16 : stage === 'fractured' ? 6 : 0, stage === 'critical' || stage === 'defeated' ? 14 : 0);
    this.bossRightPlate.rotation = stage === 'critical' || stage === 'defeated' ? 0.13 : stage === 'fractured' ? 0.04 : 0;
    this.bossRightPlate.alpha = stage === 'defeated' ? 0.22 : stage === 'critical' ? 0.58 : 1;
    this.bossLeftPlate.alpha = stage === 'defeated' ? 0.3 : stage === 'critical' ? 0.76 : 1;
    this.coreGem.tint = stage === 'critical' || stage === 'defeated' ? 0xffd38b : 0xffffff;
  }

  private flash(strength: number): void {
    this.flashAlpha = Math.max(this.flashAlpha, strength);
  }

  private updateResult(deltaMs: number): void {
    this.resultElapsed += deltaMs;
    const t = Math.min(1, this.resultElapsed / 800);
    const targetX = this.width / 2;
    const targetY = this.height * (this.portrait ? 0.47 : 0.48);
    this.creature.x = lerp(this.creatureBaseX, targetX, easeInOut(t));
    this.creature.y = lerp(this.creatureBaseY, targetY, easeInOut(t));
    const evolution = this.model.mutations.size === 2 ? evolutionFor(this.model.mutations).id : undefined;
    const identityScale = evolution ? EVOLUTION_VISUALS[evolution].renderScale : 1;
    // Arena scale is deliberately small; reveal scale stays hero-sized and independent.
    const heroBaseScale = this.portrait ? Math.min(0.86, this.width / 620) : Math.min(0.82, this.height / 760);
    const revealScale = heroBaseScale * (this.portrait ? 1.92 : 1.62) * identityScale;
    const currentScale = lerp(this.creatureBaseScale, revealScale, easeOutBack(t));
    this.creature.scale.set(currentScale);
    this.boss.alpha = Math.max(0.05, 1 - t * 0.93);
    this.background.alpha = 1 - t * 0.28;
    this.arenaBack.alpha = 1 - t * 0.55;
    this.arenaFloor.alpha = 1 - t * 0.48;
    if (evolution === 'skyshard') this.creature.y += Math.sin(this.resultElapsed * 0.004) * 2.5;
    if (evolution === 'nightwing' || evolution === 'hollowwing') this.creature.rotation = Math.sin(this.resultElapsed * 0.006) * 0.018;
    if (evolution === 'jack-o-void') this.creature.scale.set(currentScale * (1 + Math.sin(this.resultElapsed * 0.005) * 0.018));
  }

  private openEventHub(): void {
    if (!this.eventRuntime?.enabled) return;
    this.inEventHub = true;
    this.clearProjectiles();
    this.model.pause(performance.now());
    this.ui.reset();
    this.ui.showEventHub(this.eventRuntime.definition, this.eventRuntime.progress.state, this.eventRuntime.lastOutcome);
  }

  private startEventRun(): void {
    if (!this.eventRuntime?.enabled) return;
    const now = performance.now();
    if (this.model.phase === 'result') {
      this.model.reset(now);
      this.m06?.arena.reset();
      this.resetVisualsAfterModelReset();
    }
    this.inEventHub = false;
    this.ui.hideEventHub();
    this.model.resume(now);
    this.audio.unlock();
  }

  private syncEventPresentation(): void {
    const eventEnabled = this.eventRuntime?.enabled ?? false;
    document.body.classList.toggle('halloween-event', eventEnabled);
    const bossName = document.getElementById('boss-name');
    if (bossName) bossName.textContent = eventEnabled ? 'HARVEST COLOSSUS' : 'FRACTURED COLOSSUS';
    const pumpkinBadge = document.getElementById('mut-pumpkin');
    if (pumpkinBadge) pumpkinBadge.hidden = !eventEnabled;
    if (this.backgroundAsset) this.backgroundAsset.visible = !eventEnabled;
    if (this.halloweenBackgroundAsset) this.halloweenBackgroundAsset.visible = eventEnabled;
    if (this.halloweenForegroundAsset) this.halloweenForegroundAsset.visible = eventEnabled;
    this.bossEventLayer.visible = eventEnabled;
    this.coreGlow.tint = eventEnabled ? 0xff8c54 : 0xffffff;
    this.syncBossProductionVisual(this.visualState.damageStage);
    this.resize();
  }

  private reset(): void {
    window.clearTimeout(this.resultTimeout);
    this.clearTemporaryTimers();
    this.model.reset(performance.now());
    this.m06?.arena.reset();
    this.m06?.clearSnapshot?.();
    this.inEventHub = false;
    this.ui.hideEventHub();
    this.resetVisualsAfterModelReset();
  }

  private resetVisualsAfterModelReset(): void {
    this.elapsedMs = 0;
    this.autoAttackMs = 350;
    this.hitStopMs = 0;
    this.shakeMs = 0;
    this.bossRecoil = 0;
    this.creaturePunch = 0;
    this.powerInFlight = false;
    this.echoDelayMs = -1;
    this.volleyDelayMs = -1;
    this.pumpkinDelayMs = -1;
    this.transition = undefined;
    this.finalLootGranted = false;
    this.autosaveMs = 0;
    this.resultElapsed = 0;
    this.visualState.reset();
    this.flashAlpha = 0;
    this.screenFlash.alpha = 0;
    this.boss.alpha = 1;
    this.coreGlow.scale.set(1);
    this.coreGem.alpha = 1;
    this.background.alpha = 1;
    this.arenaBack.alpha = 1;
    this.arenaFloor.alpha = 1;
    this.crystalMutation.visible = false;
    this.crystalMutation.scale.set(0.01);
    this.voidMutation.visible = false;
    this.voidMutation.alpha = 0;
    this.wingMutation.visible = false;
    this.wingMutation.scale.set(0.01);
    this.pumpkinMutation.visible = false;
    this.pumpkinMutation.scale.set(0.01);
    this.fusionMutation.visible = false;
    this.creatureAura.visible = false;
    this.creatureBody.visible = true;
    this.creatureProductionEvolution.visible = false;
    this.creatureProductionEvolution.removeChildren();
    this.evolutionProductionSprite?.destroy();
    this.evolutionProductionSprite = undefined;
    this.creatureFallbackBase.tint = 0xffffff;
    this.creatureProductionBase.tint = 0xffffff;
    this.essence.visible = false;
    this.clearProjectiles();
    this.effects.clearAll();
    this.arenaLayer.clearTransient();
    this.ui.reset();
    this.ui.setSeed(this.model.seed);
    this.syncBossDamageVisuals('intact');
    this.resize();
  }

  private clearProjectiles(): void {
    for (const projectile of this.projectiles) {
      projectile.active = false;
      projectile.view.visible = false;
    }
  }

  private schedule(callback: () => void, delayMs: number): void {
    const timer = window.setTimeout(() => {
      this.temporaryTimers.delete(timer);
      callback();
    }, delayMs);
    this.temporaryTimers.add(timer);
  }

  private clearTemporaryTimers(): void {
    for (const timer of this.temporaryTimers) window.clearTimeout(timer);
    this.temporaryTimers.clear();
  }

  private shake(durationMs: number, strength: number): void {
    this.shakeMs = Math.max(this.shakeMs, durationMs);
    this.shakeStrength = Math.max(this.shakeStrength, strength);
  }

  resize(): void {
    this.width = this.app.screen.width;
    this.height = this.app.screen.height;
    this.portrait = this.height >= this.width;
    const halloween = this.model.isEventRun;
    const moonX=this.width*(this.portrait ? .72 : .78),moonY=this.height*(this.portrait ? .18 : .24),moonRadius=Math.min(this.width*.24,this.height*.13);
    this.background.clear()
      .rect(0, 0, this.width, this.height).fill(halloween ? 0x080811 : 0x090b16)
      .circle(moonX,moonY,moonRadius*1.08).fill({color:halloween?0x6e4b58:0x23172e,alpha:.16})
      .circle(moonX,moonY,moonRadius).fill({color:halloween?0xc19a89:0x272038,alpha:halloween?.18:.12})
      .circle(moonX-moonRadius*.27,moonY-moonRadius*.16,moonRadius*.18).fill({color:0x342c3b,alpha:.16})
      .circle(moonX+moonRadius*.32,moonY+moonRadius*.22,moonRadius*.12).fill({color:0x342c3b,alpha:.13})
      .rect(0, this.height * 0.68, this.width, this.height * 0.32).fill({ color: halloween ? 0x100d17 : 0x111522, alpha: 0.95 });
    for (let line = 0; line < 6; line += 1) {
      const y = this.height * (0.7 + line * 0.055);
      this.background.moveTo(0, y).lineTo(this.width, y).stroke({ color: 0x65708c, width: 1, alpha: 0.11 });
    }
    const horizon = this.height * (this.portrait ? 0.61 : 0.66);
    this.arenaBack.clear()
      .rect(0, horizon - this.height * 0.22, this.width, this.height * 0.23).fill({ color: halloween ? 0x100d18 : 0x111423, alpha: 0.52 })
      .poly([0, horizon, this.width * 0.08, horizon - this.height * 0.13, this.width * 0.12, horizon, this.width * 0.22, horizon - this.height * 0.08, this.width * 0.31, horizon, this.width * 0.45, horizon - this.height * 0.11, this.width * 0.57, horizon, this.width * 0.72, horizon - this.height * 0.08, this.width * 0.81, horizon, this.width * 0.91, horizon - this.height * 0.14, this.width, horizon]).fill({ color: halloween ? 0x0b0910 : 0x141726, alpha: 0.9 })
      .rect(this.width * 0.06, horizon - this.height * 0.19, this.width * 0.08, this.height * 0.21).fill({ color: halloween ? 0x15121b : 0x1a1d2d, alpha: 0.82 })
      .rect(this.width * 0.86, horizon - this.height * 0.24, this.width * 0.09, this.height * 0.26).fill({ color: halloween ? 0x15111b : 0x191c2c, alpha: 0.82 })
      .circle(this.width * 0.5, horizon - this.height * 0.04, this.width * 0.32).stroke({ color: halloween ? 0xff7a36 : 0x6a4b78, width: Math.max(4, this.width * 0.012), alpha: halloween ? 0.12 : 0.08 });
    if (halloween) {
      this.arenaBack
        .moveTo(this.width * 0.04, horizon).bezierCurveTo(this.width * 0.02, horizon - this.height * 0.2, this.width * 0.19, horizon - this.height * 0.17, this.width * 0.13, horizon - this.height * 0.31).stroke({ color: 0x130f17, width: Math.max(10, this.width * 0.035), alpha: 0.98 })
        .moveTo(this.width * 0.96, horizon).bezierCurveTo(this.width * 0.97, horizon - this.height * 0.18, this.width * 0.81, horizon - this.height * 0.2, this.width * 0.87, horizon - this.height * 0.33).stroke({ color: 0x130f17, width: Math.max(10, this.width * 0.035), alpha: 0.98 })
        .circle(this.width * 0.12, horizon - this.height * 0.035, Math.max(5, this.width * 0.013)).fill({ color: 0xff742e, alpha: 0.72 })
        .circle(this.width * 0.88, horizon - this.height * 0.055, Math.max(6, this.width * 0.015)).fill({ color: 0xff8a38, alpha: 0.68 });
    }
    this.arenaForeground.clear()
      .ellipse(this.width * 0.18, this.height * 1.015, this.width * 0.34, this.height * 0.115).fill({ color: 0x03040a, alpha: 0.76 })
      .ellipse(this.width * 0.83, this.height * 1.02, this.width * 0.36, this.height * 0.12).fill({ color: 0x03040a, alpha: 0.78 })
      .ellipse(this.width * 0.5, this.height * 0.98, this.width * 0.62, this.height * 0.045).fill({ color: halloween ? 0x241528 : 0x171a2b, alpha: halloween ? 0.2 : 0.15 });
    if (halloween) {
      this.arenaForeground
        .moveTo(0, this.height).bezierCurveTo(this.width * 0.03, this.height * 0.86, this.width * 0.13, this.height * 0.94, this.width * 0.2, this.height * 0.82).stroke({ color: 0x17101a, width: Math.max(8, this.width * 0.022), alpha: 0.9 })
        .moveTo(this.width, this.height).bezierCurveTo(this.width * 0.96, this.height * 0.87, this.width * 0.87, this.height * 0.94, this.width * 0.8, this.height * 0.83).stroke({ color: 0x17101a, width: Math.max(8, this.width * 0.022), alpha: 0.9 });
    }
    this.arenaFloor.clear()
      .ellipse(this.width * 0.5, this.height * 0.82, this.width * 0.55, this.height * 0.15).fill({ color: halloween ? 0x17131e : 0x171b29, alpha: 0.78 })
      .ellipse(this.width * (this.portrait ? 0.5 : 0.27), this.height * (this.portrait ? 0.8 : 0.72), Math.min(170, this.width * 0.32), Math.min(48, this.height * 0.04)).stroke({ color: halloween ? 0xff7934 : 0x8b70ac, width: 2, alpha: halloween ? 0.22 : 0.13 });
    if (halloween) {
      for (let crack = 0; crack < 5; crack += 1) {
        const x = this.width * (0.16 + crack * 0.17);
        const y = this.height * (0.77 + (crack % 2) * 0.045);
        this.arenaFloor.moveTo(x, y).lineTo(x + this.width * 0.045, y + 12).lineTo(x + this.width * 0.075, y - 4).stroke({ color: crack % 2 ? 0x7b2e73 : 0xd34f28, width: 2, alpha: 0.22 });
      }
    }
    const edge = Math.max(22, Math.min(this.width, this.height) * 0.07);
    this.vignette.clear()
      .rect(0, 0, this.width, edge).fill({ color: 0x02030a, alpha: 0.26 })
      .rect(0, this.height - edge, this.width, edge).fill({ color: 0x02030a, alpha: 0.34 })
      .rect(0, 0, edge, this.height).fill({ color: 0x02030a, alpha: 0.2 })
      .rect(this.width - edge, 0, edge, this.height).fill({ color: 0x02030a, alpha: 0.2 });
    this.screenFlash.clear().rect(0, 0, this.width, this.height).fill(0xfff4d6);
    this.screenFlash.alpha = this.flashAlpha;
    if (this.backgroundAsset) {
      const scale = Math.max(this.width / this.backgroundAsset.texture.width, this.height / this.backgroundAsset.texture.height);
      this.backgroundAsset.scale.set(scale);
      this.backgroundAsset.position.set((this.width - this.backgroundAsset.width) / 2, (this.height - this.backgroundAsset.height) / 2);
    }
    if (this.halloweenBackgroundAsset) {
      const scale = Math.max(this.width / this.halloweenBackgroundAsset.texture.width, this.height / this.halloweenBackgroundAsset.texture.height);
      this.halloweenBackgroundAsset.scale.set(scale);
      this.halloweenBackgroundAsset.position.set((this.width - this.halloweenBackgroundAsset.width) / 2, (this.height - this.halloweenBackgroundAsset.height) / 2);
    }
    if (this.halloweenForegroundAsset) {
      const scale = Math.max(this.width / this.halloweenForegroundAsset.texture.width, this.height / this.halloweenForegroundAsset.texture.height);
      this.halloweenForegroundAsset.scale.set(scale);
      this.halloweenForegroundAsset.position.set((this.width - this.halloweenForegroundAsset.width) / 2, (this.height - this.halloweenForegroundAsset.height) / 2);
    }
    this.bossBaseScale = this.portrait ? Math.min(1.05, this.width / 540) : Math.min(1.02, this.height / 600);
    this.creatureBaseScale = this.model.phase === 'result' ? (this.portrait ? Math.min(0.86, this.width / 620) : Math.min(0.82, this.height / 760)) : (this.portrait ? Math.min(0.48, this.width / 880) : Math.min(0.5, this.height / 1080));
    this.bossBaseX = this.portrait ? this.width * 0.5 : this.width * 0.66;
    this.bossBaseY = this.portrait ? this.height * 0.37 : this.height * 0.43;
    this.arenaLayer.resize(this.width, this.height);
    const arenaPlayer = this.m06?.arena ? this.arenaLayer.toScreen(this.m06.arena.player.position) : undefined;
    this.creatureBaseX = arenaPlayer?.x ?? (this.portrait ? this.width * 0.5 : this.width * 0.27);
    this.creatureBaseY = arenaPlayer?.y ?? (this.portrait ? this.height * 0.78 : this.height * 0.7);
    this.boss.position.set(this.bossBaseX, this.bossBaseY);
    this.boss.scale.set(this.bossBaseScale);
    this.creature.position.set(this.creatureBaseX, this.creatureBaseY);
    this.creature.scale.set(this.creatureBaseScale);
    this.motes.forEach((mote, index) => {
      mote.x = ((index * 83) % 100) / 100 * this.width;
      mote.y = ((index * 47) % 100) / 100 * this.height;
    });
  }
}

function mutationVisual(mutation: Mutation): { color: number; light: number; css: string; title: string; subtitle: string } {
  if (mutation === 'crystal') return { color: 0x5ddfff, light: 0xd9faff, css: '#68e4ff', title: 'CRYSTAL AWAKENED', subtitle: 'HEAVY SHOT FORMED' };
  if (mutation === 'void') return { color: 0x9e48e8, light: 0xe6a7ff, css: '#bc67ff', title: 'VOID AWAKENED', subtitle: 'ECHO STRIKE UNLOCKED' };
  if (mutation === 'wings') return { color: 0xffc65a, light: 0xfff0ae, css: '#ffd36b', title: 'WINGS AWAKENED', subtitle: 'ATTACK SPEED SURGED' };
  return { color: 0xff6f28, light: 0xffc45f, css: '#ff8738', title: 'DARK HARVEST', subtitle: 'PUMPKIN BURST IGNITED' };
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function easeInOut(value: number): number {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function easeOutBack(value: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}
