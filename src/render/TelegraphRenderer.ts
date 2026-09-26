import { Graphics } from 'pixi.js';
import { BOSS_ATTACKS, type BossTelegraph, type TelegraphShape } from '../gameplay/BossAttackSystem';

export interface TelegraphVisualState {
  progress: number;
  urgency: number;
  edgeAlpha: number;
  centerAlpha: number;
  impact: boolean;
}

export function telegraphVisualState(attack: BossTelegraph): TelegraphVisualState {
  const definition = BOSS_ATTACKS[attack.kind];
  const progress = attack.phase === 'telegraph' ? Math.min(1, attack.elapsedMs / definition.telegraphMs) : 1;
  const urgency = smoothstep(.45, 1, progress);
  return {
    progress,
    urgency,
    edgeAlpha: attack.phase === 'impact' ? .98 : .52 + urgency * .4,
    centerAlpha: attack.phase === 'impact' ? .11 : .012 + urgency * .026,
    impact: attack.phase === 'impact',
  };
}

/** Draws broken, floor-attached warnings without large flat UI-like fills. */
export class TelegraphRenderer {
  draw(target: Graphics, attacks: readonly BossTelegraph[], visible: boolean, seconds: number): void {
    target.clear();
    if (!visible) return;
    for (const attack of attacks) this.drawAttack(target, attack, seconds);
  }

  private drawAttack(g: Graphics, attack: BossTelegraph, seconds: number): void {
    const definition = BOSS_ATTACKS[attack.kind];
    const state = telegraphVisualState(attack);
    const corruption = attack.kind.includes('corruption') || attack.kind === 'moving-hazard';
    const color = corruption ? 0xa95bff : attack.kind === 'core-beam' ? 0xffad52 : 0xff6845;
    const hot = corruption ? 0xebc4ff : 0xffe0aa;
    if (definition.shape === 'circle') this.drawCircle(g, attack, state, color, hot, seconds);
    else if (definition.shape === 'ring') this.drawRing(g, attack, state, color, hot, seconds);
    else this.drawDirectional(g, attack, definition.shape, state, color, hot, seconds);
  }

  private drawCircle(g: Graphics, attack: BossTelegraph, state: TelegraphVisualState, color: number, hot: number, seconds: number): void {
    const { x, y } = attack.position, radius = attack.radius;
    g.circle(x, y, radius * .96).fill({ color, alpha: state.centerAlpha });
    this.brokenRing(g, x, y, radius, color, state.edgeAlpha, 11 + state.urgency * 7, seconds * .18);
    this.brokenRing(g, x, y, radius * (1 - state.progress * .72), hot, .24 + state.urgency * .48, 5, -seconds * .32);
    for (let ray = 0; ray < 7; ray += 1) {
      const angle = ray / 7 * Math.PI * 2 + attack.id.length * .17;
      const inner = radius * (.2 + (ray % 3) * .06), outer = radius * (.5 + state.urgency * .28);
      g.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
        .lineTo(x + Math.cos(angle + .08) * outer, y + Math.sin(angle + .08) * outer)
        .stroke({ color, width: 4 + state.urgency * 3, alpha: .16 + state.urgency * .28 });
    }
  }

  private drawRing(g: Graphics, attack: BossTelegraph, state: TelegraphVisualState, color: number, hot: number, seconds: number): void {
    const { x, y } = attack.position;
    const band = Math.max(1, attack.radius - attack.innerRadius);
    g.circle(x, y, attack.innerRadius + band * .5).stroke({ color, width: band, alpha: state.centerAlpha * .75 });
    this.brokenRing(g, x, y, attack.radius, state.urgency > .7 ? hot : color, state.edgeAlpha, 12 + state.urgency * 6, seconds * .2);
    this.brokenRing(g, x, y, attack.innerRadius, color, .5 + state.urgency * .28, 8, -seconds * .16);
    const sweepRadius = attack.innerRadius + band * (.2 + state.progress * .62);
    this.brokenRing(g, x, y, sweepRadius, hot, .16 + state.urgency * .3, 4, seconds * .4);
  }

  private drawDirectional(g: Graphics, attack: BossTelegraph, shape: TelegraphShape, state: TelegraphVisualState, color: number, hot: number, seconds: number): void {
    const length = shape === 'line' ? 1900 : attack.radius;
    const end = { x: attack.origin.x + attack.direction.x * length, y: attack.origin.y + attack.direction.y * length };
    const perpendicular = { x: -attack.direction.y, y: attack.direction.x };
    const halfWidth = shape === 'line' ? attack.radius : length * .38;
    const startWidth = shape === 'line' ? halfWidth : 24;
    const points = [
      attack.origin.x + perpendicular.x * startWidth, attack.origin.y + perpendicular.y * startWidth,
      end.x + perpendicular.x * halfWidth, end.y + perpendicular.y * halfWidth,
      end.x - perpendicular.x * halfWidth, end.y - perpendicular.y * halfWidth,
      attack.origin.x - perpendicular.x * startWidth, attack.origin.y - perpendicular.y * startWidth,
    ];
    g.poly(points).fill({ color, alpha: state.centerAlpha }).stroke({ color: state.urgency > .72 ? hot : color, width: 8 + state.urgency * 7, alpha: state.edgeAlpha });
    const directionPulse = (seconds * .7) % .22;
    for (let stripe = 1; stripe <= 5; stripe += 1) {
      const t = Math.min(.94, stripe / 6 + directionPulse);
      const sx = attack.origin.x + (end.x - attack.origin.x) * t;
      const sy = attack.origin.y + (end.y - attack.origin.y) * t;
      const width = startWidth + (halfWidth - startWidth) * t;
      g.moveTo(sx + perpendicular.x * width * .72, sy + perpendicular.y * width * .72)
        .lineTo(sx - perpendicular.x * width * .72, sy - perpendicular.y * width * .72)
        .stroke({ color: hot, width: 4, alpha: .1 + state.urgency * .28 });
    }
  }

  private brokenRing(g: Graphics, x: number, y: number, radius: number, color: number, alpha: number, width: number, rotation: number): void {
    const segments = 14;
    for (let segment = 0; segment < segments; segment += 1) {
      if (segment % 4 === 1) continue;
      const start = rotation + segment / segments * Math.PI * 2;
      const end = start + Math.PI * 2 / segments * .68;
      g.arc(x, y, radius, start, end).stroke({ color, width, alpha });
    }
  }
}

function smoothstep(min: number, max: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return t * t * (3 - 2 * t);
}
