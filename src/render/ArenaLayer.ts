import { Container, Graphics } from 'pixi.js';
import type { ArenaRunModel } from '../gameplay/ArenaRunModel';
import type { BossTelegraph } from '../gameplay/BossAttackSystem';
import type { LootDrop, LootKind } from '../gameplay/LootSystem';
import type { Vec2 } from '../gameplay/ArenaTypes';

interface ArenaViewport { x: number; y: number; width: number; height: number }

const LOOT_COLORS: Record<LootKind, number> = {
  'run-xp': 0x75eaff, 'crystal-essence': 0x67e7ff, 'void-essence': 0xc667ff,
  'wing-essence': 0xffdf78, 'pumpkin-essence': 0xff792f, 'combat-orb': 0x6dff91,
  relic: 0xffc850, 'harvest-energy': 0xff8a38,
};

/** Bounded, renderer-only projection of deterministic arena state. */
export class ArenaLayer extends Container {
  private readonly telegraphs = new Graphics();
  private readonly guides = new Graphics();
  private readonly lootViews: Graphics[] = [];
  private readonly dummyViews: Graphics[] = [];
  private readonly petView = new Graphics();
  private viewport: ArenaViewport = { x: 0, y: 0, width: 1, height: 1 };

  constructor() {
    super();
    this.addChild(this.guides, this.telegraphs);
    for (let i = 0; i < 28; i += 1) {
      const view = new Graphics(); view.visible = false; this.lootViews.push(view); this.addChild(view);
    }
    for (let i = 0; i < 7; i += 1) {
      const view = new Graphics().ellipse(0, 6, 18, 7).fill({ color: 0x070913, alpha: 0.55 })
        .circle(0, 0, 13).fill(0x6c78a8).circle(-4, -3, 2).fill(0xe9f4ff).circle(4, -3, 2).fill(0xe9f4ff);
      view.visible = false; this.dummyViews.push(view); this.addChild(view);
    }
    this.petView.circle(0, 0, 8).fill(0xffa33f).circle(0, 0, 14).stroke({ color: 0xffd17b, width: 2, alpha: 0.55 });
    this.petView.visible = false; this.addChild(this.petView);
  }

  resize(width: number, height: number, portrait: boolean): void {
    this.viewport = portrait
      ? { x: width * 0.07, y: height * 0.59, width: width * 0.86, height: height * 0.25 }
      : { x: width * 0.08, y: height * 0.61, width: width * 0.84, height: height * 0.27 };
  }

  toScreen(position: Vec2): Vec2 {
    return {
      x: this.viewport.x + position.x / 1000 * this.viewport.width,
      y: this.viewport.y + position.y / 480 * this.viewport.height,
    };
  }

  sync(arena: ArenaRunModel, seconds: number): void {
    this.drawTelegraphs(arena.bossAttacks.active, arena.telegraphsVisible, seconds);
    this.drawGuides(arena);
    const visibleDrops = arena.loot.drops.filter((drop) => drop.phase !== 'collected');
    this.lootViews.forEach((view, index) => {
      const drop = visibleDrops[index]; view.visible = Boolean(drop); if (!drop) return;
      this.drawLoot(view, drop, seconds); const point = this.toScreen(drop.position); view.position.set(point.x, point.y);
    });
    this.dummyViews.forEach((view, index) => {
      const dummy = arena.dummyAllies[index]; view.visible = Boolean(dummy); if (!dummy) return;
      const point = this.toScreen(dummy.position); view.position.set(point.x, point.y); view.alpha = 0.72;
    });
    this.petView.visible = Boolean(arena.inventory.petId);
    if (this.petView.visible) {
      const player = this.toScreen(arena.player.position);
      this.petView.position.set(player.x - 30 + Math.sin(seconds * 3) * 5, player.y - 18 + Math.cos(seconds * 4) * 4);
    }
  }

  clearTransient(): void {
    this.telegraphs.clear(); this.guides.clear(); this.lootViews.forEach((view) => { view.visible = false; });
    this.dummyViews.forEach((view) => { view.visible = false; }); this.petView.visible = false;
  }

  private drawTelegraphs(attacks: readonly BossTelegraph[], visible: boolean, seconds: number): void {
    this.telegraphs.clear(); if (!visible) return;
    for (const attack of attacks) {
      const point = this.toScreen(attack.position);
      const rx = attack.radius / 1000 * this.viewport.width;
      const ry = attack.radius / 480 * this.viewport.height;
      const impact = attack.phase === 'impact';
      const pulse = 0.7 + Math.sin(seconds * 12) * 0.15;
      if (attack.kind === 'core-beam') {
        this.telegraphs.rect(point.x - rx, this.viewport.y, rx * 2, this.viewport.height)
          .fill({ color: impact ? 0xffd477 : 0xff623c, alpha: impact ? 0.34 : 0.12 * pulse })
          .rect(point.x - rx, this.viewport.y, rx * 2, this.viewport.height)
          .stroke({ color: impact ? 0xffffff : 0xff7655, width: impact ? 4 : 2, alpha: 0.82 });
      } else {
        this.telegraphs.ellipse(point.x, point.y, rx, Math.max(10, ry * 0.55))
          .fill({ color: impact ? 0xffb54d : 0xff4d35, alpha: impact ? 0.34 : 0.11 * pulse })
          .ellipse(point.x, point.y, rx, Math.max(10, ry * 0.55))
          .stroke({ color: impact ? 0xfff0b0 : 0xff6045, width: impact ? 5 : 3, alpha: 0.88 });
      }
    }
  }

  private drawGuides(arena: ArenaRunModel): void {
    this.guides.clear();
    if (arena.collisionBoundsVisible) this.guides.rect(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height).stroke({ color: 0x62ffb5, width: 2, alpha: 0.7 });
    if (arena.pickupRadiusVisible) {
      const p = this.toScreen(arena.player.position);
      const rx = arena.player.stats.pickupRadius / 1000 * this.viewport.width;
      this.guides.circle(p.x, p.y, Math.max(8, rx)).stroke({ color: 0x75eaff, width: 2, alpha: 0.45 });
    }
  }

  private drawLoot(view: Graphics, drop: LootDrop, seconds: number): void {
    const color = LOOT_COLORS[drop.kind]; const rare = drop.rarity !== 'common';
    view.clear();
    if (rare) view.circle(0, 0, drop.rarity === 'epic' ? 20 : 15).fill({ color, alpha: 0.12 });
    if (drop.kind === 'relic') view.roundRect(-11, -8, 22, 17, 4).fill(0x7b4920).stroke({ color, width: 3 });
    else view.poly([0, -12, 9, -3, 5, 11, -6, 10, -10, -3]).fill(color).poly([0, -8, 5, -2, 2, 6, -3, 5]).fill({ color: 0xffffff, alpha: 0.58 });
    if (rare && drop.phase === 'grounded') view.rect(-2, -60, 4, 48).fill({ color, alpha: 0.24 });
    view.scale.set(1 + Math.sin(seconds * 4 + Number(drop.id.split('-')[1])) * 0.05);
  }
}
