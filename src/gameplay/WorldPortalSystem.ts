import type { Vec2 } from './ArenaTypes';
import type { WorldPortalDefinition } from './WorldMapDefinition';

export class WorldPortalSystem {
  constructor(readonly portals: readonly WorldPortalDefinition[]) {}
  nearby(position: Vec2): WorldPortalDefinition | undefined {
    return this.portals.find((portal) => Math.hypot(position.x - portal.position.x, position.y - portal.position.y) <= portal.radius);
  }
  canEnter(portal: WorldPortalDefinition, heroLevel: number): boolean { return heroLevel >= (portal.requiredHeroLevel ?? 1); }
}
