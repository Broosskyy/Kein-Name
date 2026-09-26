import type { Vec2 } from './ArenaTypes';

export type ArenaRegionId = 'central-boss-zone' | 'frontal-field' | 'left-flank' | 'right-flank' | 'rear-risk' | 'outer-ruins' | 'crystal-pocket' | 'ember-corridor';
export interface ArenaRegionDefinition { id:ArenaRegionId;center:Vec2;radius:Vec2;ground:number;accent:number;fog:number;risk:'high'|'balanced'|'safe' }

export const BOSS_WORLD_ANCHOR: Readonly<Vec2> = { x: 2800, y: 1900 };
export const BOSS_ZONE_RADIUS = 520;

export const ARENA_REGIONS: readonly ArenaRegionDefinition[] = [
  { id:'central-boss-zone',center:{...BOSS_WORLD_ANCHOR},radius:{x:980,y:820},ground:0x21171d,accent:0xff7132,fog:0x71333d,risk:'high' },
  { id:'frontal-field',center:{x:2800,y:2920},radius:{x:1250,y:850},ground:0x171824,accent:0xa87965,fog:0x3b3547,risk:'balanced' },
  { id:'left-flank',center:{x:1550,y:1980},radius:{x:900,y:1100},ground:0x151a2a,accent:0x58d9ff,fog:0x314d72,risk:'balanced' },
  { id:'right-flank',center:{x:4050,y:1970},radius:{x:900,y:1100},ground:0x1d1723,accent:0xc78a66,fog:0x59404d,risk:'balanced' },
  { id:'rear-risk',center:{x:2800,y:720},radius:{x:1200,y:650},ground:0x1c111c,accent:0xa949ec,fog:0x4f285f,risk:'high' },
  { id:'outer-ruins',center:{x:800,y:3180},radius:{x:1050,y:760},ground:0x131722,accent:0x6d7488,fog:0x30384e,risk:'safe' },
  { id:'crystal-pocket',center:{x:4700,y:3160},radius:{x:850,y:700},ground:0x111b29,accent:0x55e4ff,fog:0x2e506f,risk:'safe' },
  { id:'ember-corridor',center:{x:4100,y:750},radius:{x:1050,y:620},ground:0x241519,accent:0xff7834,fog:0x693126,risk:'balanced' },
] as const;

export function arenaRegionAt(position: Vec2): ArenaRegionDefinition {
  let best=ARENA_REGIONS[0],score=Number.POSITIVE_INFINITY;
  for(const region of ARENA_REGIONS){const dx=(position.x-region.center.x)/region.radius.x,dy=(position.y-region.center.y)/region.radius.y,next=dx*dx+dy*dy;if(next<score){best=region;score=next}}
  return best;
}

export function constrainOutsideBossZone(position: Vec2): Vec2 {
  const dx=position.x-BOSS_WORLD_ANCHOR.x,dy=position.y-BOSS_WORLD_ANCHOR.y,distance=Math.hypot(dx,dy);
  if(distance===0)return{x:BOSS_WORLD_ANCHOR.x,y:BOSS_WORLD_ANCHOR.y+BOSS_ZONE_RADIUS};
  if(distance>=BOSS_ZONE_RADIUS)return position;
  const factor=BOSS_ZONE_RADIUS/distance;return{x:BOSS_WORLD_ANCHOR.x+dx*factor,y:BOSS_WORLD_ANCHOR.y+dy*factor};
}
