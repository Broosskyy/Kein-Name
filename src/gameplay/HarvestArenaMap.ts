import { GAME_CONFIG } from '../config';
import { PRODUCTION_GROUND_DETAILS, PRODUCTION_PROPS } from '../render/ArenaProductionArt';
import { ARENA_BOUNDS } from './ArenaTypes';
import { HARVEST_MACRO_STRUCTURES, HARVEST_TERRAIN_PATCHES, HARVEST_TRAVERSAL_CORRIDORS } from './HarvestArenaWorld';
import type { ArenaMapDefinition, MapCollider } from './MapDefinition';

const worldProps=[...HARVEST_MACRO_STRUCTURES,...PRODUCTION_PROPS] as const;
const propColliders:readonly MapCollider[]=worldProps.flatMap((prop)=>{
  // Outer boundary walls communicate the already-authoritative map bounds;
  // duplicating them as inward colliders would shrink legacy movement space.
  if(!prop.occludes||prop.key.includes('boundaryWall')||prop.key.includes('rubble')||prop.key.includes('root'))return[];
  const wide=prop.key.includes('wall')||prop.key.includes('arch');
  const radiusX=Math.max(75,prop.height*(wide ? .48 : .24));
  const radiusY=Math.max(55,prop.height*.13);
  return[{id:`collision-${prop.id}`,shape:'ellipse' as const,center:{x:prop.x,y:prop.y-20},radiusX,radiusY}];
});

export const HARVEST_ARENA_MAP:ArenaMapDefinition={
  id:'harvest-arena',theme:'dark-harvest',width:GAME_CONFIG.arena.width,height:GAME_CONFIG.arena.height,bounds:ARENA_BOUNDS,
  playerSpawn:{x:2800,y:3420},bossSpawn:{x:2800,y:1900},
  zones:[
    {id:'colossus-basin',label:'Colossus Basin',center:{x:2800,y:1900},radius:{x:1050,y:820}},
    {id:'inner-battle-ring',label:'Inner Battle Ring',center:{x:2800,y:2450},radius:{x:1650,y:1050}},
    {id:'ruined-west-approach',label:'Ruined West Approach',center:{x:1000,y:1550},radius:{x:900,y:1250}},
    {id:'crystal-field',label:'Crystal Field',center:{x:850,y:2750},radius:{x:900,y:900}},
    {id:'corrupted-east-approach',label:'Corrupted East Approach',center:{x:4650,y:2700},radius:{x:900,y:1000}},
    {id:'broken-outer-ring',label:'Broken Outer Ring',center:{x:3900,y:1050},radius:{x:1250,y:780}},
    {id:'lower-entry',label:'Lower Entry',center:{x:2800,y:3500},radius:{x:1300,y:520}},
    {id:'outer-boundary',label:'Outer Boundary',center:{x:2800,y:500},radius:{x:2450,y:560}},
  ],
  terrainPatches:HARVEST_TERRAIN_PATCHES,
  structures:HARVEST_MACRO_STRUCTURES,
  props:PRODUCTION_PROPS.map((prop)=>({...prop,lod:prop.height>=430?'landmark':prop.height>=300?'medium':'detail'})),
  groundDetails:PRODUCTION_GROUND_DETAILS.map((detail)=>({...detail,lod:detail.width>=600?'major':'detail'})),
  colliders:propColliders,
  traversalCorridors:HARVEST_TRAVERSAL_CORRIDORS,
  lootRegions:[{x:2300,y:2400},{x:3350,y:2400},{x:1400,y:2500},{x:4300,y:2700}],
  cameraHints:{portraitLead:260},
  visualTheme:{base:0x15151d,stone:0x22232d,damaged:0x2b2022,crystal:0x172637,corruption:0x251a2b,fissure:0x713521},
};

export const HARVEST_TRAVERSAL_WAYPOINTS=Object.freeze([
  HARVEST_ARENA_MAP.playerSpawn,{x:2800,y:2550},{x:2200,y:1900},{x:2800,y:1200},{x:3500,y:1900},{x:900,y:1100},{x:900,y:2500},{x:4550,y:2850},HARVEST_ARENA_MAP.playerSpawn,
]);

export const MASTER_COMPOSITION_SCENARIO=Object.freeze({
  hero:{x:2800,y:3420},boss:HARVEST_ARENA_MAP.bossSpawn,dummies:[{x:2200,y:2700},{x:3350,y:2600},{x:2650,y:2350}],loot:[{x:2500,y:2850},{x:3150,y:2650}],
});
