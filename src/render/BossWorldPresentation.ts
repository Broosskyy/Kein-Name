import type { ArenaCamera } from '../gameplay/ArenaCamera';
import { BOSS_WORLD_ANCHOR } from '../gameplay/ArenaRegions';
import type { Vec2 } from '../gameplay/ArenaTypes';

export interface BossScreenPose { x: number; y: number; scale: number; distance: number; lateral: number }

/** Keeps the giant-boss composition while making it respond to world travel. */
export class BossWorldPresentation {
  readonly anchor: Vec2 = { ...BOSS_WORLD_ANCHOR };

  pose(camera: ArenaCamera, player: Vec2, screenWidth: number, screenHeight: number, portrait: boolean): BossScreenPose {
    const distance = Math.hypot(player.x - this.anchor.x, player.y - this.anchor.y);
    const lateralWorld = this.anchor.x - camera.position.x;
    const lateral = lateralWorld * camera.scale * 0.58;
    const distanceT = clamp((distance - 520) / 1250, 0, 1);
    const zoomScale = camera.zoom / 0.9;
    const scale = (portrait ? 1.03 : 0.94) * lerp(1.16, 0.76, distanceT) * zoomScale;
    const yTravel = clamp((this.anchor.y - camera.position.y) * camera.scale * 0.17, -screenHeight * 0.1, screenHeight * 0.055);
    return {
      x: screenWidth * (portrait ? 0.5 : 0.61) + lateral,
      y: screenHeight * (portrait ? 0.37 : 0.43) + yTravel,
      scale,
      distance,
      lateral,
    };
  }
}

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function lerp(from: number, to: number, amount: number): number { return from + (to - from) * amount; }
