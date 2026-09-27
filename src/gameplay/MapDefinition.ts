import type { AssetKey } from '../assets';
import type { Vec2 } from './ArenaTypes';

export type MapZoneId='colossus-basin'|'inner-battle-ring'|'ruined-west-approach'|'crystal-field'|'corrupted-east-approach'|'broken-outer-ring'|'lower-entry'|'outer-boundary';
export interface MapZone {id:MapZoneId;center:Vec2;radius:Vec2;label:string}
export interface MapCollider {id:string;shape:'circle'|'ellipse'|'aabb';center:Vec2;radius?:number;radiusX?:number;radiusY?:number;halfWidth?:number;halfHeight?:number}
export interface MapProp {id:string;key:AssetKey;x:number;y:number;height:number;mirror?:boolean;occludes?:boolean;lod:'landmark'|'medium'|'detail'}
export interface MapGroundDetail {id:string;key:AssetKey;x:number;y:number;width:number;rotation:number;alpha:number;lod:'major'|'detail'}
export interface MapTerrainPatch {id:string;key:AssetKey;x:number;y:number;width:number;rotation:number;alpha:number;coverageRadius:number;fallbackColor:number;lod:'base'|'accent'}
export interface MapTraversalCorridor {id:string;from:Vec2;to:Vec2;halfWidth:number}
export interface MapVisualTheme {base:number;stone:number;damaged:number;crystal:number;corruption:number;fissure:number}
export interface ArenaMapDefinition {
  id:string;theme:string;width:number;height:number;bounds:{minX:number;maxX:number;minY:number;maxY:number};
  playerSpawn:Vec2;bossSpawn:Vec2;zones:readonly MapZone[];terrainPatches:readonly MapTerrainPatch[];
  structures:readonly MapProp[];props:readonly MapProp[];groundDetails:readonly MapGroundDetail[];
  colliders:readonly MapCollider[];traversalCorridors:readonly MapTraversalCorridor[];lootRegions:readonly Vec2[];
  cameraHints:Readonly<{portraitLead:number}>;visualTheme:Readonly<MapVisualTheme>;
}

export function worldToMinimap(point:Vec2,map:ArenaMapDefinition,size:number):Vec2{
  return{x:Math.max(0,Math.min(size,point.x/map.width*size)),y:Math.max(0,Math.min(size,point.y/map.height*size))};
}

export function mapZoneAt(point:Vec2,map:ArenaMapDefinition):MapZone{
  let best=map.zones[0],score=Number.POSITIVE_INFINITY;
  for(const zone of map.zones){const dx=(point.x-zone.center.x)/zone.radius.x,dy=(point.y-zone.center.y)/zone.radius.y,next=dx*dx+dy*dy;if(next<score){best=zone;score=next}}
  return best;
}

export interface MapCoverageCell {x:number;y:number;covered:boolean}
export function auditMapCoverage(map:ArenaMapDefinition,cellSize=800):readonly MapCoverageCell[]{
  const cells:MapCoverageCell[]=[];
  for(let y=cellSize/2;y<map.height;y+=cellSize)for(let x=cellSize/2;x<map.width;x+=cellSize){
    const covered=map.terrainPatches.some((patch)=>Math.hypot(x-patch.x,y-patch.y)<=patch.coverageRadius);
    cells.push({x,y,covered});
  }
  return cells;
}
