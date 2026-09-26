import type { ArenaCamera } from '../gameplay/ArenaCamera';
import { BOSS_WORLD_ANCHOR } from '../gameplay/ArenaRegions';
import type { Vec2 } from '../gameplay/ArenaTypes';

export interface BossScreenPose { x: number; y: number; scale: number; distance: number; lateral: number }

/** Projects the enormous boss from its real world anchor; it may leave the viewport. */
export class BossWorldPresentation {
  readonly anchor: Vec2 = { ...BOSS_WORLD_ANCHOR };

  pose(camera: ArenaCamera, player: Vec2, _screenWidth: number, _screenHeight: number, portrait: boolean, worldPosition: Vec2 = this.anchor): BossScreenPose {
    const distance = Math.hypot(player.x - worldPosition.x, player.y - worldPosition.y);
    const projected = camera.worldToScreen(worldPosition);
    const lateral = (worldPosition.x - camera.position.x) * camera.scale;
    // Art is authored around 520px wide. This yields a ~720 world-unit footprint.
    const scale = camera.scale * (portrait ? 3.48 : 3.32);
    return {
      x: projected.x,
      y: projected.y - 210 * scale,
      scale,
      distance,
      lateral,
    };
  }
}
