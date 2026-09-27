import type { MapProp, MapTerrainPatch, MapTraversalCorridor } from './MapDefinition';

const columns=[520,1420,2320,3280,4200,5080] as const;
const rows=[430,1230,2030,2830,3630] as const;

/** Layer 1/2 authored terrain coverage. A small coherent texture family is
 * reused at different rotations and scales; gameplay never reads this data. */
export const HARVEST_TERRAIN_PATCHES:readonly MapTerrainPatch[]=Object.freeze([
  ...rows.flatMap((y,row)=>columns.map((x,column)=>{
    const west=column<=1,east=column>=4,nearBoss=row>=1&&row<=3&&column>=2&&column<=3;
    const key:MapTerrainPatch['key']=nearBoss?'terrain.harvest.fractured':west&&row>=2?'terrain.harvest.transition':east&&row>=2?'terrain.harvest.transition':(row+column)%3===0?'terrain.harvest.fractured':'terrain.harvest.intact';
    return{id:`terrain-${row}-${column}`,key,x,y,width:1180+((row*3+column)%4)*95,rotation:((row*7+column*5)%12-6)*.055,alpha:nearBoss?.86:.72,coverageRadius:820,fallbackColor:nearBoss?0x24191d:west?0x171c27:east?0x1c1722:0x1b1b24,lod:'base' as const};
  })),
  {id:'basin-ring-north',key:'terrain.harvest.ringSegment',x:2800,y:1310,width:1540,rotation:0,alpha:.9,coverageRadius:850,fallbackColor:0x281a1b,lod:'base'},
  {id:'basin-ring-east',key:'terrain.harvest.ringSegment',x:3490,y:1900,width:1500,rotation:Math.PI/2,alpha:.88,coverageRadius:820,fallbackColor:0x281a1b,lod:'base'},
  {id:'basin-ring-south',key:'terrain.harvest.ringSegment',x:2800,y:2490,width:1540,rotation:Math.PI,alpha:.86,coverageRadius:850,fallbackColor:0x281a1b,lod:'base'},
  {id:'basin-ring-west',key:'terrain.harvest.ringSegment',x:2110,y:1900,width:1500,rotation:-Math.PI/2,alpha:.88,coverageRadius:820,fallbackColor:0x281a1b,lod:'base'},
  {id:'lower-entry-path',key:'terrain.harvest.approach',x:2800,y:3370,width:1460,rotation:0,alpha:.88,coverageRadius:820,fallbackColor:0x202028,lod:'base'},
  {id:'west-ruin-path',key:'terrain.harvest.approach',x:1320,y:1880,width:1380,rotation:Math.PI/2,alpha:.82,coverageRadius:780,fallbackColor:0x1b1d27,lod:'base'},
  {id:'crystal-influence',key:'terrain.harvest.transition',x:850,y:2660,width:1540,rotation:.08,alpha:.84,coverageRadius:900,fallbackColor:0x142131,lod:'accent'},
  {id:'corruption-influence',key:'terrain.harvest.transition',x:4700,y:2700,width:1540,rotation:Math.PI,alpha:.78,coverageRadius:900,fallbackColor:0x24182b,lod:'accent'},
]);

/** Layer 2/3 boundary masses. Their footpoints participate in the same depth
 * system as existing production props and their colliders sit outside combat lanes. */
export const HARVEST_MACRO_STRUCTURES:readonly MapProp[]=Object.freeze([
  {id:'boundary-northwest',key:'terrain.harvest.boundaryWall',x:760,y:300,height:650,occludes:true,lod:'landmark'},
  {id:'boundary-north',key:'terrain.harvest.boundaryWall',x:2800,y:250,height:720,occludes:true,lod:'landmark'},
  {id:'boundary-northeast',key:'terrain.harvest.boundaryWall',x:4860,y:310,height:650,mirror:true,occludes:true,lod:'landmark'},
  {id:'boundary-west-upper',key:'terrain.harvest.boundaryWall',x:230,y:1120,height:620,occludes:true,lod:'landmark'},
  {id:'boundary-west-lower',key:'terrain.harvest.boundaryWall',x:220,y:3080,height:610,occludes:true,lod:'landmark'},
  {id:'boundary-east-upper',key:'terrain.harvest.boundaryWall',x:5380,y:1160,height:620,mirror:true,occludes:true,lod:'landmark'},
  {id:'boundary-east-lower',key:'terrain.harvest.boundaryWall',x:5380,y:3100,height:610,mirror:true,occludes:true,lod:'landmark'},
  {id:'boundary-southwest',key:'terrain.harvest.boundaryWall',x:920,y:3890,height:570,occludes:true,lod:'landmark'},
  {id:'boundary-southeast',key:'terrain.harvest.boundaryWall',x:4680,y:3890,height:570,mirror:true,occludes:true,lod:'landmark'},
]);

export const HARVEST_TRAVERSAL_CORRIDORS:readonly MapTraversalCorridor[]=Object.freeze([
  {id:'entry-to-ring',from:{x:2800,y:3600},to:{x:2800,y:2680},halfWidth:430},
  {id:'ring-to-west-ruins',from:{x:2250,y:2450},to:{x:1050,y:1750},halfWidth:390},
  {id:'ring-to-crystal',from:{x:2050,y:2500},to:{x:900,y:2750},halfWidth:390},
  {id:'ring-to-corruption',from:{x:3550,y:2450},to:{x:4620,y:2780},halfWidth:390},
  {id:'north-circuit',from:{x:1800,y:1050},to:{x:3800,y:1050},halfWidth:360},
]);
